"""
YatraSetu Region Occupancy Pipeline (Official Ultralytics RegionCounter)
--------------------------------------------------------------------------
Uses Ultralytics' official RegionCounter solution to measure LIVE occupancy
(how many people are inside a defined zone right now) -- matches the
"850/1000 people at Site X, right now" use case, unlike ObjectCounter which
counts cumulative entries/exits.

Produces:
  1. An annotated output video (boxes + live count overlay) -- your demo asset.
  2. A JSON/CSV time series of occupancy %, status -- feeds the backend.

REQUIREMENTS:
    pip install ultralytics opencv-python

USAGE:
    python region_occupancy_pipeline.py --video footage.mp4 --capacity 1000 --site "Charminar"
"""

import cv2
import json
import csv
import argparse
from ultralytics import solutions


def classify_status(occupancy_pct, normal_max=50, high_max=80):
    """Rule-based, explainable classification -- call this 'rule-based' in
    your pitch, not AI. The AI is the detection; this logic is deliberately
    transparent so you can defend it in Q&A."""
    if occupancy_pct < normal_max:
        return "NORMAL"
    elif occupancy_pct < high_max:
        return "MODERATE"
    else:
        return "HIGH"


def run_pipeline(
    video_path,
    capacity,
    site_name,
    region_points=None,       # None = whole frame; pass a list of (x,y) points to mark a zone
    sample_every=1.0,         # seconds between LOGGED samples (detection still runs every frame)
    model_name="yolo26n.pt",  # nano model: fastest, lowest resource use
    conf=0.35,
    output_video="annotated_output.mp4",
    output_json="crowd_data.json",
    output_csv=None,
):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    if region_points is None:
        margin = 10
        region_points = [(margin, margin), (w - margin, margin),
                          (w - margin, h - margin), (margin, h - margin)]

    region_name = site_name
    counter = solutions.RegionCounter(
        model=model_name,
        region={region_name: region_points},
        classes=[0],   # person only (COCO class 0)
        conf=conf,
        show=False,
    )

    writer = cv2.VideoWriter(output_video, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))

    frame_interval = max(1, int(fps * sample_every))
    results_list = []
    frame_idx = 0

    print(f"Processing '{video_path}' ({w}x{h} @ {fps:.1f}fps)...\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = counter(frame)       # run every frame -- tracking needs continuity
        writer.write(results.plot_im)  # always write annotated frame for the demo video

        if frame_idx % frame_interval == 0:
            timestamp_sec = frame_idx / fps
            person_count = results.region_counts.get(region_name, 0)
            occupancy_pct = round((person_count / capacity) * 100, 1)
            status = classify_status(occupancy_pct)

            entry = {
                "site": site_name,
                "frame": frame_idx,
                "timestamp_sec": round(timestamp_sec, 2),
                "person_count": person_count,
                "capacity": capacity,
                "occupancy_pct": occupancy_pct,
                "status": status,
            }
            results_list.append(entry)
            print(f"[{timestamp_sec:6.1f}s] {site_name}: {person_count} people "
                  f"({occupancy_pct}%) -> {status}")

        frame_idx += 1

    cap.release()
    writer.release()

    if not results_list:
        print("WARNING: no frames were sampled -- check video path/fps.")
        return results_list

    with open(output_json, "w") as f:
        json.dump(results_list, f, indent=2)

    if output_csv:
        with open(output_csv, "w", newline="") as f:
            wtr = csv.DictWriter(f, fieldnames=results_list[0].keys())
            wtr.writeheader()
            wtr.writerows(results_list)

    print(f"\nDone.")
    print(f"  Annotated video: {output_video}")
    print(f"  Data (JSON): {output_json}" + (f", (CSV): {output_csv}" if output_csv else ""))
    return results_list


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="YatraSetu region occupancy pipeline")
    parser.add_argument("--video", required=True)
    parser.add_argument("--capacity", type=int, required=True)
    parser.add_argument("--site", default="Site A")
    parser.add_argument("--sample_every", type=float, default=1.0)
    parser.add_argument("--model", default="yolo26n.pt")
    parser.add_argument("--conf", type=float, default=0.35)
    parser.add_argument("--output_video", default="annotated_output.mp4")
    parser.add_argument("--output_json", default="crowd_data.json")
    parser.add_argument("--output_csv", default=None)
    args = parser.parse_args()

    run_pipeline(
        video_path=args.video,
        capacity=args.capacity,
        site_name=args.site,
        sample_every=args.sample_every,
        model_name=args.model,
        conf=args.conf,
        output_video=args.output_video,
        output_json=args.output_json,
        output_csv=args.output_csv,
    )
