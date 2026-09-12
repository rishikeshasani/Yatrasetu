"""
Comprehensive RBAC & Security Test Suite for Government vs Police Role Separation
Verifies:
1. tourist -> police simulation = 403
2. hotel -> police simulation = 403
3. travel_company -> police simulation = 403
4. government -> police simulation = 403
5. police -> police simulation = 200/201
6. police -> crowd update = 200
7. government -> crowd update = 200
8. police -> permitted operational APIs = 200
9. police -> government-only endpoint (/auth/roles/government-only) = 403
10. government -> police-only SOS dispatch = 403
11. police -> SOS dispatch = 200
12. unauthenticated -> protected endpoints = 401
13. Anti-spoofing: client body role is strictly ignored
"""

import sys
import os
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
from dependencies import get_current_user, AuthenticatedUser

client = TestClient(app)

POLICE_USER = AuthenticatedUser(
    id="p1111111-1111-4111-8111-111111111111",
    email="police_command@yatrasetu.org",
    role="police",
    full_name="Uttarakhand Police & SDRF Command"
)

GOVT_USER = AuthenticatedUser(
    id="cc1da22b-6636-4e35-bd41-95d6eae7ac67",
    email="govt_command@yatrasetu.org",
    role="government",
    full_name="Uttarakhand State Pilgrimage Command Center"
)

TOURIST_USER = AuthenticatedUser(
    id="2fe9818d-6c8d-4a21-a1c3-fa1de280b293",
    email="tourist_demo@yatrasetu.org",
    role="tourist",
    full_name="Saatvik Sharma"
)

HOTEL_USER = AuthenticatedUser(
    id="d5501e41-80b4-411d-843d-b59182e54029",
    email="hotel_partner@yatrasetu.org",
    role="hotel",
    full_name="Kedarnath Himalayan Inn"
)

TRAVEL_USER = AuthenticatedUser(
    id="1c85c66a-e3fd-4b80-94e1-1a19e16aadd9",
    email="travel_planner@yatrasetu.org",
    role="travel_company",
    full_name="Garhwal Divine Expeditions"
)


def test_12_unauthenticated_endpoints_401():
    print("\n--- 1. Testing Unauthenticated Protected Endpoints (Expect 401) ---")
    app.dependency_overrides.clear()

    protected_endpoints = [
        ("POST", "/police/crowd-simulations", {"site_id": "TS001", "event_date": "2026-09-15", "event_time": "14:00", "expected_crowd_increase": 2000}),
        ("GET", "/police/crowd-simulations", None),
        ("POST", "/sos/alert-test-123/dispatch", {"status": "ACKNOWLEDGED", "notes": "Dispatching SDRF"}),
        ("GET", "/auth/roles/police-only", None),
        ("GET", "/auth/roles/government-only", None),
        ("POST", "/crowd/update", {"site_id": "TS001", "people_count": 5000}),
        ("POST", "/alerts/reroute/activate", {"site_id": "TS001", "diverted_tourists": 200}),
        ("POST", "/alerts/reroute/deactivate", {"site_id": "TS001"})
    ]

    for method, path, payload in protected_endpoints:
        if method == "POST":
            res = client.post(path, json=payload)
        else:
            res = client.get(path)
        assert res.status_code == 401, f"Expected 401 for unauthenticated {method} {path}, got {res.status_code}: {res.text}"
        print(f"PASS: Unauthenticated {method} {path} -> 401 Unauthorized")


def test_1_to_4_simulation_blocked_for_non_police():
    print("\n--- 2. Testing Simulation Endpoints Blocked for Non-Police Roles (Expect 403) ---")
    payload = {
        "site_id": "TS001",
        "event_name": "Test Surge",
        "event_date": "2026-09-20",
        "event_time": "10:00",
        "expected_crowd_increase": 3000
    }

    blocked_roles = [
        ("tourist", TOURIST_USER),
        ("hotel", HOTEL_USER),
        ("travel_company", TRAVEL_USER),
        ("government", GOVT_USER)
    ]

    for role_name, user_obj in blocked_roles:
        app.dependency_overrides[get_current_user] = lambda u=user_obj: u
        
        # Test primary police route
        res_post = client.post("/police/crowd-simulations", json=payload)
        assert res_post.status_code == 403, f"Expected 403 for {role_name} on POST /police/crowd-simulations, got {res_post.status_code}: {res_post.text}"
        
        res_get = client.get("/police/crowd-simulations")
        assert res_get.status_code == 403, f"Expected 403 for {role_name} on GET /police/crowd-simulations, got {res_get.status_code}"

        # Test legacy route
        res_legacy = client.get("/government/crowd-simulations")
        assert res_legacy.status_code == 403, f"Expected 403 for {role_name} on legacy GET /government/crowd-simulations, got {res_legacy.status_code}"

        print(f"PASS: Role '{role_name}' strictly blocked from simulation (403 Forbidden)")


