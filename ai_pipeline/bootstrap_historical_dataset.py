\"\"\"
YatraSetu: Bootstrap Multi-Day Historical Dataset from Real YOLO Video Detection
=============================================================================
Anchors to real measured person counts in crowd_data.json and expands into
a 14-day (336 hours) hourly time-series reflecting realistic diurnal human mobility.
\"\"\"

import json
from pathlib import Path
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def bootstrap_data(input_json=\"crowd_data.json\", output_csv=\"historical_crowd_data.csv\", days=14):
    json_path = Path(__file__).parent / input_json
    if not json_path.exists():
        json_path = Path(__file__).parent.parent / \"data\" / input_json

    if json_path.exists():
        with open(json_path, \"r\") as f:
            data = json.load(f)
        real_counts = [d.get(\"person_count\", 10) for d in data]
        capacity = data[0].get(\"capacity\", 200) if data else 200
    else:
        real_counts = [8, 9, 10, 11, 12, 10, 9, 8]
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

        sample = np.random.choice(real_counts)
        scale = hourly_multipliers.get(hour, 1.0)
        if is_weekend:
            scale *= 1.30

        count = max(0, int(round(sample * scale)))
        occ = round((count / capacity) * 100, 1)

        records.append({
            \"timestamp\": curr_time.strftime(\"%Y-%m-%d %H:%M:%S\"),
            \"hour\": hour,
            \"day_of_week\": day_of_week,
            \"is_weekend\": is_weekend,
            \"person_count\": count,
            \"occupancy_pct\": occ,
            \"capacity\": capacity
        })

    df = pd.DataFrame(records)
    out_file = Path(__file__).parent / output_csv
    df.to_csv(out_file, index=False)
    
    data_dir_file = Path(__file__).parent.parent / \"data\" / output_csv
    df.to_csv(data_dir_file, index=False)
    print(f\"[+] Bootstrapped {len(df)} hourly records -> '{out_file}' and '{data_dir_file}'\")
    return df

if __name__ == \"__main__\":
    bootstrap_data()
