"""
YatraSetu Crowd Machine Learning & Anomaly Prediction Service
============================================================
Provides:
1. 24-Hour Future Occupancy Forecast (RandomForestRegressor with cyclical time features).
2. Dynamic Relative Surge Anomaly Detection (Z-Score & Surge Ratio vs (day, hour) baseline).
3. Daily Schedule Profiling ("Generally Free during 3:00 PM – 5:00 PM").
"""

import math
from pathlib import Path
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

# Safe sklearn import with pure-NumPy regression fallback for OS-restricted environments
try:
    from sklearn.ensemble import RandomForestRegressor
    SKLEARN_AVAILABLE = True
except Exception as _sk_err:
    SKLEARN_AVAILABLE = False
    RandomForestRegressor = None


class FallbackCrowdRegressor:
    """
    High-fidelity pure NumPy historical pattern regressor used when
    scikit-learn / scipy C-extension DLLs are blocked by Windows Application Control policies.
    """
    def __init__(self, n_estimators=100, random_state=42):
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.hourly_means = {}
        self.default_mean = 25.0

    def fit(self, X, y):
        try:
            if hasattr(X, "columns") and "day_of_week" in X.columns and "hour" in X.columns:
                df = X.copy()
                df["_y_"] = y.values if hasattr(y, "values") else np.array(y)
                grouped = df.groupby(["day_of_week", "hour"])["_y_"].mean()
                self.hourly_means = {(int(k[0]), int(k[1])): float(v) for k, v in grouped.items()}
                self.default_mean = float(df["_y_"].mean()) if len(df) > 0 else 25.0
            else:
                self.default_mean = float(np.mean(y)) if len(y) > 0 else 25.0
        except Exception:
            self.default_mean = 25.0
        return self

    def predict(self, X):
        preds = []
        if hasattr(X, "iterrows"):
            for _, row in X.iterrows():
                dow = int(row.get("day_of_week", 0))
                hr = int(row.get("hour", 12))
                val = self.hourly_means.get((dow, hr), self.default_mean)
                preds.append(val)
        elif isinstance(X, (list, np.ndarray)):
            preds = [self.default_mean] * len(X)
        else:
            preds = [self.default_mean]
        return np.array(preds, dtype=float)


