import cv2
import json
import argparse
import requests
from ultralytics import solutions

def classify_status(occupancy_pct):
    if occupancy_pct < 50:
        return "NORMAL"
    elif occupancy_pct < 75:
        return "MODERATE"
    elif occupancy_pct < 90:
        return "HIGH"
    else:
        return "CRITICAL"

def run_pipeline(video_path, capacity=2500, site_id="haridwar", site_name="Haridwar — Har Ki Pauri", backend_url="http://127.0.0.1:8000/internal/telemetry", sample_every=1.0, model_name="yolo26n.pt", conf=0.35, output_json=None):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    if output_json is None:
        output_json = f"data/crowd_data_{site_id}.json"

    margin = 10
    mid_x = w // 2
    mid_y = h // 2

    zones_config = {
        f"Zone A - {site_name} Main Courtyard": [(margin, margin), (mid_x, margin), (mid_x, mid_y), (margin, mid_y)],
        f"Zone B - {site_name} Exit Chokepoint": [(mid_x, margin), (w - margin, margin), (w - margin, mid_y), (mid_x, mid_y)],
        f"Zone C - {site_name} Satellite Staging": [(margin, mid_y), (w - margin, mid_y), (w - margin, h - margin), (margin, h - margin)],
    }

    counters = {}
    for zone_label, points in zones_config.items():
        counters[zone_label] = solutions.RegionCounter(
            model=model_name,
            region={zone_label: points},
            classes=[0],
            conf=conf,
            show=False,
        )

    frame_interval = max(1, int(fps * sample_every))
    results_list = []
    frame_idx = 0
    print(f"[*] Multi-Zone Pipeline running for '{site_id}' on '{video_path}'...")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        zone_counts = {}
        for zone_label, counter in counters.items():
            results = counter(frame)
            zone_counts[zone_label] = results.region_counts.get(zone_label, 0)

        total_people = sum(zone_counts.values())

        if frame_idx % frame_interval == 0:
            timestamp_sec = round(frame_idx / fps, 2)
            occupancy_pct = round((total_people / capacity) * 100, 1)
            status = classify_status(occupancy_pct)

            entry = {
                "site_id": site_id,
                "site_name": site_name,
                "frame": frame_idx,
                "timestamp_sec": timestamp_sec,
                "person_count": total_people,
                "zones": zone_counts,
                "capacity": capacity,
                "occupancy_pct": occupancy_pct,
                "status": status
            }
            results_list.append(entry)

            if backend_url:
                try:
                    payload = {
                        "site_id": site_id,
                        "people_count": total_people,
                        "zones": zone_counts,
                        "capacity": capacity,
                        "queue_length": zone_counts.get(f"Zone B - {site_name} Exit Chokepoint", 0)
                    }
                    requests.post(backend_url, json=payload, timeout=1.5)
                except Exception:
                    pass

        frame_idx += 1

    cap.release()
    with open(output_json, "w") as f:
        json.dump(results_list, f, indent=2)
    print(f"[+] Saved {len(results_list)} multi-zone samples -> '{output_json}'")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", default="test1.mp4")
    parser.add_argument("--capacity", type=int, default=50000)
    parser.add_argument("--site_id", default="haridwar")
    parser.add_argument("--backend_url", default="http://127.0.0.1:8000/internal/telemetry")
    args = parser.parse_args()
    run_pipeline(args.video, args.capacity, args.site_id, backend_url=args.backend_url)
