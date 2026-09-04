import os
import csv
from database import supabase

csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "safety_zones.csv"))

def import_safety_info(dry_run=True):
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return

    # 1. Fetch valid site IDs to validate spot_id
    try:
        existing_sites = supabase.table("sites").select("id").execute().data
        valid_site_ids = {site["id"] for site in existing_sites}
        print(f"Loaded {len(valid_site_ids)} valid site IDs from database.")
    except Exception as e:
        print(f"Error connecting to Supabase for sites: {e}")
        return

    # 2. Fetch existing safety info records to prevent duplicate inserts
    try:
        existing_info = supabase.table("site_safety_info").select("id").execute().data
        existing_ids = {info["id"] for info in existing_info}
        print(f"Loaded {len(existing_ids)} existing safety info IDs from database.")
    except Exception as e:
        # Note: If the table doesn't exist yet, we catch this gracefully during dry-run.
        print(f"Note/Error checking existing site_safety_info: {e}")
        print("This is expected if the table has not been created in Supabase yet.")
        existing_ids = set()

    records_to_insert = []
    skipped_records = []
    seen_csv_ids = set()

    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row_num, row in enumerate(reader, start=2):
            record_id = row.get("safety_record_id")
            spot_id = row.get("spot_id")
            nearest_hospital = row.get("nearest_hospital_name")
            hosp_dist_raw = row.get("hospital_distance_km")
            hosp_phone = row.get("hospital_emergency_phone")
            nearest_police = row.get("nearest_police_station")
            police_phone = row.get("police_contact_number")
            disaster_mgmt = row.get("disaster_mgmt_control_room")
            emergency_exits = row.get("emergency_exits_and_evacuation_routes")
            risk_type = row.get("high_risk_zone_type")
            mitigation_measures = row.get("risk_mitigation_measures")

            # Field checks
            if not record_id or not spot_id:
                skipped_records.append((row_num, record_id, "Missing safety_record_id or spot_id"))
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

            # Distance numeric validation
            try:
                distance = float(hosp_dist_raw) if hosp_dist_raw else 0.0
            except ValueError:
                skipped_records.append((row_num, record_id, f"Invalid hospital distance: '{hosp_dist_raw}'"))
                continue

            records_to_insert.append({
                "id": record_id,
                "spot_id": spot_id,
                "nearest_hospital_name": nearest_hospital,
                "hospital_distance_km": distance,
                "hospital_emergency_phone": hosp_phone,
                "nearest_police_station": nearest_police,
                "police_contact_number": police_phone,
                "disaster_mgmt_control_room": disaster_mgmt,
                "emergency_exits_and_evacuation_routes": emergency_exits,
                "high_risk_zone_type": risk_type,
                "risk_mitigation_measures": mitigation_measures
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
        res = supabase.table("site_safety_info").insert(records_to_insert).execute()
        print(f"Successfully inserted {len(records_to_insert)} records.")
    except Exception as e:
        print(f"Bulk insert failed: {e}. Trying row-by-row fallback...")
        success_count = 0
        failure_count = 0
        for rec in records_to_insert:
            try:
                supabase.table("site_safety_info").insert(rec).execute()
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
    import_safety_info(dry_run=not args.execute)
