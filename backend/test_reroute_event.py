"""
Automated Test Suite for Government Emergency Reroute Event
Verifies:
1. 401 Unauthorized on unauthenticated requests
2. 403 Forbidden for non-government roles (RBAC enforcement)
3. Anti-spoofing verification (request body role ignored)
4. Dynamic site_id validation against public.sites (404 for invalid, 200 for dynamic shrines)
5. Cross-dashboard event distribution to Travel & Hotel dashboards (GET /alerts/reroute)
6. Sister shrine alternative route recommendations integration
7. Lifecycle deactivation by Government and state synchronization
"""

from fastapi.testclient import TestClient
from main import app
from dependencies import get_current_user, AuthenticatedUser
from database import supabase

client = TestClient(app)

def test_unauthenticated_reroute():
    print("\n--- 1. Testing Unauthenticated Emergency Reroute Endpoints (Expect 401) ---")
    
    # Activate without auth header
    res = client.post("/alerts/reroute/activate", json={"site_id": "TS001"})
    assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"
    print("PASS: POST /alerts/reroute/activate without token rejected (401 Unauthorized)")

    # Deactivate without auth header
    res = client.post("/alerts/reroute/deactivate", json={"site_id": "TS001"})
    assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"
    print("PASS: POST /alerts/reroute/deactivate without token rejected (401 Unauthorized)")


def test_rbac_non_government_roles_blocked():
    print("\n--- 2. Testing RBAC: Non-Government Roles Blocked (Expect 403) ---")

    non_govt_roles = [
        ("tourist", "usr_tourist_test"),
        ("hotel", "usr_hotel_test"),
        ("travel_company", "usr_travel_test")
    ]

    for role, uid in non_govt_roles:
        test_user = AuthenticatedUser(
            id=uid,
            email=f"{role}@yatrasetu.org",
            role=role,
            full_name=f"Test {role.title()}"
        )
        app.dependency_overrides[get_current_user] = lambda u=test_user: u

        # Test activate
        res = client.post("/alerts/reroute/activate", json={"site_id": "TS001"})
        assert res.status_code == 403, f"Expected 403 for {role} activating reroute, got {res.status_code}"
        print(f"PASS [{role}]: Blocked from POST /alerts/reroute/activate (403 Forbidden)")

        # Test deactivate
        res = client.post("/alerts/reroute/deactivate", json={"site_id": "TS001"})
        assert res.status_code == 403, f"Expected 403 for {role} deactivating reroute, got {res.status_code}"
        print(f"PASS [{role}]: Blocked from POST /alerts/reroute/deactivate (403 Forbidden)")

    # Test Anti-spoofing: Tourist role sends body with "role": "government"
    spoof_user = AuthenticatedUser(
        id="usr_attacker",
        email="attacker@fake.com",
        role="tourist",
        full_name="Attacker"
    )
    app.dependency_overrides[get_current_user] = lambda: spoof_user
    res = client.post("/alerts/reroute/activate", json={
        "site_id": "TS001",
        "role": "government"  # Attempting payload spoof
    })
    assert res.status_code == 403, f"Expected 403 for spoofed role, got {res.status_code}"
    print("PASS: Spoofed 'role: government' in payload rejected (403 Forbidden)")

    app.dependency_overrides.clear()


