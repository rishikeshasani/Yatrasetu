import os
import time
import json
import glob
import urllib.request
import urllib.parse

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))

def sync_telemetry():
    print("==========================================================")
    print(">>> YATRA SETU: MULTI-SITE TELEMETRY SYNC WATCHER <<<")
    print("==========================================================")
    
    file_mtimes = {}

    while True:
        json_pattern = os.path.join(DATA_DIR, "crowd_data*.json")
        json_files = glob.glob(json_pattern)

        for filepath in json_files:
            try:
                mtime = os.path.getmtime(filepath)
            except OSError:
                continue

            last_mtime = file_mtimes.get(filepath, 0)
            if mtime > last_mtime:
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)

                    if not isinstance(data, list):
                        data = [data]

                    success_count = 0
                    for item in data:
                        site_id = item.get("site") or item.get("site_id")
                        people_count = item.get("person_count") or item.get("people_count", 0)
                        
                        if not site_id:
                            continue

                        # Canonical ID mapping
                        if site_id in ("SITE001", "site_kedarnath"):
                            site_id = "TS001"

                        payload = {
                            "site_id": site_id,
                            "people_count": people_count,
                            "zones": item.get("zones", {}),
                            "capacity": item.get("capacity", 2500),
                            "queue_length": item.get("queue_length", 0)
                        }
                        
                        # POST to FastAPI backend
                        req = urllib.request.Request("http://127.0.0.1:8000/internal/telemetry", method="POST")
                        req.add_header('Content-Type', 'application/json')
                        urllib.request.urlopen(req, data=json.dumps(payload).encode('utf-8'))
                        success_count += 1

                    if success_count > 0:
                        filename = os.path.basename(filepath)
                        print(f"[{time.strftime('%X')}] Synced {filename} -> {payload['site_id']}: {payload['people_count']} people | Zones: {payload.get('zones')}")

                    file_mtimes[filepath] = mtime
                    
                except json.JSONDecodeError:
                    pass
                except Exception as e:
                    print(f"[{time.strftime('%X')}] Error syncing {filepath}: {e}")

        time.sleep(1)

if __name__ == "__main__":
    sync_telemetry()
