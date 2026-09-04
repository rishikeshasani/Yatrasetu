import os
import time
import json
import urllib.request
import urllib.parse

DATA_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "crowd_data.json"))

def get_last_modified(path):
    try:
        return os.path.getmtime(path)
    except OSError:
        return 0

def sync_telemetry():
    print("==========================================================")
    print(">>> YATRA SETU: TELEMETRY HTTP SYNC WATCHER ACTIVE <<<")
    print("==========================================================")
    
    last_mtime = 0

    while True:
        current_mtime = get_last_modified(DATA_FILE)
        if current_mtime > last_mtime:
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)

                if not isinstance(data, list):
                    data = [data]

                success_count = 0
                for item in data:
                    site_id = item.get("site") or item.get("site_id")
                    people_count = item.get("person_count") or item.get("people_count", 0)
                    
                    if not site_id:
                        continue

                    # FORCE map SITE001 to TS001 so the UI sees it!
                    if site_id == "SITE001":
                        site_id = "TS001"
                    elif site_id == "site_kedarnath":
                        site_id = "TS001"

                    payload = {
                        "site_id": site_id,
                        "people_count": people_count,
                        "queue_length": item.get("queue_length", 0)
                    }
                    
                    # POST to FastAPI backend
                    req = urllib.request.Request("http://127.0.0.1:8000/internal/telemetry", method="POST")
                    req.add_header('Content-Type', 'application/json')
                    urllib.request.urlopen(req, data=json.dumps(payload).encode('utf-8'))
                    success_count += 1

                if success_count > 0:
                    print(f"[{time.strftime('%X')}] Synced {success_count} observation(s) to API -> {payload['site_id']}: {payload['people_count']} people")

                last_mtime = current_mtime
                
            except json.JSONDecodeError:
                pass
            except Exception as e:
                print(f"[{time.strftime('%X')}] Error syncing telemetry: {e}")

        time.sleep(1)

if __name__ == "__main__":
    sync_telemetry()
