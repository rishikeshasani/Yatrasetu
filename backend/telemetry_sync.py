import os
import time
import json
from database import supabase_admin

# Assume the YOLO pipeline writes to data/crowd_data.json relative to the project root
DATA_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "crowd_data.json"))

def get_last_modified(path):
    try:
        return os.path.getmtime(path)
    except OSError:
        return 0

def sync_telemetry():
    print("==========================================================")
    print(">>> YATRA SETU: TELEMETRY SYNC WATCHER ACTIVE <<<")
    print("==========================================================")
    print(f"Monitoring: {DATA_FILE}")
    print("Waiting for YOLO pipeline updates...\n")
    
    last_mtime = 0

    while True:
        current_mtime = get_last_modified(DATA_FILE)

        # If the file has been modified since we last checked
        if current_mtime > last_mtime:
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)

                # YOLO output might be a single object or a list of objects
                if not isinstance(data, list):
                    data = [data]

                records_to_insert = []
                for item in data:
                    # Extract the necessary fields based on YOLO pipeline output
                    site_id = item.get("site") or item.get("site_id")
                    people_count = item.get("person_count") or item.get("people_count", 0)
                    
                    if not site_id:
                        continue

                    # Map to the Supabase schema for crowd_observations
                    payload = {
                        "site_id": site_id,
                        "people_count": people_count,
                        "queue_length": item.get("queue_length", 0)
                    }
                    records_to_insert.append(payload)

                if records_to_insert:
                    # Execute the INSERT into Supabase using the admin client
                    res = supabase_admin.table("crowd_observations").insert(records_to_insert).execute()
                    print(f"[{time.strftime('%X')}] Successfully pushed {len(records_to_insert)} live observation(s) to Supabase.")

                # Update the last modified tracker
                last_mtime = current_mtime
                
            except json.JSONDecodeError:
                # File might be mid-write by the YOLO script, just skip this tick
                pass
            except Exception as e:
                print(f"[{time.strftime('%X')}] Error syncing telemetry: {e}")

        # Poll every 1 second
        time.sleep(1)

if __name__ == "__main__":
    sync_telemetry()
