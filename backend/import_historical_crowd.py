import os
import csv
from database import supabase

csv_path = r"D:\YatraSetu\data\crowd_data.csv"

def import_historical_crowd(dry_run=True):
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return

    # 1. Fetch valid site IDs for reference validation
    try:
        existing_sites = supabase.table("sites").select("id").execute().data
        valid_site_ids = {site["id"] for site in existing_sites}
        print(f"Loaded {len(valid_site_ids)} valid site IDs from database.")
    except Exception as e:
        print(f"Error connecting to Supabase: {e}")
        return

    # 2. Fetch existing historical crowd IDs to prevent duplicates
    try:
        existing_meta = supabase.table("historical_crowd_data").select("id").execute().data
        existing_ids = {meta["id"] for meta in existing_meta}
        print(f"Loaded {len(existing_ids)} existing historical crowd record IDs from database.")
    except Exception as e:
        # Note: If the table doesn't exist yet, this query will fail.
        # During pre-approval dry-run, we catch this gracefully.
        print(f"Note/Error checking existing historical_crowd_data: {e}")
        print("This is expected if the table has not been created in Supabase yet.")
        existing_ids = set()

    records_to_insert = []
    skipped_records = []
    seen_csv_ids = set()

    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row_num, row in enumerate(reader, start=2):
            record_id = row.get("crowd_record_id")
            spot_id = row.get("spot_id")
            historical_crowd_level = row.get("historical_crowd_level")
            peak_season_months = row.get("peak_season_months")
            peak_dates_and_festivals = row.get("peak_dates_and_festivals")
            normal_wait_raw = row.get("avg_queue_time_normal_mins")
            peak_wait_raw = row.get("avg_queue_time_peak_mins")
            queue_management = row.get("queue_management_system")
            fast_track_raw = row.get("fast_track_available")
            fast_track_details = row.get("fast_track_details_cost")
            weather_context = row.get("weather_context_and_seasonality")
            surge_triggers = row.get("surge_trigger_factors")

            # Field checks
            if not record_id or not spot_id:
                skipped_records.append((row_num, record_id, "Missing crowd_record_id or spot_id"))
                continue

            # CSV duplicate check
            if record_id in seen_csv_ids:
                skipped_records.append((row_num, record_id, f"Duplicate ID in CSV: '{record_id}'"))
                continue
            seen_csv_ids.add(record_id)

            # DB duplicate check
            if record_id in existing_ids:
                skipped_records.append((row_num, record_id, f"Duplicate ID: '{record_id}' already exists in database"))
                continue

            # Reference check (spot_id must exist in sites table)
            if spot_id not in valid_site_ids:
                skipped_records.append((row_num, record_id, f"Foreign Key violation: spot_id '{spot_id}' does not exist in sites table"))
                continue

            # Queue time validation (must be integer)
            try:
                avg_normal = int(normal_wait_raw) if normal_wait_raw else 0
                avg_peak = int(peak_wait_raw) if peak_wait_raw else 0
            except ValueError:
                skipped_records.append((row_num, record_id, f"Invalid queue times: normal={normal_wait_raw}, peak={peak_wait_raw}"))
                continue

            # Boolean conversion for fast_track_available
            fast_track = False
            if fast_track_raw:
                if fast_track_raw.strip().lower() in ("yes", "true", "y", "1"):
                    fast_track = True

            records_to_insert.append({
                "id": record_id,
                "spot_id": spot_id,
                "historical_crowd_level": historical_crowd_level,
                "peak_season_months": peak_season_months,
                "peak_dates_and_festivals": peak_dates_and_festivals,
                "avg_queue_time_normal_mins": avg_normal,
                "avg_queue_time_peak_mins": avg_peak,
                "queue_management_system": queue_management,
                "fast_track_available": fast_track,
                "fast_track_details_cost": fast_track_details,
                "weather_context_and_seasonality": weather_context,
                "surge_trigger_factors": surge_triggers
            })

    print(f"\nValidation Summary:")
    print(f"  - Ready to insert: {len(records_to_insert)} records")
    print(f"  - Skipped / Invalid: {len(skipped_records)} records")
    for row_num, rec_id, reason in skipped_records:
        print(f"    * Row {row_num} (ID: {rec_id}): {reason}")

    if not records_to_insert:
        print("\nNo new records to insert.")
        return

    # Check if execution is blocked (pre-approval run)
    if dry_run:
        print("\nDry-run / Validation check complete. Waiting for user approval before writing to Supabase.")
        return

    print("\nStarting insertion...")
    try:
        res = supabase.table("historical_crowd_data").insert(records_to_insert).execute()
        print(f"Successfully inserted {len(records_to_insert)} records.")
    except Exception as e:
        print(f"Bulk insert failed: {e}. Trying row-by-row fallback...")
        success_count = 0
        failure_count = 0
        for rec in records_to_insert:
            try:
                supabase.table("historical_crowd_data").insert(rec).execute()
                success_count += 1
            except Exception as row_error:
                print(f"  * Failed to insert ID {rec['id']}: {row_error}")
                failure_count += 1
        print(f"Fallback complete. Successfully inserted: {success_count}, Failed: {failure_count}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true", help="Actually run the insertion into Supabase")
    args = parser.parse_args()
    
    # Run in dry-run mode unless --execute is specified
    import_historical_crowd(dry_run=not args.execute)
