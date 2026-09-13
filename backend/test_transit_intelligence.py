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
from services.transit_service import transit_flow_service, TRANSIT_NODES_REGISTRY
from services.yolo_service import yolo_service

client = TestClient(app)


def create_synthetic_mp4(filepath: str, num_frames: int = 15, width: int = 320, height: int = 240):
    """Generates a small valid MP4 video fixture for testing video frame ingestion and OpenCV decoding."""
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(filepath, fourcc, 25.0, (width, height))
    for i in range(num_frames):
        frame = np.full((height, width, 3), (i * 12 % 255, 140, 210), dtype=np.uint8)
        cv2.circle(frame, (width // 2, height // 2), 25, (255, 255, 255), -1)
        out.write(frame)
    out.release()


def test_transit_nodes_registry_and_funnel():
    print("=== 1. Testing Transit Nodes Registry & Funnel Integrity ===")
    assert len(TRANSIT_NODES_REGISTRY) == 6, f"Expected 6 transit nodes, found {len(TRANSIT_NODES_REGISTRY)}"
    
    expected_nodes = [
        "NODE_DELHI_NDLS",
        "NODE_HARIDWAR_HW",
        "NODE_RISHIKESH_BS",
        "NODE_RUDRAPRAYAG",
        "NODE_GUPTKASHI",
        "NODE_SONPRAYAG"
    ]
    
    for nid in expected_nodes:
        assert nid in TRANSIT_NODES_REGISTRY, f"Node {nid} missing in registry!"
        node = transit_flow_service.get_node(nid)
        assert node is not None, f"Could not retrieve node {nid} from service"
        assert "funnel" in node
        funnel = node["funnel"]
        
        # Verify funnel progression
        assert funnel["offered"] >= funnel["accepted"], f"Offered ({funnel['offered']}) must be >= Accepted ({funnel['accepted']})"
        assert funnel["accepted"] >= funnel["confirmed"], f"Accepted ({funnel['accepted']}) must be >= Confirmed ({funnel['confirmed']})"
        assert "waiting" in funnel
        assert "boarded" in funnel
        assert "completed" in funnel
        print(f"  [PASS] Node {nid} ({node['name']}): Headcount={node['headcount']}, Demand={node['expected_demand']}, Rationale='{node['rationale']}'")
    
    print("[PASS] All 6 transit nodes verified with valid 6-stage funnels.")


def test_local_fleet_sizing_logic():
    print("\n=== 2. Testing Local Fleet Sizing Mathematics ===")
    # Test Node Haridwar
    haridwar = transit_flow_service.get_node("NODE_HARIDWAR_HW")
    
    # Test formula: Usable capacity = 40 * 0.90 = 36 seats
    assert haridwar["usable_capacity"] == 36, f"Expected 36 usable seats, got {haridwar['usable_capacity']}"
    
    # Test simulated waiting: 31, expected incoming: 20 -> demand: 51
    sim_res = transit_flow_service.simulate_node_observation(
        node_id="NODE_HARIDWAR_HW",
        passengers_waiting=31,
        expected_incoming=20,
        reroutes_confirmed=37,
        available_buses=1
    )
    
    assert sim_res["expected_demand"] == 51, f"Expected demand 51, got {sim_res['expected_demand']}"
    assert sim_res["required_buses"] == 2, f"Expected required buses 2 (ceil(51/36)), got {sim_res['required_buses']}"
    assert sim_res["shortage_buses"] == 1, f"Expected shortage 1 (2 required - 1 available), got {sim_res['shortage_buses']}"
    assert "Deploy 1 additional local bus" in sim_res["rationale"], f"Rationale mismatch: {sim_res['rationale']}"
    assert "31 passengers currently waiting" in sim_res["rationale"]
    assert "20 expected incoming" in sim_res["rationale"]
    assert "37 reroutes confirmed" in sim_res["rationale"]
    print(f"  [PASS] Verified Haridwar Fleet Sizing Rationale: \"{sim_res['rationale']}\"")


def test_yolo_video_ingestion_propagation():
    print("\n=== 3. Testing Dynamic Video Ingestion & State Propagation ===")
    temp_dir = tempfile.mkdtemp()
    video_path = os.path.join(temp_dir, "transit_crowd_clip.mp4")
    
    try:
        create_synthetic_mp4(video_path, num_frames=12)
        
        # Ingest video for Sonprayag node
        target_node = "NODE_SONPRAYAG"
        initial_state = transit_flow_service.get_node(target_node)
        initial_headcount = initial_state["headcount"]
        
        with open(video_path, "rb") as f:
            res = client.post(
                "/yolo/analyze-video",
                headers={"Authorization": "Bearer demo-jwt-token-for-travel"},
                data={"node_id": target_node, "sample_interval_sec": 0.5, "max_frames": 5},
                files={"file": ("sonprayag_cam.mp4", f, "video/mp4")},
            )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        payload = res.json()
        assert payload["status"] == "success"
        assert payload["target_type"] == "transit_node"
        assert "fleet_recommendation" in payload
        
        # Verify that node state was updated dynamically in backend service
        updated_node = transit_flow_service.get_node(target_node)
        assert updated_node["last_source"] == "yolo_video"
        assert updated_node["video_analysis_meta"] is not None
        assert "video_file" in updated_node["video_analysis_meta"]
        print(f"  [PASS] Video ingestion dynamically updated {target_node}: Source={updated_node['last_source']}, Headcount={updated_node['headcount']}, Required Buses={updated_node['required_buses']}")
        
    finally:
        if os.path.exists(video_path):
            os.remove(video_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)


def test_transit_rest_endpoints():
    print("\n=== 4. Testing REST API Endpoints for Transit Intelligence ===")
    # 1. GET /fleet/transit-nodes
    res_all = client.get("/fleet/transit-nodes")
    assert res_all.status_code == 200
    all_data = res_all.json()
    assert all_data["status"] == "success"
    assert len(all_data["nodes"]) == 6
    print(f"  [PASS] GET /fleet/transit-nodes returned {len(all_data['nodes'])} transit nodes.")
    
    # 2. GET /fleet/transit-nodes/NODE_RUDRAPRAYAG
    res_single = client.get("/fleet/transit-nodes/NODE_RUDRAPRAYAG")
    assert res_single.status_code == 200
    single_data = res_single.json()
    assert single_data["node"]["id"] == "NODE_RUDRAPRAYAG"
    print("  [PASS] GET /fleet/transit-nodes/NODE_RUDRAPRAYAG verified.")
    
    # 3. POST /fleet/transit-nodes/NODE_GUPTKASHI/simulate
    res_sim = client.post(
        "/fleet/transit-nodes/NODE_GUPTKASHI/simulate",
        json={"headcount": 720, "passengers_waiting": 35, "expected_incoming": 25, "available_buses": 1}
    )
    assert res_sim.status_code == 200
    sim_data = res_sim.json()
    assert sim_data["node"]["expected_demand"] == 60 # 35 + 25
    assert sim_data["node"]["required_buses"] == 2  # ceil(60 / 36)
    assert sim_data["node"]["shortage_buses"] == 1
    print("  [PASS] POST /fleet/transit-nodes/NODE_GUPTKASHI/simulate verified.")
    
    # 4. POST /fleet/transit-nodes/NODE_GUPTKASHI/dispatch
    res_dispatch = client.post(
        "/fleet/transit-nodes/NODE_GUPTKASHI/dispatch",
        json={"buses": 1}
    )
    assert res_dispatch.status_code == 200
    disp_data = res_dispatch.json()
    assert disp_data["node"]["available_buses"] == 2 # 1 + 1
    assert disp_data["node"]["shortage_buses"] == 0 # Shortage cleared!
    print("  [PASS] POST /fleet/transit-nodes/NODE_GUPTKASHI/dispatch successfully deployed 1 bus and resolved shortage.")


if __name__ == "__main__":
    try:
        test_transit_nodes_registry_and_funnel()
        test_local_fleet_sizing_logic()
        test_yolo_video_ingestion_propagation()
        test_transit_rest_endpoints()
        print("\n=======================================================")
        print("ALL TRANSIT FLOW & REROUTE INTELLIGENCE TESTS PASSED!")
        print("=======================================================")
    except Exception as e:
        print(f"\n[FAIL] Test error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
