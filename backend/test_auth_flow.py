from fastapi.testclient import TestClient
from main import app
from dependencies import get_current_user, AuthenticatedUser
from database import supabase

client = TestClient(app)

def test_unauthenticated_requests():
    print("\n--- 1. Testing Unauthenticated Protected Endpoints (Expect 401) ---")
    protected_endpoints = [
        ("GET", "/auth/me", {}),
        ("GET", "/auth/roles/government-only", {}),
        ("GET", "/auth/roles/hotel-only", {}),
        ("GET", "/auth/roles/travel-company-only", {}),
        ("GET", "/auth/roles/tourist-only", {}),
        ("POST", "/crowd/update", {"site_id": "TS001", "people_count": 50}),
        ("POST", "/wallet/reward", {"user_id": "usr_test", "points": 10, "reason": "Test"}),
    ]

    for method, path, payload in protected_endpoints:
        if method == "GET":
            res = client.get(path)
        else:
            res = client.post(path, json=payload)
        assert res.status_code == 401, f"Expected 401 for unauthenticated {path}, got {res.status_code}: {res.text}"
        assert "Authorization header" in res.json()["detail"] or "unauthorized" in res.json()["detail"].lower()
        print(f"PASS: {method} {path} correctly rejected with 401 without token")

    # Test invalid token format & malformed token
    res = client.get("/auth/me", headers={"Authorization": "Bearer bad_invalid_token_123"})
    assert res.status_code == 401, f"Expected 401 for invalid token, got {res.status_code}"
    print("PASS: GET /auth/me correctly rejected with 401 for invalid JWT")


def test_role_based_access_control():
    print("\n--- 2. Testing Role-Based Authorization (403 Forbidden vs 200 OK) ---")
    
    # 2a. Test as TOURIST
    tourist_user = AuthenticatedUser(
        id="usr_tourist_123",
        email="tourist@yatrasetu.org",
        role="tourist",
        full_name="Raj Tourist",
        created_at="2026-09-04T00:00:00Z"
    )
    app.dependency_overrides[get_current_user] = lambda: tourist_user

    # Tourist accesses tourist endpoint -> 200
    res = client.get("/auth/roles/tourist-only")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    print("PASS [tourist]: Can access /auth/roles/tourist-only (200 OK)")

    # Tourist accesses /auth/me -> 200
    res = client.get("/auth/me")
    assert res.status_code == 200
    assert res.json()["role"] == "tourist"
    print("PASS [tourist]: Can access /auth/me (200 OK)")

    # Tourist tries to access government endpoint -> 403 Forbidden
    res = client.get("/auth/roles/government-only")
    assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
    assert "not authorized" in res.json()["detail"].lower()
    print("PASS [tourist]: Blocked from /auth/roles/government-only (403 Forbidden)")

    # Tourist tries to access hotel endpoint -> 403 Forbidden
    res = client.get("/auth/roles/hotel-only")
    assert res.status_code == 403
    print("PASS [tourist]: Blocked from /auth/roles/hotel-only (403 Forbidden)")

    # Tourist tries to access travel company endpoint -> 403 Forbidden
    res = client.get("/auth/roles/travel-company-only")
    assert res.status_code == 403
    print("PASS [tourist]: Blocked from /auth/roles/travel-company-only (403 Forbidden)")

    # Tourist tries to update crowd count -> 403 Forbidden
    res = client.post("/crowd/update", json={"site_id": "TS001", "people_count": 50})
    assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
    print("PASS [tourist]: Blocked from sensitive POST /crowd/update (403 Forbidden)")

    # Tourist tries to reward points -> 403 Forbidden
    res = client.post("/wallet/reward", json={"user_id": "usr_test", "points": 100, "reason": "Self Reward"})
    assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
    print("PASS [tourist]: Blocked from sensitive POST /wallet/reward (403 Forbidden)")


    # 2b. Test as GOVERNMENT
    gov_user = AuthenticatedUser(
        id="usr_gov_456",
        email="officer@tourism.gov.in",
        role="government",
        full_name="District Officer",
        created_at="2026-09-04T00:00:00Z"
    )
    app.dependency_overrides[get_current_user] = lambda: gov_user

    # Government accesses government endpoint -> 200
    res = client.get("/auth/roles/government-only")
    assert res.status_code == 200
    assert res.json()["role"] == "government"
    print("PASS [government]: Can access /auth/roles/government-only (200 OK)")

    # Government executes POST /crowd/update -> 200
    res = client.post("/crowd/update", json={"site_id": "TS001", "people_count": 120, "queue_length": 5})
    assert res.status_code == 200
    assert res.json()["status"] in ["NORMAL", "MODERATE", "HIGH", "CRITICAL"]
    print("PASS [government]: Can execute POST /crowd/update (200 OK)")

    # Government awards reward points -> 200
    res = client.post("/wallet/reward", json={"user_id": "usr_tourist_123", "points": 25, "reason": "Civic Participation"})
    assert res.status_code == 200
    assert res.json()["status"] == "success"
    print("PASS [government]: Can execute POST /wallet/reward (200 OK)")

    # Government tries to access hotel-only endpoint -> 403 Forbidden
    res = client.get("/auth/roles/hotel-only")
    assert res.status_code == 403
    print("PASS [government]: Blocked from /auth/roles/hotel-only (403 Forbidden)")


    # 2c. Test as HOTEL
    hotel_user = AuthenticatedUser(
        id="usr_hotel_789",
        email="manager@himalayanresort.com",
        role="hotel",
        full_name="Hotel Manager",
        created_at="2026-09-04T00:00:00Z"
    )
    app.dependency_overrides[get_current_user] = lambda: hotel_user

    # Hotel accesses hotel endpoint -> 200
    res = client.get("/auth/roles/hotel-only")
    assert res.status_code == 200
    print("PASS [hotel]: Can access /auth/roles/hotel-only (200 OK)")

    # Hotel awards wallet points -> 200
    res = client.post("/wallet/reward", json={"user_id": "usr_tourist_123", "points": 50, "reason": "Hotel Check-in"})
    assert res.status_code == 200
    print("PASS [hotel]: Can execute POST /wallet/reward (200 OK)")

    # Hotel tries to access government endpoint -> 403 Forbidden
    res = client.get("/auth/roles/government-only")
    assert res.status_code == 403
    print("PASS [hotel]: Blocked from /auth/roles/government-only (403 Forbidden)")

    # Hotel tries to update official crowd count -> 403 Forbidden
    res = client.post("/crowd/update", json={"site_id": "TS001", "people_count": 100})
    assert res.status_code == 403
    print("PASS [hotel]: Blocked from POST /crowd/update (403 Forbidden)")


    # 2d. Test as TRAVEL_COMPANY
    travel_user = AuthenticatedUser(
        id="usr_travel_321",
        email="operator@yatra-tours.in",
        role="travel_company",
        full_name="Tour Coordinator",
        created_at="2026-09-04T00:00:00Z"
    )
    app.dependency_overrides[get_current_user] = lambda: travel_user

    # Travel company accesses travel endpoint -> 200
    res = client.get("/auth/roles/travel-company-only")
    assert res.status_code == 200
    print("PASS [travel_company]: Can access /auth/roles/travel-company-only (200 OK)")

    # Travel company awards wallet points -> 200
    res = client.post("/wallet/reward", json={"user_id": "usr_tourist_123", "points": 30, "reason": "Eco Trek Tour"})
    assert res.status_code == 200
    print("PASS [travel_company]: Can execute POST /wallet/reward (200 OK)")

    # Travel company tries to update crowd count -> 403 Forbidden
    res = client.post("/crowd/update", json={"site_id": "TS001", "people_count": 100})
    assert res.status_code == 403
    print("PASS [travel_company]: Blocked from POST /crowd/update (403 Forbidden)")

    # Clear overrides for real dependency testing
    app.dependency_overrides.clear()