def test_5_police_can_access_simulation():
    print("\n--- 3. Testing Police Can Access Police Simulation (Expect 201 & 200) ---")
    app.dependency_overrides[get_current_user] = lambda: POLICE_USER

    payload = {
        "site_id": "TS001",
        "event_name": "Kedar Festival Surge",
        "event_date": "2026-09-22",
        "event_time": "08:00",
        "expected_crowd_increase": 4000,
        "event_duration_hours": 6.0
    }

    mock_db_res = MagicMock()
    mock_db_res.data = [{"id": "sim-mock-123"}]

    with patch("routes.simulations.supabase_admin.table") as mock_table:
        mock_chain = MagicMock()
        mock_chain.insert.return_value.execute.return_value = mock_db_res
        mock_chain.select.return_value.order.return_value.execute.return_value = MagicMock(data=[])
        mock_table.return_value = mock_chain

        # Test POST /police/crowd-simulations -> 201
        res = client.post("/police/crowd-simulations", json=payload)
        assert res.status_code == 201, f"Expected 201 for Police, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["site_id"] == "TS001"
        assert data["expected_crowd_increase"] == 4000
        assert data["simulated_crowd_status"] in ("NORMAL", "MODERATE", "HIGH", "CRITICAL")
        print("PASS: Police created crowd surge simulation successfully (201 Created)")

        # Test GET /police/crowd-simulations -> 200
        res_list = client.get("/police/crowd-simulations")
        assert res_list.status_code == 200, f"Expected 200 for Police, got {res_list.status_code}"
        print("PASS: Police listed crowd surge simulations successfully (200 OK)")


def test_6_and_7_crowd_update_permissions():
    print("\n--- 4. Testing Crowd Update: Government & Police Allowed, Others Blocked ---")
    payload = {"site_id": "TS001", "people_count": 8500, "queue_length": 150}

    # 1. Police can update crowd -> 200
    app.dependency_overrides[get_current_user] = lambda: POLICE_USER
    res_police = client.post("/crowd/update", json=payload)
    assert res_police.status_code == 200, f"Expected 200 for Police on /crowd/update, got {res_police.status_code}"
    print("PASS: Police authorized to execute POST /crowd/update (200 OK)")

    # 2. Government can update crowd -> 200
    app.dependency_overrides[get_current_user] = lambda: GOVT_USER
    res_govt = client.post("/crowd/update", json=payload)
    assert res_govt.status_code == 200, f"Expected 200 for Government on /crowd/update, got {res_govt.status_code}"
    print("PASS: Government authorized to execute POST /crowd/update (200 OK)")

    # 3. Tourist, Hotel, Travel blocked -> 403
    for u in [TOURIST_USER, HOTEL_USER, TRAVEL_USER]:
        app.dependency_overrides[get_current_user] = lambda user=u: user
        res_blocked = client.post("/crowd/update", json=payload)
        assert res_blocked.status_code == 403, f"Expected 403 for {u.role} on /crowd/update, got {res_blocked.status_code}"
        print(f"PASS: Role '{u.role}' blocked from POST /crowd/update (403 Forbidden)")


def test_8_police_shared_operational_apis():
    print("\n--- 5. Testing Police Access to Permitted Shared Operational APIs (Expect 200) ---")
    app.dependency_overrides[get_current_user] = lambda: POLICE_USER

    # 1. Sites metadata & density
    res = client.get("/sites")
    assert res.status_code == 200
    res = client.get("/sites/TS001/density")
    assert res.status_code == 200
    res = client.get("/sites/TS001/prediction")
    assert res.status_code == 200
    res = client.get("/sites/TS001/alternatives")
    assert res.status_code == 200
    res = client.get("/sites/TS001/safety-info")
    assert res.status_code == 200
    res = client.get("/alerts/reroute")
    assert res.status_code == 200
    res = client.get("/alerts")
    assert res.status_code == 200
    res = client.get("/sos/active")
    assert res.status_code == 200

    # 2. Reroute activation by Police
    reroute_payload = {"site_id": "TS001", "diverted_tourists": 150, "partner_buses": 5}
    with patch("routes.safety.supabase_admin.table") as mock_table:
        mock_chain = MagicMock()
        mock_chain.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_chain.insert.return_value.execute.return_value = MagicMock(data=[{"id": "reroute-mock"}])
        mock_table.return_value = mock_chain

        res = client.post("/alerts/reroute/activate", json=reroute_payload)
        assert res.status_code == 200
        assert res.json()["status"] == "success"

    print("PASS: Police can access all permitted shared operational APIs (200 OK)")


