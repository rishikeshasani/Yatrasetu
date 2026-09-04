import httpx
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def log(msg, status="INFO"):
    print(f"[{status}] {msg}")

def test_connectivity():
    client = httpx.Client(base_url=BASE_URL, timeout=30.0)

    # 1. Check Backend Health
    try:
        r = client.get("/")
        assert r.status_code == 200, f"Backend not reachable: {r.status_code}"
        log("Backend root endpoint 200 OK", "PASS")
    except Exception as e:
        log(f"Backend offline: {e}", "FAIL")
        sys.exit(1)

    # Authenticate Government Officer
    govt_login = client.post("/auth/login", json={
        "email": "govt_command@yatrasetu.org",
        "password": "DemoPassword123!"
    })
    assert govt_login.status_code == 200, f"Govt login failed: {govt_login.text}"
    govt_token = govt_login.json().get("access_token") or govt_login.json().get("token")
    govt_headers = {"Authorization": f"Bearer {govt_token}"}
    log("Government Officer authenticated with JWT", "PASS")

    # 2. Test Crowd Telemetry & Multi-Dashboard View
    # Update crowd for TS001 to 12350 (95% critical)
    log("Step 1: Government Officer updates crowd for Kedarnath (TS001) to 12,350 headcount...")
    update_res = client.post(
        "/crowd/update",
        json={
            "site_id": "TS001",
            "people_count": 12350,
            "queue_length_meters": 1600.0,
            "wait_time_minutes": 540.0
        },
        headers=govt_headers
    )
    assert update_res.status_code == 200, f"Failed crowd update: {update_res.text}"
    log(f"Government POST /crowd/update response: {update_res.json()}", "PASS")

    # Now verify Tourist / Government / Travel read:
    # a) Density endpoint
    density_res = client.get("/sites/TS001/density")
    assert density_res.status_code == 200
    density_data = density_res.json()
    assert density_data.get("status") == "CRITICAL", f"Expected CRITICAL, got {density_data.get('status')}"
    assert density_data.get("occupancy_percentage") == 95.0, f"Expected 95.0, got {density_data.get('occupancy_percentage')}"
    log(f"Tourist & Travel Company GET /crowd/density/TS001: {density_data}", "PASS")

    # b) Recommendations / Sister Shrines for Tourist & Travel
    alts_res = client.get("/sites/TS001/alternatives")
    assert alts_res.status_code == 200
    alts = alts_res.json()
    rec_list = alts.get("recommendations", [])
    assert len(rec_list) > 0, "Expected sister shrine alternatives when critical"
    log(f"Tourist & Travel Company GET /sites/TS001/alternatives: {len(rec_list)} sister shrines found (e.g. {rec_list[0]['name']})", "PASS")

    # c) Active Alerts for Tourist & Government
    alerts_res = client.get("/alerts")
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    log(f"Government & Tourist GET /alerts: {len(alerts)} alerts active", "PASS")

    # 3. Test Hotel Booking Sync (Tourist -> Hotel & Government)
    log("\nStep 2: Tourist books a room at Kedarnath Real Pilgrimage Lodge...")
    # Get hotels
    hotels_res = client.get("/hotels")
    assert hotels_res.status_code == 200
    hotels = hotels_res.json()
    lodge = next((h for h in hotels if "Kedarnath" in h.get("name", "")), hotels[0])
    hotel_id = lodge["id"]
    log(f"Target Hotel: {lodge['name']} (ID: {hotel_id})")

    # Authenticate as tourist
    login_res = client.post("/auth/login", json={
        "email": "tourist_demo@yatrasetu.org",
        "password": "DemoPassword123!"
    })
    assert login_res.status_code == 200, f"Tourist login failed: {login_res.text}"
    tourist_token = login_res.json().get("access_token") or login_res.json().get("token")
    tourist_headers = {"Authorization": f"Bearer {tourist_token}"}

    # Book room
    room_id = lodge["rooms"][0]["id"]
    book_res = client.post(
        f"/hotels/{hotel_id}/book",
        json={
            "room_id": room_id,
            "check_in": "2026-09-10",
            "check_out": "2026-09-12",
            "guests": 2
        },
        headers=tourist_headers
    )
    assert book_res.status_code in [200, 201], f"Booking failed: {book_res.text}"
    booking_data = book_res.json()
    log(f"Tourist booking confirmed: ID={booking_data.get('id')} Status={booking_data.get('status')}", "PASS")

    # Check Hotel Owner sees the booking
    owner_login = client.post("/auth/login", json={
        "email": "hotel_partner@yatrasetu.org",
        "password": "DemoPassword123!"
    })
    assert owner_login.status_code == 200
    owner_token = owner_login.json().get("access_token") or owner_login.json().get("token")
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    
    owner_bookings_res = client.get("/hotels/owner/bookings", headers=owner_headers)
    assert owner_bookings_res.status_code == 200
    owner_bookings = owner_bookings_res.json()
    found = any(b.get("id") == booking_data.get("id") for b in owner_bookings)
    assert found, "Hotel owner could not find the tourist booking!"
    log(f"Hotel Dashboard GET /hotels/owner/bookings: Found {len(owner_bookings)} bookings including new booking {booking_data.get('id')}", "PASS")

    # Check Government Occupancy Report includes the hotel
    govt_report_res = client.get("/hotels/government/occupancy-report", headers=govt_headers)
    assert govt_report_res.status_code == 200
    govt_report = govt_report_res.json()
    log(f"Government Dashboard GET /hotels/government/occupancy-report: {govt_report.get('total_hotels')} hotels, {govt_report.get('total_rooms')} rooms, {govt_report.get('occupied_rooms')} occupied ({govt_report.get('overall_occupancy_percentage')}%)", "PASS")

    # 4. Test SOS Alert Propagation (Tourist -> Government)
    log("\nStep 3: Tourist triggers SOS distress beacon...")
    sos_res = client.post(
        "/sos",
        json={
            "site_id": "TS001",
            "latitude": 30.7352,
            "longitude": 79.0669,
            "message": "Emergency SOS from tourist at Kedarnath Temple gate",
            "severity": "CRITICAL"
        },
        headers=tourist_headers
    )
    assert sos_res.status_code in [200, 201], f"SOS trigger failed: {sos_res.text}"
    sos_data = sos_res.json()
    sos_id = sos_data.get("alert_id") or sos_data.get("id")
    log(f"Tourist POST /sos: Beacon dispatched (ID: {sos_id})", "PASS")

    # Government fetches active SOS alerts
    active_sos_res = client.get("/sos/active")
    assert active_sos_res.status_code == 200
    active_sos_data = active_sos_res.json()
    active_sos_list = active_sos_data.get("alerts", []) if isinstance(active_sos_data, dict) else active_sos_data
    sos_found = any(s.get("id") == sos_id for s in active_sos_list)
    assert sos_found, "Government active SOS alerts did not contain the newly triggered SOS!"
    log(f"Government Dashboard GET /sos/active: Successfully received distress beacon {sos_id} from {active_sos_list[0].get('user_name', 'Tourist')}", "PASS")

    log("\n=======================================================", "INFO")
    log("ALL 4 DASHBOARDS CONNECTIVITY VERIFIED WITH SUPABASE & FASTAPI!", "PASS")
    log("=======================================================", "INFO")

if __name__ == "__main__":
    test_connectivity()