def test_dynamic_site_validation():
    print("\n--- 3. Testing Dynamic site_id Validation (No Hardcoding) ---")

    govt_user = AuthenticatedUser(
        id="usr_govt_command",
        email="command@yatrasetu.org",
        role="government",
        full_name="District Magistrate Rudraprayag"
    )
    app.dependency_overrides[get_current_user] = lambda: govt_user

    # Invalid site_id -> 404
    res = client.post("/alerts/reroute/activate", json={"site_id": "NON_EXISTENT_SITE_XYZ"})
    assert res.status_code == 404, f"Expected 404 for invalid site, got {res.status_code}"
    print("PASS: POST /alerts/reroute/activate with invalid site rejected (404 Not Found)")

    # Valid site_id TS001 -> 200
    res_ts001 = client.post("/alerts/reroute/activate", json={
        "site_id": "TS001",
        "diverted_tourists": 350,
        "partner_buses": 14,
        "partner_hotels": 22
    })
    assert res_ts001.status_code == 200, f"Expected 200 for TS001, got {res_ts001.status_code}: {res_ts001.text}"
    body_ts001 = res_ts001.json()
    assert body_ts001["status"] == "success"
    assert body_ts001["is_active"] is True
    assert body_ts001["alert"]["site_id"] == "TS001"
    assert body_ts001["alert"]["partner_buses"] == 14
    assert body_ts001["alert"]["partner_hotels"] == 22
    assert body_ts001["alert"]["diverted_tourists"] == 350
    print("PASS: Dynamic activation for TS001 succeeded with verified telemetry and parameters")

    # Valid alternative site_id TS002 -> 200 (Proves non-hardcoded dynamic support!)
    res_ts002 = client.post("/alerts/reroute/activate", json={
        "site_id": "TS002",
        "diverted_tourists": 280,
        "partner_buses": 10,
        "partner_hotels": 18
    })
    assert res_ts002.status_code == 200, f"Expected 200 for TS002, got {res_ts002.status_code}: {res_ts002.text}"
    body_ts002 = res_ts002.json()
    assert body_ts002["alert"]["site_id"] == "TS002"
    print("PASS: Dynamic activation for TS002 succeeded, proving dynamic site capability (No hardcoded TS001)")

    # Re-activate TS001 for subsequent cross-dashboard and sister shrine tests
    client.post("/alerts/reroute/activate", json={
        "site_id": "TS001",
        "diverted_tourists": 350,
        "partner_buses": 14,
        "partner_hotels": 22,
        "notes": "Emergency diversion active for Kedarnath corridor."
    })

    app.dependency_overrides.clear()


def test_cross_dashboard_read_access():
    print("\n--- 4. Testing Cross-Dashboard Read Access for Travel, Hotel & Tourist ---")

    # Public/Unauthenticated dashboard polling GET /alerts/reroute
    res = client.get("/alerts/reroute")
    assert res.status_code == 200
    data = res.json()
    assert data["is_active"] is True, "Active reroute should be visible to public dashboard polling"
    alert = data["alert"]
    assert alert["site_id"] == "TS001"
    assert alert["status"] == "ACTIVE"
    assert alert["partner_buses"] == 14
    assert alert["partner_hotels"] == 22
    assert alert["diverted_tourists"] == 350
    print("PASS: GET /alerts/reroute returns active alert to client polling")

    # Sister shrine recommendations populated
    assert "alternative_routes" in alert
    assert isinstance(alert["alternative_routes"], list)
    print(f"PASS: Sister shrine recommendations populated ({len(alert['alternative_routes'])} alternatives returned)")

    # Test GET /alerts endpoint integration
    res_alerts = client.get("/alerts")
    assert res_alerts.status_code == 200
    alerts_data = res_alerts.json()
    assert isinstance(alerts_data, list), "GET /alerts must return a list of active alerts"
    has_reroute_banner = any(a.get("alert_type") == "EMERGENCY_REROUTE" for a in alerts_data)
    assert has_reroute_banner, "Active reroute must appear in national /alerts feed"
    print("PASS: Active emergency reroute successfully included in national GET /alerts feed")


def test_deactivation_lifecycle():
    print("\n--- 5. Testing Deactivation Lifecycle by Government ---")

    govt_user = AuthenticatedUser(
        id="usr_govt_command",
        email="command@yatrasetu.org",
        role="government",
        full_name="District Magistrate Rudraprayag"
    )
    app.dependency_overrides[get_current_user] = lambda: govt_user

    # Deactivate
    res = client.post("/alerts/reroute/deactivate", json={"site_id": "TS001", "reason": "Congestion mitigated"})
    assert res.status_code == 200
    assert res.json()["is_active"] is False
    print("PASS: POST /alerts/reroute/deactivate succeeded (200 OK)")

    app.dependency_overrides.clear()

    # Verify subsequent GET /alerts/reroute returns is_active=False
    res_check = client.get("/alerts/reroute")
    assert res_check.status_code == 200
    assert res_check.json()["is_active"] is False
    assert res_check.json()["alert"] is None
    print("PASS: GET /alerts/reroute reflects deactivated state (is_active: False, alert: None)")


if __name__ == "__main__":
    print("Running Government Emergency Reroute Automated Test Suite...")
    test_unauthenticated_reroute()
    test_rbac_non_government_roles_blocked()
    test_dynamic_site_validation()
    test_cross_dashboard_read_access()
    test_deactivation_lifecycle()
    print("\n========================================================")
    print(" ALL EMERGENCY REROUTE TESTS PASSED SUCCESSFULLY! ")
    print("========================================================")
