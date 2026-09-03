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

def run_pipeline(video_path, capacity, site_id="SITE001", site_name="Charminar Main Courtyard", backend_url=None, sample_every=1.0, model_name="yolo26n.pt", conf=0.35, output_json="crowd_data.json"):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    margin = 10
    region_points = [(margin, margin), (w - margin, margin), (w - margin, h - margin), (margin, h - margin)]

    counter = solutions.RegionCounter(
        model=model_name,
        region={site_name: region_points},
        classes=[0],
        conf=conf,
        show=False,
    )

    frame_interval = max(1, int(fps * sample_every))
    results_list = []
    frame_idx = 0
    print(f"[*] Processing '{video_path}' ({w}x{h} @ {fps:.1f}fps)...")

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        results = counter(frame)
        if frame_idx % frame_interval == 0:
            timestamp_sec = frame_idx / fps
            person_count = results.region_counts.get(site_name, 0)
            occupancy_pct = round((person_count / capacity) * 100, 1)
            status = classify_status(occupancy_pct)
            entry = {
                "site_id": site_id,
                "site_name": site_name,
                "frame": frame_idx,
                "timestamp_sec": round(timestamp_sec, 2),
                "person_count": person_count,
                "capacity": capacity,
                "occupancy_pct": occupancy_pct,
                "status": status
            }
            results_list.append(entry)
            if backend_url:
                try:
                    requests.post(backend_url, json={"site_id": site_id, "people_count": person_count, "queue_length": 0}, timeout=2.0)
                except Exception:
                    pass
        frame_idx += 1
    cap.release()
    with open(output_json, "w") as f:
        json.dump(results_list, f, indent=2)
    print(f"[+] Saved {len(results_list)} logged samples -> '{output_json}'")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", default="test1.mp4")
    parser.add_argument("--capacity", type=int, default=200)
    parser.add_argument("--site_id", default="SITE001")
    parser.add_argument("--backend_url", default="http://localhost:8000/crowd/update")
    args = parser.parse_args()
    run_pipeline(args.video, args.capacity, args.site_id, backend_url=args.backend_url)
