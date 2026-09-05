"""
YatraSetu Multi-Zone Region Occupancy & Chokepoint Pipeline (Ultralytics YOLO)
-------------------------------------------------------------------------------
Measures LIVE multi-zone crowd density and chokepoint bottlenecks in real time:
  - Zone A: Main Shrine Courtyard / Bathing Ghat
  - Zone B: Exit Gate Chokepoint & Queue Corridor
  - Zone C: Satellite Parking & Staging Hub

Multi-process Safety:
  - Writes to site-specific JSON (data/crowd_data_{site_id}.json) to prevent overwrites.
  - Direct HTTP POST to FastAPI (/internal/telemetry) on every sample tick.

USAGE:
    python region_occupancy_pipeline.py --video videos/haridwar.mp4 --site_id haridwar --capacity 50000
    python region_occupancy_pipeline.py --video videos/rishikesh.mp4 --site_id rishikesh --capacity 25000
"""

import cv2
import json
import csv
import argparse
import os
import requests
from ultralytics import solutions


def classify_status(occupancy_pct, normal_max=50, high_max=80):
    if occupancy_pct < normal_max:
        return "NORMAL"
    elif occupancy_pct < high_max:
        return "MODERATE"
    elif occupancy_pct < 95:
        return "HIGH"
    else:
        return "CRITICAL"


def run_pipeline(
    video_path,
    capacity,
    site_id="haridwar",
    site_name="Haridwar — Har Ki Pauri",
    backend_url="http://127.0.0.1:8000/internal/telemetry",
    sample_every=1.0,
    model_name="yolo26n.pt",
    conf=0.35,
    output_video=None,
    output_json=None,
    output_csv=None,
):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Site-specific output paths to prevent file collisions
    if output_json is None:
        os.makedirs("data", exist_ok=True)
        output_json = f"data/crowd_data_{site_id}.json"

    if output_video is None:
        output_video = f"annotated_{site_id}.mp4"

    # Multi-Zone Chokepoint Polygons
    margin = 10
    mid_x = w // 2
    mid_y = h // 2

    zones_config = {
        f"Zone A - {site_name} Main Courtyard": [(margin, margin), (mid_x, margin), (mid_x, mid_y), (margin, mid_y)],
        f"Zone B - {site_name} Exit Chokepoint": [(mid_x, margin), (w - margin, margin), (w - margin, mid_y), (mid_x, mid_y)],
        f"Zone C - {site_name} Satellite Staging": [(margin, mid_y), (w - margin, mid_y), (w - margin, h - margin), (margin, h - margin)],
    }

    # Initialize Ultralytics RegionCounters for multi-zone tracking
    counters = {}
    for zone_label, points in zones_config.items():
        counters[zone_label] = solutions.RegionCounter(
            model=model_name,
            region={zone_label: points},
            classes=[0],  # Person class only
            conf=conf,
            show=False,
        )

    writer = cv2.VideoWriter(output_video, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
    frame_interval = max(1, int(fps * sample_every))
    results_list = []
    frame_idx = 0

    print(f"[*] Processing '{video_path}' for site '{site_id}' ({w}x{h} @ {fps:.1f}fps)...")
    print(f"[*] Configured Multi-Zone Tracking: {list(zones_config.keys())}\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        zone_counts = {}
        annotated_frame = frame.copy()

        # Run detection across each chokepoint zone
        for zone_label, counter in counters.items():
            results = counter(frame)
            count = results.region_counts.get(zone_label, 0)
            zone_counts[zone_label] = count
            annotated_frame = results.plot_im  # Overlay annotations

        writer.write(annotated_frame)
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
                "status": status,
            }
            results_list.append(entry)

            print(f"[{timestamp_sec:6.1f}s] {site_id.upper()} Total: {total_people} people ({occupancy_pct}%) | Zones: {zone_counts} -> {status}")

            # Direct HTTP POST to FastAPI backend (prevents file lock / overwrite race conditions)
            if backend_url:
                try:
                    payload = {
                        "site_id": site_id,
                        "people_count": total_people,
                        "zones": zone_counts,
                        "capacity": capacity,
                        "queue_length": zone_counts.get(f"Zone B - {site_name} Exit Chokepoint", 0),
                    }
                    requests.post(backend_url, json=payload, timeout=1.5)
                except Exception:
                    pass

        frame_idx += 1

    cap.release()
    writer.release()

    # Save site-specific JSON
    with open(output_json, "w") as f:
        json.dump(results_list, f, indent=2)

    print(f"\n[+] Processing complete for site '{site_id}'.")
    print(f"    Annotated Video: {output_video}")
    print(f"    Site JSON Log:   {output_json}")
    return results_list


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="YatraSetu multi-zone region occupancy pipeline")
    parser.add_argument("--video", required=True, help="Path to input CCTV video (.mp4)")
    parser.add_argument("--capacity", type=int, default=50000, help="Official daily capacity threshold")
    parser.add_argument("--site_id", default="haridwar", help="Unique site identifier e.g. haridwar, rishikesh")
    parser.add_argument("--site_name", default="Haridwar — Har Ki Pauri", help="Human readable site title")
    parser.add_argument("--backend_url", default="http://127.0.0.1:8000/internal/telemetry", help="FastAPI backend telemetry endpoint")
    parser.add_argument("--sample_every", type=float, default=1.0, help="Sample interval in seconds")
    parser.add_argument("--model", default="yolo26n.pt", help="YOLO model path")
    parser.add_argument("--conf", type=float, default=0.35, help="Confidence threshold")
    parser.add_argument("--output_video", default=None, help="Output annotated video path")
    parser.add_argument("--output_json", default=None, help="Output site-specific JSON path")
    args = parser.parse_args()

    run_pipeline(
        video_path=args.video,
        capacity=args.capacity,
        site_id=args.site_id,
        site_name=args.site_name,
        backend_url=args.backend_url,
        sample_every=args.sample_every,
        model_name=args.model,
        conf=args.conf,
        output_video=args.output_video,
        output_json=args.output_json,
    )