def test_anti_spoofing():
    print("\n--- 3. Testing Anti-Spoofing: Client Body Role Is NEVER Trusted ---")
    # Even if a client sends "role": "government" in request payload or query,
    # the backend authorization relies solely on the verified user profile
    fake_user = AuthenticatedUser(
        id="usr_spoof_attempt",
        email="attacker@fake.com",
        role="tourist",  # Verified profile role
        full_name="Attacker"
    )
    app.dependency_overrides[get_current_user] = lambda: fake_user

    res = client.post("/crowd/update", json={
        "site_id": "TS001",
        "people_count": 9999,
        "role": "government"  # Attempting to spoof role in request payload
    })
    assert res.status_code == 403, f"Expected 403, got {res.status_code}"
    print("PASS: Spoofed 'role: government' in payload rejected (403 Forbidden)")

    app.dependency_overrides.clear()


def test_existing_public_endpoints():
    print("\n--- 4. Testing Public Endpoints Accessibility (Regression Safety) ---")
    public_tests = [
        ("GET", "/"),
        ("GET", "/test-db"),
        ("GET", "/sites"),
        ("GET", "/sites/TS001/density"),
        ("GET", "/sites/TS001/prediction"),
        ("GET", "/sites/TS001/crowd-forecast"),
        ("GET", "/sites/TS001/alternatives"),
        ("GET", "/alerts"),
        ("GET", "/vendors"),
        ("GET", "/vendors/TS001"),
        ("GET", "/wallet/pilgrim_demo_user"),
    ]

    for method, path in public_tests:
        res = client.get(path)
        assert res.status_code == 200, f"Expected 200 for public {path}, got {res.status_code}"
        print(f"PASS: Public endpoint {path} -> 200 OK (no token required)")


def test_database_profiles_integration():
    print("\n--- 5. Verifying Database public.profiles Schema & Client Reuse ---")
    res = supabase.table("profiles").select("id, full_name, role, created_at").limit(5).execute()
    assert res.data is not None
    print(f"PASS: Queried public.profiles using existing Supabase client. Sample rows: {len(res.data)}")
    for r in res.data:
        assert "id" in r and "role" in r and "full_name" in r and "created_at" in r
        print(f"      Profile: id={r['id']}, role={r['role']}, name={r['full_name']}")


if __name__ == "__main__":
    test_unauthenticated_requests()
    test_role_based_access_control()
    test_anti_spoofing()
    test_existing_public_endpoints()
    test_database_profiles_integration()
    print("\n=======================================================")
    print(">>> ALL ROLE-BASED AUTHORIZATION TESTS PASSED 100%! <<<")
    print("=======================================================")
