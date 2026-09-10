import os
import sys
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("==================================================================")
    print(">>> RUNNING GEOFENCE SAFETY ZONE SCANNER TEST SUITE <<<")
    print("==================================================================")

    # Test 1: Out-of-bounds latitude (expect 422)
    res = client.post("/check-safety", json={"latitude": 95.0, "longitude": 78.0})
    assert res.status_code == 422, f"Expected 422 for lat=95.0, got {res.status_code}: {res.text}"
    print("PASS: Out-of-bounds latitude (95.0) rejected with HTTP 422")

    # Test 2: Out-of-bounds longitude (expect 422)
    res = client.post("/check-safety", json={"latitude": 20.0, "longitude": 200.0})
    assert res.status_code == 422, f"Expected 422 for lon=200.0, got {res.status_code}: {res.text}"
    print("PASS: Out-of-bounds longitude (200.0) rejected with HTTP 422")

    # Test 3: Missing required coordinates (expect 422)
    res = client.post("/check-safety", json={"accuracy": 10.0})
    assert res.status_code == 422, f"Expected 422 for missing coords, got {res.status_code}"
    print("PASS: Missing coordinates rejected with HTTP 422")

    # Test 4: Known safe coordinate (distant from hazard zones, e.g. Hyderabad: 17.3850, 78.4867)
    res = client.post("/check-safety", json={"latitude": 17.3850, "longitude": 78.4867, "accuracy": 12.5})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["status"] == "SAFE", f"Expected status 'SAFE', got {data['status']}"
    assert data["risk_level"] == "SAFE", f"Expected risk_level 'SAFE', got {data['risk_level']}"
    assert data["in_danger_zone"] is False, f"Expected in_danger_zone False, got {data['in_danger_zone']}"
    print("PASS: Distant safe coordinate evaluated genuinely as SAFE with in_danger_zone=False")

    # Test 5: Response contract preserves all required keys
    expected_keys = {"in_danger_zone", "status", "risk_level", "zone_name", "message", "emergency_info", "occupancy_percentage", "distance_meters"}
    missing = expected_keys - set(data.keys())
    assert not missing, f"Missing required response keys: {missing}"
    print(f"PASS: Response contract preserves all required fields: {sorted(list(expected_keys))}")

    # Test 6: Verify High Risk detection when an active hazard or emergency condition exists
    # We test with active emergency reroute on Kedarnath (TS001) near Kedarnath Sanctum (30.7346, 79.0669)
    from routes.safety import save_local_reroute_state, REROUTE_STATE_FILE
    reroute_backup = None
    if os.path.exists(REROUTE_STATE_FILE):
        try:
            with open(REROUTE_STATE_FILE, "r") as f:
                reroute_backup = f.read()
        except Exception as e:
            pass

    try:
        # Simulate active reroute for TS001
        save_local_reroute_state({
            "id": "TEST-REROUTE-001",
            "site_id": "TS001",
            "site_name": "Kedarnath Temple",
            "crowd_status": "CRITICAL",
            "occupancy_percentage": 94.5,
            "status": "ACTIVE"
        })

        res = client.post("/check-safety", json={"latitude": 30.7346, "longitude": 79.0669, "accuracy": 15.0})
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["status"] == "HIGH_RISK", f"Expected status 'HIGH_RISK', got {data['status']}"
        assert data["in_danger_zone"] is True, f"Expected in_danger_zone True, got {data['in_danger_zone']}"
        assert data["risk_level"] == "HIGH", f"Expected risk_level 'HIGH', got {data['risk_level']}"
        assert "Kedarnath Sanctum" in data["zone_name"], f"Expected zone name in response, got {data['zone_name']}"
        print("PASS: High-Risk zone correctly identified during active hazard/reroute with in_danger_zone=True")

    finally:
        # Restore reroute state
        if reroute_backup:
            with open(REROUTE_STATE_FILE, "w") as f:
                f.write(reroute_backup)
        elif os.path.exists(REROUTE_STATE_FILE):
            os.remove(REROUTE_STATE_FILE)

    print("==================================================================")
    print(">>> ALL GEOFENCE SAFETY TESTS PASSED! <<<")
    print("==================================================================")

if __name__ == "__main__":
    run_tests()