class CrowdPredictorService:
    def __init__(self, data_path=None):
        if SKLEARN_AVAILABLE and RandomForestRegressor is not None:
            try:
                self.model = RandomForestRegressor(n_estimators=100, random_state=42)
            except Exception:
                self.model = FallbackCrowdRegressor(n_estimators=100, random_state=42)
        else:
            self.model = FallbackCrowdRegressor(n_estimators=100, random_state=42)
        self.baseline_stats = {}
        self.is_trained = False
        self.default_capacity = 200
        self.initialize_and_train(data_path)

    def _extract_features(self, df):
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

    def initialize_and_train(self, data_path=None):
        base_dir = Path(__file__).parent.parent.parent
        possible_paths = [
            data_path,
            base_dir / "data" / "historical_crowd_data.csv",
            base_dir / "ai_pipeline" / "historical_crowd_data.csv",
        ]

        csv_file = None
        for p in possible_paths:
            if p and Path(p).exists():
                csv_file = Path(p)
                break

        if not csv_file:
            print("[*] Generating synthetic baseline training data...")
            df = self._generate_fallback_data()
        else:
            try:
                df = pd.read_csv(csv_file)
                if "day_of_week" not in df.columns or "hour" not in df.columns:
                    print(f"[*] '{csv_file.name}' is not an hourly time-series file. Generating synthetic baseline.")
                    df = self._generate_fallback_data()
                else:
                    print(f"[*] Loaded training data from '{csv_file.name}' ({len(df)} rows)")
            except Exception as e:
                print(f"[!] Error loading {csv_file}: {e}. Using fallback.")
                df = self._generate_fallback_data()

        if "person_count" not in df.columns and "people_count" in df.columns:
            df["person_count"] = df["people_count"]

        grouped = df.groupby(["day_of_week", "hour"])["person_count"].agg(["mean", "std", "min", "max"]).reset_index()
        for _, row in grouped.iterrows():
            key = (int(row["day_of_week"]), int(row["hour"]))
            self.baseline_stats[key] = {
                "mean": float(row["mean"]),
                "std": float(max(row["std"], 2.0)),
                "min": int(row["min"]),
                "max": int(row["max"])
            }

        X = self._extract_features(df)
        y = df["person_count"]
        self.model.fit(X, y)
        self.is_trained = True
        print("[+] CrowdPredictorService successfully trained.")

    def _generate_fallback_data(self, days=14):
        start_date = datetime.now() - timedelta(days=days)
        records = []
        np.random.seed(42)
        hourly_multipliers = {
            0: 0.15, 1: 0.10, 2: 0.05, 3: 0.05, 4: 0.10, 5: 0.20,
            6: 0.60, 7: 1.00, 8: 1.80, 9: 3.20, 10: 4.50, 11: 3.80,
            12: 2.50, 13: 2.10, 14: 1.80, 15: 1.20, 16: 1.10, 17: 1.50,
            18: 3.80, 19: 5.20, 20: 4.80, 21: 3.00, 22: 1.80, 23: 0.80
        }
        for d in range(days * 24):
            curr = start_date + timedelta(hours=d)
            h = curr.hour
            dow = curr.weekday()
            is_wknd = 1 if dow >= 5 else 0
            base = 9.0 * hourly_multipliers.get(h, 1.0) * (1.3 if is_wknd else 1.0)
            cnt = max(0, int(np.random.normal(base, 2.0)))
            records.append({
                "timestamp": curr.strftime("%Y-%m-%d %H:%M:%S"),
                "hour": h,
                "day_of_week": dow,
                "is_weekend": is_wknd,
                "person_count": cnt,
                "occupancy_pct": round((cnt / 200) * 100, 1),
                "capacity": 200
            })
        return pd.DataFrame(records)

    def predict_24h_forecast(
        self,
        site_id: str,
        capacity: int = 200,
        start_time: datetime = None,
        site_name: str = None,
        current_state: dict = None
    ):
        if start_time is None:
            start_time = datetime.now().replace(minute=0, second=0, microsecond=0)

        # 1. Resolve site state if not explicitly passed
        if current_state is None:
            try:
                from services.crowd_service import resolve_site_crowd_state
                current_state = resolve_site_crowd_state(site_id)
            except Exception:
                current_state = {}

        canonical_id = current_state.get("canonical_id") or site_id
        resolved_name = site_name or current_state.get("site_name") or canonical_id
        current_source = current_state.get("source", "demo_simulation")
        last_updated = current_state.get("last_updated", "Live Synchronized")
        live_occ = float(current_state.get("occupancy_percentage", 25.0))
        live_count = int(current_state.get("people_count", int(round(capacity * (live_occ / 100.0)))))
        live_status = current_state.get("status", "NORMAL")

        # 2. Extract base hour 0 model prediction for relative diurnal scaling
        row_0 = pd.DataFrame([{
            "hour": start_time.hour,
            "day_of_week": start_time.weekday(),
            "is_weekend": 1 if start_time.weekday() >= 5 else 0
        }])
        X_0 = self._extract_features(row_0)
        base_pred_raw = max(1.0, float(self.model.predict(X_0)[0]))

        # Helper for deterministic diurnal baseline per site
        try:
            from services.crowd_service import compute_deterministic_demo_occupancy
        except Exception:
            compute_deterministic_demo_occupancy = None

        hours_forecast = []
        for i in range(24):
            future_dt = start_time + timedelta(hours=i)
            hr_12 = future_dt.strftime("%I").lstrip("0") or "12"
            am_pm = future_dt.strftime("%p")
            time_str = f"{hr_12}:00 {am_pm}"

            if i == 0:
                # Strictly anchor current hour to genuine observation / state
                pred_count = live_count
                pred_occ = live_occ
                status = live_status
                hour_source = current_source
            else:
                # Extract ML diurnal features for future hour
                row = pd.DataFrame([{
                    "hour": future_dt.hour,
                    "day_of_week": future_dt.weekday(),
                    "is_weekend": 1 if future_dt.weekday() >= 5 else 0
                }])
                X = self._extract_features(row)
                pred_raw = max(0.0, float(self.model.predict(X)[0]))

                # Relative diurnal multiplier from ML model
                ml_ratio = pred_raw / base_pred_raw

                # Site-specific baseline for this future hour
                if compute_deterministic_demo_occupancy:
                    _, site_base_occ = compute_deterministic_demo_occupancy(canonical_id, capacity, future_dt.hour)
                else:
                    site_base_occ = live_occ

                # Smooth temporal blending from current live state to diurnal baseline
                # Alpha decays over 18 hours so near-term reflects current momentum
                alpha = max(0.0, 1.0 - (i / 18.0))
                projected_occ = alpha * (live_occ * ml_ratio) + (1.0 - alpha) * site_base_occ
                pred_occ = max(5.0, min(96.0, round(projected_occ, 1)))
                pred_count = max(10, int(round(capacity * (pred_occ / 100.0))))

                # Canonical status thresholds: <50% NORMAL, 50-<75% MODERATE, 75-<90% HIGH, >=90% CRITICAL
                if pred_occ < 50.0:
                    status = "NORMAL"
                elif pred_occ < 75.0:
                    status = "MODERATE"
                elif pred_occ < 90.0:
                    status = "HIGH"
                else:
                    status = "CRITICAL"

                if current_source in ["yolo_video", "gps_crowd", "fused_yolo_gps", "live_telemetry"]:
                    hour_source = "ml_projection_live"
                elif current_source in ["historical_baseline", "historical"]:
                    hour_source = "ml_projection_historical"
                else:
                    hour_source = "ml_projection_demo"

            hours_forecast.append({
                "datetime": future_dt.strftime("%Y-%m-%dT%H:%M:%S"),
                "hour": future_dt.hour,
                "time_label": time_str,
                "day_name": future_dt.strftime("%A"),
                "is_current": i == 0,
                "predicted_count": pred_count,
                "occupancy_percentage": pred_occ,
                "status": status,
                "source": hour_source
            })

        source_labels = {
            "yolo_video": "Live YOLO Video Headcount",
            "gps_crowd": "Live Mobile GPS Crowd Signal",
            "fused_yolo_gps": "Multi-Source Fusion (YOLO + GPS)",
            "live_telemetry": "Live Telemetry Observation",
            "historical_baseline": "Historical Baseline Telemetry",
            "demo_simulation": "Deterministic Simulation Baseline"
        }

        return {
            "site_id": canonical_id,
            "site_name": resolved_name,
            "capacity": capacity,
            "source": current_source,
            "source_label": source_labels.get(current_source, "Historical Baseline"),
            "last_updated": last_updated,
            "forecast_period": "24h",
            "forecasts": hours_forecast
        }


    def check_relative_surge(self, site_id: str, people_count: int, dt: datetime = None, capacity: int = 200):
        if dt is None:
            dt = datetime.now()

        key = (dt.weekday(), dt.hour)
        stats = self.baseline_stats.get(key, {"mean": 12.0, "std": 3.0})
        mean_val = stats["mean"]
        std_val = stats["std"]

        z_score = (people_count - mean_val) / std_val
        surge_ratio = people_count / max(1.0, mean_val)

        is_surge = (z_score >= 2.0) or (surge_ratio >= 1.5 and people_count > 15)
        severity = "CRITICAL" if z_score >= 3.0 else ("MODERATE" if is_surge else "NORMAL")

        pct_above = round((surge_ratio - 1) * 100)
        if is_surge:
            msg = f"Relative surge: {people_count} visitors (+{pct_above}% above typical {round(mean_val)} for {dt.strftime('%A %I %p')})"
        else:
            msg = "Walk-in volume is consistent with historical patterns."

        return {
            "site_id": site_id,
            "is_relative_surge": is_surge,
            "severity": severity,
            "current_count": people_count,
            "expected_mean": round(mean_val, 1),
            "z_score": round(z_score, 2),
            "surge_percentage": f"{pct_above:+}%",
            "message": msg
        }

    def get_daily_schedule_insights(self, site_id: str, capacity: int = 200, free_threshold_pct: float = 25.0):
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        current_dow = datetime.now().weekday()
        weekly_schedule = {}

        for dow in range(7):
            hourly_means = []
            for hr in range(7, 22):
                stats = self.baseline_stats.get((dow, hr), {"mean": 0.0})
                occ_pct = (stats["mean"] / capacity) * 100.0
                hourly_means.append((hr, stats["mean"], occ_pct))

            free_slots = [h for h in hourly_means if h[2] <= free_threshold_pct]
            peak_slots = sorted(hourly_means, key=lambda x: x[1], reverse=True)[:2]

            ranges = []
            if free_slots:
                start_hr = free_slots[0][0]
                end_hr = free_slots[0][0]
                for curr in free_slots[1:]:
                    if curr[0] == end_hr + 1:
                        end_hr = curr[0]
                    else:
                        ranges.append(f"{start_hr % 12 or 12}:00 {'AM' if start_hr < 12 else 'PM'} - {(end_hr + 1) % 12 or 12}:00 {'AM' if (end_hr+1) < 12 else 'PM'}")
                        start_hr = curr[0]
                        end_hr = curr[0]
                ranges.append(f"{start_hr % 12 or 12}:00 {'AM' if start_hr < 12 else 'PM'} - {(end_hr + 1) % 12 or 12}:00 {'AM' if (end_hr+1) < 12 else 'PM'}")

            weekly_schedule[days[dow]] = {
                "free_slots": ranges,
                "peak_hours": [f"{p[0] % 12 or 12} {'AM' if p[0] < 12 else 'PM'} (~{round(p[2])}% avg)" for p in peak_slots],
                "summary": f"Generally free during {', '.join(ranges)}" if ranges else "Steady traffic throughout visiting hours."
            }

        today_info = weekly_schedule[days[current_dow]]
        return {
            "site_id": site_id,
            "today_day_name": days[current_dow],
            "quietest_window_summary": today_info["summary"],
            "recommended_free_slots": today_info["free_slots"],
            "peak_hours": today_info["peak_hours"],
            "weekly_schedule": weekly_schedule
        }

crowd_ml_service = CrowdPredictorService()
