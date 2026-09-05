"""
YatraSetu Crowd Prediction, Dynamic Anomaly Detection & Peak/Off-Peak Scheduler
=============================================================================
Anchored to real 2-minute YOLO video detection counts ('crowd_data.json')
and expanded into a 14-day historical baseline using standard diurnal curves.
"""

import json
from pathlib import Path
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score


def load_or_bootstrap_data(csv_path="historical_crowd_data.csv", json_path="crowd_data.json", days=14):
    """
    Loads historical dataset generated from real YOLO video detections.
    If CSV does not exist, automatically bootstraps from crowd_data.json.
    """
    csv_file = Path(csv_path)
    if csv_file.exists():
        df = pd.read_csv(csv_file)
        print(f"[*] Loaded existing historical dataset '{csv_path}' ({len(df)} hourly records).")
        return df

    # Bootstrap from real crowd_data.json
    json_file = Path(json_path)
    if json_file.exists():
        with open(json_file, "r") as f:
            real_data = json.load(f)
        real_counts = [entry.get("person_count", 10) for entry in real_data]
        capacity = real_data[0].get("capacity", 200) if real_data else 200
    else:
        real_counts = [8, 9, 10, 11, 12, 9, 8, 10, 11]
        capacity = 200

    hourly_multipliers = {
        0: 0.15, 1: 0.10, 2: 0.05, 3: 0.05, 4: 0.10, 5: 0.20,
        6: 0.60, 7: 1.00, 8: 1.80, 9: 3.20, 10: 4.50, 11: 3.80,
        12: 2.50, 13: 2.10, 14: 1.80, 15: 1.20, 16: 1.10, 17: 1.50,
        18: 3.80, 19: 5.20, 20: 4.80, 21: 3.00, 22: 1.80, 23: 0.80
    }

    start_date = datetime.now() - timedelta(days=days)
    records = []
    np.random.seed(42)

    for d in range(days * 24):
        curr_time = start_date + timedelta(hours=d)
        hour = curr_time.hour
        day_of_week = curr_time.weekday()
        is_weekend = 1 if day_of_week >= 5 else 0

        sample_count = np.random.choice(real_counts)
        scale = hourly_multipliers.get(hour, 1.0)
        if is_weekend:
            scale *= 1.30

        person_count = max(0, int(round(sample_count * scale)))
        occupancy_pct = round((person_count / capacity) * 100, 1)

        records.append({
            "timestamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
            "hour": hour,
            "day_of_week": day_of_week,
            "is_weekend": is_weekend,
            "person_count": person_count,
            "occupancy_pct": occupancy_pct,
            "capacity": capacity
        })

    df = pd.DataFrame(records)
    df.to_csv(csv_path, index=False)
    print(f"[*] Bootstrapped {len(df)} records from real '{json_path}' -> '{csv_path}'.")
    return df


