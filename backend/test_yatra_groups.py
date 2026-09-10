import json
import urllib.request
import urllib.error
import sys

API_URL = "http://127.0.0.1:8000"

TOURIST_A_EMAIL = "tourist_demo@yatrasetu.org"
TOURIST_B_EMAIL = "user_a_tourist@yatrasetu.org"
HOTEL_EMAIL = "hotel_partner@yatrasetu.org"
PASSWORD = "DemoPassword123!"

def api_request(path, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(f"{API_URL}{path}", data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            res_body = res.read().decode("utf-8")
            return res.getcode(), json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"detail": err_body}

def run_tests():
    print("=" * 80)
    print("RUNNING YATRASETU 'MY YATRA TEAM' BACKEND TEST SUITE")
    print("=" * 80)

    # 1. Login Accounts
    _, a_login = api_request("/auth/login", method="POST", data={"email": TOURIST_A_EMAIL, "password": PASSWORD})
    token_a = a_login.get("access_token")
    user_a = a_login.get("user")
    print(f"Tourist A login: {TOURIST_A_EMAIL} -> {user_a.get('id')}")

    _, b_login = api_request("/auth/login", method="POST", data={"email": TOURIST_B_EMAIL, "password": PASSWORD})
    token_b = b_login.get("access_token")
    user_b = b_login.get("user")
    print(f"Tourist B login: {TOURIST_B_EMAIL} -> {user_b.get('id')}")

    _, h_login = api_request("/auth/login", method="POST", data={"email": HOTEL_EMAIL, "password": PASSWORD})
    token_h = h_login.get("access_token")
    print(f"Hotel login: {HOTEL_EMAIL}")

    assert token_a and token_b and token_h, "All tokens must be obtained"

    # Reset any existing group memberships for clean test
    my_a_code, my_a_data = api_request("/yatra-groups/my", token=token_a)
    if my_a_code == 200 and my_a_data.get("has_group"):
        grp_id = my_a_data["group"]["id"]
        api_request(f"/yatra-groups/{grp_id}/leave", method="POST", token=token_a)
        print(f"Cleaned prior group for Tourist A: {grp_id}")

    my_b_code, my_b_data = api_request("/yatra-groups/my", token=token_b)
    if my_b_code == 200 and my_b_data.get("has_group"):
        grp_id = my_b_data["group"]["id"]
        api_request(f"/yatra-groups/{grp_id}/leave", method="POST", token=token_b)
        print(f"Cleaned prior group for Tourist B: {grp_id}")

    # Test 1: Unauthenticated Create Group
    code, _ = api_request("/yatra-groups", method="POST", data={"group_name": "Test Group", "site_id": "TS001", "site_name": "Kedarnath", "yatra_date": "2026-10-01"})
    print(f"[TEST 1] Unauthenticated create group: HTTP {code} (Expected 401)")
    assert code == 401, f"Expected 401, got {code}"

    # Test 2: Non-tourist role blocked (Hotel partner)
    code, _ = api_request("/yatra-groups", method="POST", data={"group_name": "Hotel Group", "site_id": "TS001", "site_name": "Kedarnath", "yatra_date": "2026-10-01"}, token=token_h)
    print(f"[TEST 2] Hotel role create group: HTTP {code} (Expected 403)")
    assert code == 403, f"Expected 403, got {code}"

    # Test 3: Tourist A creates "Kedarnath Family Yatra"
    create_payload = {
        "group_name": "Kedarnath Family Yatra",
        "site_id": "TS001",
        "site_name": "Kedarnath Temple",
        "yatra_date": "2026-10-15"
    }
    code, group_res = api_request("/yatra-groups", method="POST", data=create_payload, token=token_a)
    print(f"[TEST 3] Tourist A creates group: HTTP {code}")
    assert code == 200, f"Expected 200, got {code}: {group_res}"
    group_id = group_res["id"]
    join_code = group_res["join_code"]
    print(f"  Created Group ID: {group_id}, Join Code: {join_code}")
    assert len(join_code) >= 6, "Join code must be valid"
    assert group_res["user_role"] == "ADMIN", "Creator must be ADMIN"
    assert group_res["member_count"] == 1, "Member count must be 1"

    # Test 4: Tourist A queries My Group
    code, my_res = api_request("/yatra-groups/my", token=token_a)
    print(f"[TEST 4] Tourist A queries /yatra-groups/my: HTTP {code}")
    assert code == 200 and my_res["has_group"] is True, "Must have active group"
    assert my_res["group"]["id"] == group_id, "Group ID must match"

    # Test 5: Join with Invalid Code
    code, inv_res = api_request("/yatra-groups/join", method="POST", data={"join_code": "INVALID99"}, token=token_b)
    print(f"[TEST 5] Join with invalid code: HTTP {code} (Expected 404)")
    assert code == 404, f"Expected 404, got {code}"

    # Test 6: Tourist B joins with valid join code
    code, join_res = api_request("/yatra-groups/join", method="POST", data={"join_code": join_code}, token=token_b)
    print(f"[TEST 6] Tourist B joins group: HTTP {code}")
    assert code == 200, f"Expected 200, got {code}: {join_res}"
    assert join_res["user_role"] == "MEMBER", "Joiner role must be MEMBER"
    assert join_res["member_count"] == 2, "Member count must now be 2"

    # Test 7: Prevent Duplicate Membership
    code, dup_res = api_request("/yatra-groups/join", method="POST", data={"join_code": join_code}, token=token_b)
    print(f"[TEST 7] Duplicate join attempt: HTTP {code} (Expected 400)")
    assert code == 400, f"Expected 400, got {code}"

    # Test 8: Tourist A updates live location (Opt-in)
    loc_payload = {"latitude": 30.7352, "longitude": 79.0669, "accuracy": 5.0}
    code, loc_res = api_request(f"/yatra-groups/{group_id}/location", method="POST", data=loc_payload, token=token_a)
    print(f"[TEST 8] Tourist A location update: HTTP {code}")
    assert code == 200, f"Expected 200, got {code}"

    # Test 9: Tourist B queries group locations
    code, locs = api_request(f"/yatra-groups/{group_id}/locations", token=token_b)
    print(f"[TEST 9] Tourist B queries locations: HTTP {code}, count: {len(locs)}")
    assert code == 200 and len(locs) >= 1, "Must return Tourist A location"
    assert locs[0]["is_live"] is True, "Recent location must be marked is_live=True"

    # Test 10: Tourist B triggers Group Distress Alert
    alert_payload = {"alert_type": "MEDICAL", "message": "High-altitude breathlessness near base camp."}
    code, alert_res = api_request(f"/yatra-groups/{group_id}/alerts", method="POST", data=alert_payload, token=token_b)
    print(f"[TEST 10] Tourist B triggers distress alert: HTTP {code}")
    assert code == 200, f"Expected 200, got {code}"
    alert_id = alert_res["id"]
    assert alert_res["status"] == "ACTIVE"

    # Test 11: Tourist A sees active alert on My Group
    code, my_a_res = api_request("/yatra-groups/my", token=token_a)
    assert my_a_res["group"]["active_alert"] is not None, "Tourist A must see active alert"
    assert my_a_res["group"]["active_alert"]["id"] == alert_id
    print(f"[TEST 11] Tourist A perceives active alert from Tourist B: PASS")

    # Test 12: Tourist B (non-admin) tries to remove Tourist A -> 403 Forbidden
    member_a_id = next(m["id"] for m in my_a_res["group"]["members"] if m["user_id"] == user_a["id"])
    code, _ = api_request(f"/yatra-groups/{group_id}/members/{member_a_id}", method="DELETE", token=token_b)
    print(f"[TEST 12] Non-admin member removal attempt: HTTP {code} (Expected 403)")
    assert code == 403, f"Expected 403, got {code}"

    # Test 13: Tourist A (Admin) resolves distress alert
    code, res_alert = api_request(f"/yatra-groups/{group_id}/alerts/{alert_id}/resolve", method="POST", token=token_a)
    print(f"[TEST 13] Admin resolves alert: HTTP {code}")
    assert code == 200 and res_alert["status"] == "RESOLVED"

    # Test 14: Disable location sharing for Tourist A
    code, dis_res = api_request(f"/yatra-groups/{group_id}/location-sharing", method="DELETE", token=token_a)
    print(f"[TEST 14] Tourist A disables location sharing: HTTP {code}")
    assert code == 200

    # Verify Tourist A no longer appears in live locations
    _, locs_after = api_request(f"/yatra-groups/{group_id}/locations", token=token_b)
    assert len(locs_after) == 0, "No active sharing locations should remain"
    print(f"  Verified 0 active sharing locations after disable: PASS")

    # Test 15: Tourist B leaves group
    code, leave_b = api_request(f"/yatra-groups/{group_id}/leave", method="POST", token=token_b)
    print(f"[TEST 15] Tourist B leaves group: HTTP {code}")
    assert code == 200
    _, my_b_after = api_request("/yatra-groups/my", token=token_b)
    assert my_b_after["has_group"] is False

    # Test 16: Tourist A leaves group (last member -> archives)
    code, leave_a = api_request(f"/yatra-groups/{group_id}/leave", method="POST", token=token_a)
    print(f"[TEST 16] Tourist A leaves group (last member archives): HTTP {code}")
    assert code == 200
    _, my_a_after = api_request("/yatra-groups/my", token=token_a)
    assert my_a_after["has_group"] is False

    print("=" * 80)
    print("ALL 16 YATRA GROUPS BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()
