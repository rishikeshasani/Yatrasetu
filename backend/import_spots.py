import os
import csv
from database import supabase

csv_path = r"D:\YatraSetu\data\tourist_spots.csv"

def import_spots():
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return

    # Fetch existing site IDs to detect duplicates
    try:
        existing_sites = supabase.table("sites").select("id").execute().data
        existing_ids = {site["id"] for site in existing_sites}
        print(f"Loaded {len(existing_ids)} existing site IDs from Supabase: {existing_ids}")
    except Exception as e:
        print(f"Error connecting to Supabase: {e}")
        return

    records_to_insert = []
    skipped_records = []

    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row_num, row in enumerate(reader, start=2):
            spot_id = row.get("spot_id")
            name = row.get("name")
            capacity_raw = row.get("official_capacity_daily")
            lat_raw = row.get("latitude")
            lon_raw = row.get("longitude")

            # Basic validation
            if not spot_id or not name:
                skipped_records.append((row_num, spot_id, "Missing spot_id or name"))
                continue

            # Duplicate ID check
            if spot_id in existing_ids:
                skipped_records.append((row_num, spot_id, f"Duplicate ID: '{spot_id}' already exists in database"))
                continue

            # Numeric capacity validation
            try:
                capacity = int(float(capacity_raw)) if capacity_raw else 0
            except ValueError:
                skipped_records.append((row_num, spot_id, f"Invalid capacity: '{capacity_raw}'"))
                continue

            # Lat/Lon validation
            try:
                lat = float(lat_raw)
                lon = float(lon_raw)
                if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
                    raise ValueError()
            except ValueError:
                skipped_records.append((row_num, spot_id, f"Invalid coordinates: Lat={lat_raw}, Lon={lon_raw}"))
                continue

            # Add to list for insertion
            records_to_insert.append({
                "id": spot_id,
                "name": name,
                "capacity": capacity,
                "latitude": lat,
                "longitude": lon
            })

    print(f"\nValidation Summary:")
    print(f"  - Ready to insert: {len(records_to_insert)} records")
    print(f"  - Skipped / Invalid: {len(skipped_records)} records")
    for row_num, spot_id, reason in skipped_records:
        print(f"    * Row {row_num} (ID: {spot_id}): {reason}")

    if not records_to_insert:
        print("\nNo new records to insert.")
        return

    print("\nStarting insertion...")
    success_count = 0
    failure_count = 0

    # Insert batch
    try:
        res = supabase.table("sites").insert(records_to_insert).execute()
        success_count = len(records_to_insert)
        print(f"Successfully inserted {success_count} sites.")
    except Exception as e:
        print(f"Bulk insert failed: {e}. Trying row-by-row fallback...")
        # Fallback to row-by-row for precise error reports
        for rec in records_to_insert:
            try:
                supabase.table("sites").insert(rec).execute()
                success_count += 1
            except Exception as row_error:
                print(f"  * Failed to insert ID {rec['id']}: {row_error}")
                failure_count += 1

    print(f"\nFinal Import Report:")
    print(f"  - Successfully inserted: {success_count}")
    print(f"  - Failed to insert: {failure_count}")
    print(f"  - Skipped during validation: {len(skipped_records)}")

if __name__ == "__main__":
    import_spots()