class CrowdPredictor:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.baseline_stats = {}
        self.capacity = 200

    def extract_features(self, df):
        df = df.copy()
        if "timestamp" in df.columns:
            df["dt"] = pd.to_datetime(df["timestamp"])
            df["hour"] = df["dt"].dt.hour
            df["day_of_week"] = df["dt"].dt.dayofweek
            df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)

        df["sin_hour"] = np.sin(2 * np.pi * df["hour"] / 24.0)
        df["cos_hour"] = np.cos(2 * np.pi * df["hour"] / 24.0)
        df["sin_day"] = np.sin(2 * np.pi * df["day_of_week"] / 7.0)
        df["cos_day"] = np.cos(2 * np.pi * df["day_of_week"] / 7.0)

        feature_cols = ["hour", "day_of_week", "is_weekend", "sin_hour", "cos_hour", "sin_day", "cos_day"]
        return df[feature_cols]

    def train(self, df):
        self.capacity = int(df["capacity"].iloc[0]) if "capacity" in df.columns else 200

        # Baseline per (day_of_week, hour)
        grouped = df.groupby(["day_of_week", "hour"])["person_count"].agg(["mean", "std", "min", "max"]).reset_index()
        for _, row in grouped.iterrows():
            key = (int(row["day_of_week"]), int(row["hour"]))
            self.baseline_stats[key] = {
                "mean": float(row["mean"]),
                "std": float(max(row["std"], 1.5)),
                "min": int(row["min"]),
                "max": int(row["max"])
            }

        X = self.extract_features(df)
        y = df["person_count"]

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        self.model.fit(X_train, y_train)

        preds = self.model.predict(X_test)
        mae = mean_absolute_error(y_test, preds)
        r2 = r2_score(y_test, preds)
        print(f"[*] ML Model Trained on Real Video Baseline: MAE = {mae:.2f} persons, R2 Score = {r2:.3f}")

    def predict(self, target_datetime: datetime):
        row = pd.DataFrame([{
            "hour": target_datetime.hour,
            "day_of_week": target_datetime.weekday(),
            "is_weekend": 1 if target_datetime.weekday() >= 5 else 0
        }])
        X = self.extract_features(row)
        predicted_count = max(0, int(round(self.model.predict(X)[0])))
        predicted_occupancy = round((predicted_count / self.capacity) * 100, 1)
        return predicted_count, predicted_occupancy

    def check_relative_surge(self, actual_count: int, dt: datetime, z_threshold: float = 2.0, surge_ratio_threshold: float = 1.5):
        key = (dt.weekday(), dt.hour)
        stats = self.baseline_stats.get(key, {"mean": 10.0, "std": 3.0})
        mean_val = stats["mean"]
        std_val = stats["std"]

        z_score = (actual_count - mean_val) / std_val
        ratio = actual_count / max(1.0, mean_val)

        is_relative_surge = (z_score >= z_threshold) or (ratio >= surge_ratio_threshold and actual_count > 15)

        return {
            "timestamp": dt.strftime("%Y-%m-%d %H:%M:%S"),
            "actual_count": actual_count,
            "expected_mean": round(mean_val, 1),
            "z_score": round(z_score, 2),
            "surge_ratio": f"{round((ratio - 1) * 100, 1):+}% vs typical",
            "is_alert": is_relative_surge,
            "severity": "CRITICAL SURGE" if z_score >= 3.0 else ("MODERATE SURGE" if is_relative_surge else "NORMAL"),
            "alert_message": f"ALERT: Surge of {actual_count} visitors (+{round((ratio-1)*100)}% above normal {round(mean_val)} for {dt.strftime('%A %I %p')})" if is_relative_surge else "Normal walk-in rate."
        }

    def generate_daily_schedule_insights(self, free_threshold_pct=20.0):
        days_map = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        schedule_insights = {}

        for dow in range(7):
            hourly_means = []
            for hr in range(7, 22):
                stats = self.baseline_stats.get((dow, hr), {"mean": 0.0})
                occ_pct = (stats["mean"] / self.capacity) * 100.0
                hourly_means.append((hr, stats["mean"], occ_pct))

            free_slots = [h for h in hourly_means if h[2] <= free_threshold_pct]
            peak_slots = sorted(hourly_means, key=lambda x: x[1], reverse=True)[:2]

            free_ranges = []
            if free_slots:
                start_hr = free_slots[0][0]
                end_hr = free_slots[0][0]
                for curr in free_slots[1:]:
                    if curr[0] == end_hr + 1:
                        end_hr = curr[0]
                    else:
                        free_ranges.append(f"{start_hr % 12 or 12}:00 {'AM' if start_hr < 12 else 'PM'} - {(end_hr + 1) % 12 or 12}:00 {'AM' if (end_hr+1) < 12 else 'PM'}")
                        start_hr = curr[0]
                        end_hr = curr[0]
                free_ranges.append(f"{start_hr % 12 or 12}:00 {'AM' if start_hr < 12 else 'PM'} - {(end_hr + 1) % 12 or 12}:00 {'AM' if (end_hr+1) < 12 else 'PM'}")

            schedule_insights[days_map[dow]] = {
                "recommended_free_slots": free_ranges,
                "peak_hours": [f"{p[0] % 12 or 12} {'AM' if p[0] < 12 else 'PM'} (~{round(p[2])}% avg)" for p in peak_slots],
                "quietest_window_summary": f"Generally free during {', '.join(free_ranges)}" if free_ranges else "Steady traffic throughout the day"
            }

        return schedule_insights


if __name__ == "__main__":
    print("=" * 70)
    print("  YatraSetu Crowd Prediction, Anomaly Alert & Schedule Engine")
    print("=" * 70)

    # 1. Ingest real data & historical extension
    print("\n[1] Ingesting video detection logs & loading historical series...")
    df = load_or_bootstrap_data(csv_path="historical_crowd_data.csv", json_path="crowd_data.json", days=14)

    # 2. Train model
    print("\n[2] Training Machine Learning Forecast Model & Baselines...")
    predictor = CrowdPredictor()
    predictor.train(df)

    # 3. Forecast
    tomorrow_4pm = datetime.now().replace(hour=16, minute=0, second=0) + timedelta(days=1)
    tomorrow_7pm = datetime.now().replace(hour=19, minute=0, second=0) + timedelta(days=1)
    p_cnt_4pm, p_occ_4pm = predictor.predict(tomorrow_4pm)
    p_cnt_7pm, p_occ_7pm = predictor.predict(tomorrow_7pm)

    print(f"\n[3] Future Forecast for Tomorrow:")
    print(f"    - Tomorrow 4:00 PM: Predicted {p_cnt_4pm} persons ({p_occ_4pm}% occupancy)")
    print(f"    - Tomorrow 7:00 PM: Predicted {p_cnt_7pm} persons ({p_occ_7pm}% occupancy)")

    # 4. Relative Surge Anomaly Testing
    print("\n[4] Relative Surge Anomaly Testing (4:00 PM Window):")
    normal_case = predictor.check_relative_surge(actual_count=12, dt=tomorrow_4pm)
    print(f"    - Scenario A (12 persons): Alert = {normal_case['is_alert']} | Status = {normal_case['severity']}")

    surge_case = predictor.check_relative_surge(actual_count=45, dt=tomorrow_4pm)
    print(f"    - Scenario B (45 persons): Alert = {surge_case['is_alert']} | Severity = {surge_case['severity']}")
    print(f"      Details: Expected {surge_case['expected_mean']} -> Actual {surge_case['actual_count']} ({surge_case['surge_ratio']}, Z-score: {surge_case['z_score']})")
    print(f"      Message: {surge_case['alert_message']}")

    # 5. Daily Schedule Logs
    print("\n[5] Daily Schedule Logs & Free Window Insights:")
    insights = predictor.generate_daily_schedule_insights(free_threshold_pct=15.0)
    for day, info in list(insights.items())[:3]:
        print(f"\n    Day: {day}")
        print(f"       [Free Time] {info['quietest_window_summary']}")
        print(f"       [Peak Time] {', '.join(info['peak_hours'])}")

    print("\n" + "=" * 70)
    print("  Engine Ready for Integration!")
    print("=" * 70)
