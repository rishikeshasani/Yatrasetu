import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.append(CURRENT_DIR)

from services.yolo_service import yolo_service, DEFAULT_YOLO_FEEDS
from routes.crowd import resolve_site_crowd_state

def test_yolo_service_boundary():
    print("=== Testing YOLOService Boundary & Weights ===")
    print(f"Model path: {yolo_service.model_path}")
    print(f"Is operational: {yolo_service.is_operational}")
    assert yolo_service.model_path is not None, "Model path could not be resolved!"
    assert yolo_service.is_operational is True, "YOLO model failed to initialize with yolo26n.pt!"
    print("[PASS] YOLO model weights loaded successfully.")

def test_canonical_feed_mapping():
    print("\n=== Testing Canonical YOLO Feeds ===")
    assert "TS015" in DEFAULT_YOLO_FEEDS, "TS015 must be configured as Har Ki Pauri / Haridwar feed!"
    assert "TS018" not in DEFAULT_YOLO_FEEDS or DEFAULT_YOLO_FEEDS.get("TS018", {}).get("name") != "Haridwar", "TS018 must NOT be labeled as Haridwar!"
    print(f"Configured feeds: {list(DEFAULT_YOLO_FEEDS.keys())}")
    print("[PASS] Canonical feed mapping verified.")

def test_simulated_inference_and_telemetry_pipeline():
    print("\n=== Testing Inference Execution & Telemetry Contract ===")
    target_site = "TS015"
    test_count = 1850

    obs = yolo_service.run_simulated_demo_inference(site_id=target_site, base_count=test_count)
    print("Ingested observation:", obs)

    assert obs["site_id"] == target_site, f"Expected site_id {target_site}, got {obs['site_id']}"
    assert obs["people_count"] == test_count, f"Expected people_count {test_count}, got {obs['people_count']}"
    assert obs["source"] == "yolo_video", f"Expected source 'yolo_video', got {obs['source']}"
    assert "zones" in obs and len(obs["zones"]) > 0, "Zones must be present in telemetry observation!"
    assert obs["status"] in ["NORMAL", "MODERATE", "HIGH", "CRITICAL"], f"Invalid status {obs['status']}"
    print("[PASS] Observation payload strictly satisfies YOLO telemetry contract.")

    # Verify Precedence A in resolve_site_crowd_state
    crowd_state = resolve_site_crowd_state(target_site)
    print("\nResolved site crowd state after YOLO ingestion:", crowd_state)
    assert crowd_state["source"] == "yolo_video", f"Precedence A failed! Expected source 'yolo_video', got {crowd_state['source']}"
    assert crowd_state["people_count"] == test_count
    assert crowd_state["wait_time_minutes"] > 0
    print("[PASS] Precedence A verified: YOLO video feed takes authoritative priority in crowd state resolution.")

if __name__ == "__main__":
    try:
        test_yolo_service_boundary()
        test_canonical_feed_mapping()
        test_simulated_inference_and_telemetry_pipeline()
        print("\nALL YOLO SERVICE BOUNDARY TESTS PASSED (100%)!")
    except Exception as e:
        print(f"\n[FAIL] Test error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
