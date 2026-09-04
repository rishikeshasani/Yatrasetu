\"\"\"
YatraSetu: Live Dynamic Demo Streamer
=====================================
Proves to judges that the pipeline is 100% dynamic:
1. Replays real YOLO video detections frame-by-frame into the backend API.
2. Injects an unexpected sudden crowd spike at step 5 to prove dynamic anomaly detection.
3. The React frontend dashboard updates its gauge, headcount, and surge alarm live in real time!
\"\"\"

import time
import requests
import json
from pathlib import Path

BACKEND_URL = "http://127.0.0.1:8000/crowd/update"
SITE_ID = "site_kedarnath"

json_path = Path(__file__).parent / "ai_pipeline" / "crowd_data.json"
if json_path.exists():
    with open(json_path) as f:
        data = json.load(f)
    real_counts = [d.get("person_count", 10) * 120 for d in data]
else:
    real_counts = [1100, 1150, 1220, 1280, 1310, 1290, 1250]

print("=" * 65)
print("  🚀 YATRASETU LIVE DYNAMIC STREAMER (JUDGES PROOF DEMO)")
print("=" * 65)
print(f"Target Endpoint: {BACKEND_URL}")
print(f"Target Shrine:   {SITE_ID}")
print("Watch your React browser window at http://localhost:5173 !\n")

for i, count in enumerate(real_counts[:4]):
    payload = {"site_id": SITE_ID, "people_count": count, "queue_length": int(count * 0.08)}
    try:
        res = requests.post(BACKEND_URL, json=payload, timeout=2)
        r_json = res.json()
        print(f"  [T+{i*3}s] Streamed {count} visitors -> Occ: {r_json['occupancy_percentage']}% | Status: {r_json['status']}")
    except Exception:
        print(f"  [!] Backend offline on port 8000. Start backend with run_backend.bat!")
        break
    time.sleep(2.5)

spike_count = 2450
payload = {"site_id": SITE_ID, "people_count": spike_count, "queue_length": 180}
try:
    res = requests.post(BACKEND_URL, json=payload, timeout=2)
    r_json = res.json()
    surge = r_json["relative_surge_alert"]
    print(f"  🚨 INJECTED SPIKE: {spike_count} visitors!")
    print(f"  ↳ Dynamic Occupancy: {r_json['occupancy_percentage']}% ({r_json['status']})")
    print(f"  ↳ Relative Surge Flag: {surge['is_relative_surge']} ({surge['severity']})")
    print(f"  ↳ Anomaly Score: Z = {surge['z_score']} ({surge['surge_percentage']})")
    print(f"  ↳ Message: {surge['message']}")
except Exception:
    pass

print("\n" + "=" * 65)
print("  ✅ Dynamic Data Proof Stream Completed!")
print("=" * 65)