def test_9_police_blocked_from_government_only():
    print("\n--- 6. Testing Police Blocked from Government-Only Endpoints (Expect 403) ---")
    app.dependency_overrides[get_current_user] = lambda: POLICE_USER

    res = client.get("/auth/roles/government-only")
    assert res.status_code == 403, f"Expected 403 for Police on /auth/roles/government-only, got {res.status_code}"
    print("PASS: Police blocked from /auth/roles/government-only (403 Forbidden)")

    # Government can access government-only
    app.dependency_overrides[get_current_user] = lambda: GOVT_USER
    res_gov = client.get("/auth/roles/government-only")
    assert res_gov.status_code == 200
    print("PASS: Government authorized for /auth/roles/government-only (200 OK)")


def test_10_and_11_sos_dispatch_police_only():
    print("\n--- 7. Testing SOS Dispatch: Police Only, Government & Others Blocked ---")
    dispatch_payload = {"status": "ACKNOWLEDGED", "notes": "SDRF team deployed to sector 4"}

    # 1. Government tries to dispatch -> 403 Forbidden
    app.dependency_overrides[get_current_user] = lambda: GOVT_USER
    res_gov = client.post("/sos/alert-mock-123/dispatch", json=dispatch_payload)
    assert res_gov.status_code == 403, f"Expected 403 for Government dispatch, got {res_gov.status_code}: {res_gov.text}"
    print("PASS: Government strictly blocked from SOS tactical dispatch (403 Forbidden)")

    # 2. Tourist, Hotel, Travel Company try to dispatch -> 403 Forbidden
    for u in [TOURIST_USER, HOTEL_USER, TRAVEL_USER]:
        app.dependency_overrides[get_current_user] = lambda user=u: user
        res_blocked = client.post("/sos/alert-mock-123/dispatch", json=dispatch_payload)
        assert res_blocked.status_code == 403
        print(f"PASS: Role '{u.role}' blocked from SOS tactical dispatch (403 Forbidden)")

    # 3. Police dispatches SOS -> 200 OK
    app.dependency_overrides[get_current_user] = lambda: POLICE_USER
    with patch("routes.safety.supabase_admin.table") as mock_table:
        mock_chain = MagicMock()
        mock_chain.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "alert-mock-123", "status": "ACKNOWLEDGED"}]
        )
        mock_table.return_value = mock_chain

        res_police = client.post("/sos/alert-mock-123/dispatch", json=dispatch_payload)
        assert res_police.status_code == 200, f"Expected 200 for Police dispatch, got {res_police.status_code}: {res_police.text}"
        assert res_police.json()["sos_status"] == "ACKNOWLEDGED"
        print("PASS: Police authorized to execute tactical SOS dispatch (200 OK)")


def test_13_anti_spoofing():
    print("\n--- 8. Testing Anti-Spoofing: Client Body Role Is Strictly Ignored ---")
    # Tourist sends payload claiming to be police
    app.dependency_overrides[get_current_user] = lambda: TOURIST_USER
    res = client.post("/police/crowd-simulations", json={
        "site_id": "TS001",
        "event_date": "2026-09-25",
        "event_time": "12:00",
        "expected_crowd_increase": 1000,
        "role": "police"  # spoof attempt in body
    })
    assert res.status_code == 403
    print("PASS: Spoofed 'role: police' in request body rejected (403 Forbidden)")


