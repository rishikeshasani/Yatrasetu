"""
Converts your pipeline's crowd_data.json into the exact schema Person 4 expects.

USAGE:
    python convert_for_backend.py --input crowd_data.json --site_id SITE001 --output crowd_data_for_backend.json

The --site_id is a short code YOU pick to identify this location -- confirm
the naming convention with Person 4 (e.g. SITE001, SITE002...) so it matches
whatever her backend/database expects.
"""

import json
import argparse
from datetime import datetime, timedelta


def convert(input_path, site_id, output_path, start_time=None):
    with open(input_path) as f:
        data = json.load(f)

    if not data:
        print("Input file is empty -- nothing to convert.")
        return

    # Reference start time: since timestamp_sec is relative to the video
    # (not real wall-clock time), we anchor it to a chosen start moment so
    # the output timestamps look like a real, ordered time series.
    if start_time is None:
        start_dt = datetime.now()
    else:
        start_dt = datetime.fromisoformat(start_time)

    converted = []
    for entry in data:
        real_ts = start_dt + timedelta(seconds=entry["timestamp_sec"])
        converted.append({
            "site_id": site_id,
            "person_count": entry["person_count"],
            "timestamp": real_ts.strftime("%Y-%m-%dT%H:%M:%S"),
            "zones": [],  # empty for now -- only populate if/when you add sub-zone breakdown

            # Extra fields kept for your own dashboard/debugging use.
            # CONFIRM WITH PERSON 4 whether her backend is fine ignoring
            # unknown fields, or whether she needs a strictly matching schema --
            # if strict, remove these three lines before sending.
            "occupancy_pct": entry["occupancy_pct"],
            "status": entry["status"],
            "capacity": entry["capacity"],
        })

    with open(output_path, "w") as f:
        json.dump(converted, f, indent=2)

    print(f"Converted {len(converted)} entries -> {output_path}")
    print(f"First entry: {json.dumps(converted[0], indent=2)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--site_id", required=True, help="e.g. SITE001 -- confirm naming with Person 4")
    parser.add_argument("--output", default="crowd_data_for_backend.json")
    parser.add_argument("--start_time", default=None,
                         help="ISO datetime to anchor timestamps to, e.g. 2026-08-31T18:00:00. Defaults to now.")
    args = parser.parse_args()

    convert(args.input, args.site_id, args.output, args.start_time)
