import os
import sys
import tempfile
import cv2
import numpy as np

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.append(CURRENT_DIR)

from fastapi.testclient import TestClient
from main import app
from services.yolo_service import yolo_service, DEFAULT_YOLO_FEEDS
from services.crowd_service import resolve_site_crowd_state, latest_observations

client = TestClient(app)


def create_synthetic_mp4(filepath: str, num_frames: int = 25, width: int = 320, height: int = 240):
    """Generates a small valid MP4 video fixture for testing video frame ingestion and OpenCV decoding."""
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(filepath, fourcc, 25.0, (width, height))
    for i in range(num_frames):
        # Create a frame with a colored background and geometric shapes
        frame = np.full((height, width, 3), (i * 8 % 255, 128, 200), dtype=np.uint8)
        # Draw a simulated shape
        cv2.circle(frame, (width // 2, height // 2), 30, (255, 255, 255), -1)
        out.write(frame)
    out.release()


def test_yolo_service_boundary():
    print("=== Testing YOLOService Boundary & Weights ===")
    print(f"Model path: {yolo_service.model_path}")
    print(f"Is operational: {yolo_service.is_operational}")
    assert yolo_service.model_path is not None, "Model path could not be resolved!"
    assert yolo_service.is_operational is True, "YOLO model failed to initialize with yolo26n.pt!"
    person_id = yolo_service.get_person_class_id()
    print(f"Resolved person class index: {person_id}")
    assert person_id == 0, f"Expected COCO person class 0, got {person_id}"
    print("[PASS] YOLO model weights and person class verified successfully.")


def test_canonical_feed_mapping():
    print("\n=== Testing Canonical YOLO Feeds ===")
    assert "TS015" in DEFAULT_YOLO_FEEDS, "TS015 must be configured as Har Ki Pauri / Haridwar feed!"
    assert "TS018" not in DEFAULT_YOLO_FEEDS or DEFAULT_YOLO_FEEDS.get("TS018", {}).get("name") != "Haridwar", "TS018 must NOT be labeled as Haridwar!"
    print(f"Configured feeds: {list(DEFAULT_YOLO_FEEDS.keys())}")
    print("[PASS] Canonical feed mapping verified.")


def test_video_stream_inference():
    print("\n=== Testing Video Stream OpenCV Decoding & Frame Sampling ===")
    temp_dir = tempfile.mkdtemp()
    video_path = os.path.join(temp_dir, "test_crowd_feed.mp4")

    try:
        create_synthetic_mp4(video_path, num_frames=30)
        assert os.path.exists(video_path), "Failed to generate synthetic MP4"

        target_site = "TS001"
        obs = yolo_service.analyze_video_stream(
            video_path=video_path,
            site_id=target_site,
            sample_interval_sec=0.5,
            max_frames=10,
        )

        print("Observed result from video stream:", obs)
        assert obs["site_id"] == target_site
        assert obs["source"] == "yolo_video"
        assert "yolo_analysis" in obs
        yolo_meta = obs["yolo_analysis"]
        assert yolo_meta["frames_analyzed"] > 0
        assert "disclaimer" in yolo_meta
        assert "camera_fov_count" in yolo_meta
        assert "classes_detected" in yolo_meta and "person" in yolo_meta["classes_detected"]

        # Verify crowd resolution priority
        crowd_state = resolve_site_crowd_state(target_site)
        assert crowd_state["source"] == "yolo_video"
        assert crowd_state["occupancy_percentage"] >= 0
        assert crowd_state["status"] in ["NORMAL", "MODERATE", "HIGH", "CRITICAL"]
        print(f"[PASS] Video stream analyzed: {yolo_meta['frames_analyzed']} frames, FOV count={yolo_meta['camera_fov_count']}, crowd status={crowd_state['status']}")

    finally:
        if os.path.exists(video_path):
            os.remove(video_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)


def test_yolo_endpoint_rbac_and_execution():
    print("\n=== Testing POST /yolo/analyze-video Endpoint & RBAC ===")
    temp_dir = tempfile.mkdtemp()
    video_path = os.path.join(temp_dir, "api_test_clip.mp4")

    try:
        create_synthetic_mp4(video_path, num_frames=15)

        # 1. Unauthenticated request must return 401
        with open(video_path, "rb") as f:
            res_unauth = client.post(
                "/yolo/analyze-video",
                data={"site_id": "TS001"},
                files={"file": ("clip.mp4", f, "video/mp4")},
            )
        assert res_unauth.status_code == 401, f"Expected 401 for unauthenticated request, got {res_unauth.status_code}"
        print("[PASS] Unauthenticated request safely rejected with HTTP 401.")

        # 2. Invalid site_id must return 400 Bad Request
        with open(video_path, "rb") as f:
            res_bad_site = client.post(
                "/yolo/analyze-video",
                headers={"Authorization": "Bearer demo-jwt-token-for-government"},
                data={"site_id": "TS999_INVALID"},
                files={"file": ("clip.mp4", f, "video/mp4")},
            )
        assert res_bad_site.status_code == 400, f"Expected 400 for bad site_id, got {res_bad_site.status_code}"
        print("[PASS] Invalid site_id rejected with HTTP 400.")

        # 3. Invalid file extension must return 400 Bad Request
        res_bad_ext = client.post(
            "/yolo/analyze-video",
            headers={"Authorization": "Bearer demo-jwt-token-for-government"},
            data={"site_id": "TS001"},
            files={"file": ("clip.txt", b"plain text payload", "text/plain")},
        )
        assert res_bad_ext.status_code == 400, f"Expected 400 for bad file extension, got {res_bad_ext.status_code}"
        print("[PASS] Invalid file extension rejected with HTTP 400.")

        # 4. Authenticated Government / Police request must succeed with 200
        with open(video_path, "rb") as f:
            res_ok = client.post(
                "/yolo/analyze-video",
                headers={"Authorization": "Bearer demo-jwt-token-for-government"},
                data={"site_id": "TS001", "sample_interval_sec": 0.5, "max_frames": 5},
                files={"file": ("clip.mp4", f, "video/mp4")},
            )
        assert res_ok.status_code == 200, f"Expected 200, got {res_ok.status_code}: {res_ok.text}"
        payload = res_ok.json()
        assert payload["status"] == "success"
        assert "observation" in payload
        assert payload["observation"]["source"] == "yolo_video"
        assert payload["observation"]["site_id"] == "TS001"
        assert payload["processed_by"]["role"] == "government"
        print(f"[PASS] POST /yolo/analyze-video succeeded with HTTP 200: {payload['message']}")

        # 5. GET /yolo/status check
        res_status = client.get("/yolo/status")
        assert res_status.status_code == 200
        st = res_status.json()
        assert st["is_operational"] is True
        assert st["person_class_id"] == 0
        print("[PASS] GET /yolo/status verified operational status.")

    finally:
        if os.path.exists(video_path):
            os.remove(video_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)


def test_gods_eye_view_contract_compliance():
    print("\n=== Testing God's-Eye View Contract Compliance (All 25 Canonical Shrines) ===")
    res = client.get("/sites/density")
    assert res.status_code == 200
    data = res.json()
    densities = data.get("densities", data)

    required_fields = [
        "site_id",
        "site_name",
        "latitude",
        "longitude",
        "people_count",
        "capacity",
        "occupancy_percentage",
        "status",
        "source",
        "timestamp",
        "wait_time_minutes",
    ]

    valid_statuses = {"NORMAL", "MODERATE", "HIGH", "CRITICAL"}
    valid_sources = {"yolo_video", "live_telemetry", "historical_baseline", "historical", "demo_simulation"}

    for i in range(1, 26):
        site_id = f"TS{i:03d}"
        assert site_id in densities, f"Site {site_id} missing in /sites/density!"
        record = densities[site_id]

        for f in required_fields:
            assert f in record, f"Field '{f}' missing in record for {site_id}!"

        assert isinstance(record["site_id"], str)
        assert isinstance(record["site_name"], str) and len(record["site_name"]) > 0
        assert isinstance(record["latitude"], (int, float)) and record["latitude"] != 0.0, f"Missing latitude for {site_id}"
        assert isinstance(record["longitude"], (int, float)) and record["longitude"] != 0.0, f"Missing longitude for {site_id}"
        assert isinstance(record["people_count"], int) and record["people_count"] >= 0
        assert isinstance(record["capacity"], int) and record["capacity"] > 0
        assert isinstance(record["occupancy_percentage"], (int, float)) and 0.0 <= record["occupancy_percentage"] <= 100.0
        assert record["status"] in valid_statuses, f"Invalid status {record['status']} for {site_id}"
        assert record["source"] in valid_sources, f"Invalid source {record['source']} for {site_id}"
        assert isinstance(record["wait_time_minutes"], int) and record["wait_time_minutes"] >= 0

    print(f"[PASS] All 25 canonical shrines (TS001-TS025) strictly satisfy the God's-Eye View contract.")


if __name__ == "__main__":
    try:
        test_yolo_service_boundary()
        test_canonical_feed_mapping()
        test_video_stream_inference()
        test_yolo_endpoint_rbac_and_execution()
        test_gods_eye_view_contract_compliance()
        print("\n=======================================================")
        print("ALL YOLO INTEGRATION & DENSITY TESTS PASSED (100%)!")
        print("=======================================================")
    except Exception as e:
        print(f"\n[FAIL] Test error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
