import os
import csv
from database import supabase

csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "vendors.csv"))

def import_vendors():
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return

    # Fetch existing site IDs for validation
    try:
        existing_sites = supabase.table("sites").select("id").execute().data
        valid_site_ids = {site["id"] for site in existing_sites}
        print(f"Loaded {len(valid_site_ids)} valid site IDs from database.")
    except Exception as e:
        print(f"Error fetching sites from Supabase: {e}")
        return

    # Fetch existing vendor IDs to detect duplicates
    try:
        existing_vendors = supabase.table("vendors").select("id").execute().data
        existing_ids = {vendor["id"] for vendor in existing_vendors}
        print(f"Loaded {len(existing_ids)} existing vendor IDs from database: {existing_ids}")
    except Exception as e:
        print(f"Error fetching vendors from Supabase: {e}")
        return

    records_to_insert = []
    skipped_records = []

    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row_num, row in enumerate(reader, start=2):
            vendor_id_raw = row.get("vendor_id")
            name = row.get("business_name")
            business_category = row.get("business_category")
            spot_id = row.get("spot_id")
            verification_status = row.get("verification_status")
            offer = row.get("available_offers_discounts")

            # Validate ID prefix and convert to integer
            if not vendor_id_raw or not vendor_id_raw.startswith("VN"):
                skipped_records.append((row_num, vendor_id_raw, "Invalid or missing vendor_id format"))
                continue

            try:
                vendor_id = int(vendor_id_raw[2:])
            except ValueError:
                skipped_records.append((row_num, vendor_id_raw, f"Non-numeric ID segment in '{vendor_id_raw}'"))
                continue

            # Duplicate ID check
            if vendor_id in existing_ids:
                skipped_records.append((row_num, vendor_id_raw, f"Duplicate ID: '{vendor_id_raw}' (Int: {vendor_id}) already exists"))
                continue

            # Verify spot_id exists in sites table
            if not spot_id or spot_id not in valid_site_ids:
                skipped_records.append((row_num, vendor_id_raw, f"Missing or invalid spot_id: '{spot_id}' does not exist in sites"))
                continue

            # Convert verification_status to boolean
            verified = False
            status_clean = verification_status.strip().lower() if verification_status else ""
            if status_clean and not status_clean.startswith("unverified") and not status_clean == "false":
                verified = True

            # Basic field presence check
            if not name or not business_category:
                skipped_records.append((row_num, vendor_id_raw, "Missing business_name or business_category"))
                continue

            # Add to insertion list
            records_to_insert.append({
                "id": vendor_id,
                "name": name,
                "type": business_category,
                "site_id": spot_id,
                "verified": verified,
                "offer": offer if offer else ""
            })

    print(f"\nValidation Summary:")
    print(f"  - Ready to insert: {len(records_to_insert)} records")
    print(f"  - Skipped / Invalid: {len(skipped_records)} records")
    for row_num, vendor_id_raw, reason in skipped_records:
        print(f"    * Row {row_num} (ID: {vendor_id_raw}): {reason}")

    if not records_to_insert:
        print("\nNo new records to insert.")
        return

    print("\nStarting insertion...")
    success_count = 0
    failure_count = 0

    # Insert batch
    try:
        res = supabase.table("vendors").insert(records_to_insert).execute()
        success_count = len(records_to_insert)
        print(f"Successfully inserted {success_count} vendors.")
    except Exception as e:
        print(f"Bulk insert failed: {e}. Trying row-by-row fallback...")
        # Fallback to row-by-row for precise error reports
        for rec in records_to_insert:
            try:
                supabase.table("vendors").insert(rec).execute()
                success_count += 1
            except Exception as row_error:
                print(f"  * Failed to insert ID VN{rec['id']:03d}: {row_error}")
                failure_count += 1

    print(f"\nFinal Import Report:")
    print(f"  - Successfully inserted: {success_count}")
    print(f"  - Failed to insert: {failure_count}")
    print(f"  - Skipped during validation: {len(skipped_records)}")

if __name__ == "__main__":
    import_vendors()