def test_government_subrole_rbac():
    print("\n--- 9. Testing Government Subrole Classifications (police_official vs government_official) ---")
    gov_police_user = AuthenticatedUser(
        id="gov-police-123",
        email="police_subrole@yatrasetu.org",
        role="government",
        government_subrole="police_official",
        full_name="SP Field Operations Command"
    )
    gov_civil_user = AuthenticatedUser(
        id="gov-civil-123",
        email="civil_subrole@yatrasetu.org",
        role="government",
        government_subrole="government_official",
        full_name="District Magistrate Office"
    )

    # 1. gov with police_official CAN access simulation
    app.dependency_overrides[get_current_user] = lambda: gov_police_user
    with patch("routes.simulations.supabase_admin.table") as mock_table:
        mock_chain = MagicMock()
        mock_chain.select.return_value.order.return_value.execute.return_value = MagicMock(data=[])
        mock_table.return_value = mock_chain
        res = client.get("/police/crowd-simulations")
        assert res.status_code == 200, f"Expected 200 for gov/police_official, got {res.status_code}"
        print("PASS: Government with police_official classification can access /police/crowd-simulations (200 OK)")

    # 2. gov with government_official CANNOT access simulation (403)
    app.dependency_overrides[get_current_user] = lambda: gov_civil_user
    res = client.get("/police/crowd-simulations")
    assert res.status_code == 403, f"Expected 403 for gov/government_official on simulation, got {res.status_code}"
    print("PASS: Government with government_official classification is blocked from simulation (403 Forbidden)")

    # 3. gov with government_official CAN access civil administration endpoint
    res_gov_only = client.get("/auth/roles/government-only")
    assert res_gov_only.status_code == 200, f"Expected 200 for gov/government_official on /auth/roles/government-only, got {res_gov_only.status_code}"
    print("PASS: Government with government_official classification can access /auth/roles/government-only (200 OK)")

    # 4. gov with police_official CAN access /auth/roles/police-only
    app.dependency_overrides[get_current_user] = lambda: gov_police_user
    res = client.get("/auth/roles/police-only")
    assert res.status_code == 200, f"Expected 200 for gov/police_official on /auth/roles/police-only, got {res.status_code}"
    print("PASS: Government with police_official classification can access /auth/roles/police-only (200 OK)")

    # 5. gov with government_official CANNOT access /auth/roles/police-only (403)
    app.dependency_overrides[get_current_user] = lambda: gov_civil_user
    res = client.get("/auth/roles/police-only")
    assert res.status_code == 403, f"Expected 403 for gov/government_official on /auth/roles/police-only, got {res.status_code}"
    print("PASS: Government with government_official classification is blocked from /auth/roles/police-only (403 Forbidden)")

    # 6. gov with police_official CAN access SOS tactical dispatch
    app.dependency_overrides[get_current_user] = lambda: gov_police_user
    with patch("routes.safety.supabase_admin.table") as mock_table:
        mock_chain = MagicMock()
        mock_chain.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{"id": "sos-test"}])
        mock_table.return_value = mock_chain
        res = client.post("/sos/sos-test/dispatch", json={"status": "ACKNOWLEDGED", "notes": "PCR-07 En route"})
        assert res.status_code == 200, f"Expected 200 for gov/police_official on SOS dispatch, got {res.status_code}"
        print("PASS: Government with police_official classification can dispatch SOS (200 OK)")

    # 7. gov with government_official CANNOT access SOS tactical dispatch (403)
    app.dependency_overrides[get_current_user] = lambda: gov_civil_user
    res_sos_gov = client.post("/sos/sos-test/dispatch", json={"status": "ACKNOWLEDGED", "notes": "Civil admin attempt"})
    assert res_sos_gov.status_code == 403, f"Expected 403 for gov/government_official on SOS dispatch, got {res_sos_gov.status_code}"
    print("PASS: Government with government_official classification is blocked from SOS tactical dispatch (403 Forbidden)")


if __name__ == "__main__":
    print("==================================================================")
    print(">>> RUNNING POLICE VS GOVERNMENT RBAC SECURITY TEST SUITE <<<")
    print("==================================================================")
    test_12_unauthenticated_endpoints_401()
    test_1_to_4_simulation_blocked_for_non_police()
    test_5_police_can_access_simulation()
    test_6_and_7_crowd_update_permissions()
    test_8_police_shared_operational_apis()
    test_9_police_blocked_from_government_only()
    test_10_and_11_sos_dispatch_police_only()
    test_13_anti_spoofing()
    test_government_subrole_rbac()
    print("\n=======================================================")
    print(">>> ALL 9 RBAC SECURITY TEST MODULES PASSED 100%! <<<")
    print("=======================================================")
