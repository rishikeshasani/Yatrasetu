from datetime import date, timedelta
from fastapi.testclient import TestClient
from main import app
from dependencies import get_current_user, AuthenticatedUser

from database import supabase_admin

def get_or_create_test_user(email: str, role: str, full_name: str) -> AuthenticatedUser:
    try:
        users = supabase_admin.auth.admin.list_users()
        for u in users:
            if u.email == email:
                supabase_admin.table("profiles").upsert({"id": u.id, "role": role, "full_name": full_name}).execute()
                return AuthenticatedUser(id=u.id, email=email, role=role, full_name=full_name)
        res = supabase_admin.auth.admin.create_user({"email": email, "password": "TestPassword123!", "email_confirm": True})
        uid = res.user.id
        supabase_admin.table("profiles").upsert({"id": uid, "role": role, "full_name": full_name}).execute()
        return AuthenticatedUser(id=uid, email=email, role=role, full_name=full_name)
    except Exception:
        return AuthenticatedUser(id="59afb8b6-6a33-4fe8-8837-ed1c55c05868", email=email, role=role, full_name=full_name)

client = TestClient(app)

def run_hotel_tests():
    print("==================================================================")
    print(">>> RUNNING YATRASETU HOTEL MODULE COMPREHENSIVE TEST SUITE <<<")
    print("==================================================================")

    # ------------------------------------------------------------------------
    # 1. Test Public Endpoints (No Auth Required)
    # ------------------------------------------------------------------------
    print("\n--- 1. Testing Public Hotel Browsing & Availability ---")
    res = client.get("/hotels")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    hotels = res.json()
    assert isinstance(hotels, list), "Expected list of hotels"
    print(f"PASS: GET /hotels returned {len(hotels)} hotels from real Supabase table.")

    # Non-existent hotel -> 404
    res = client.get("/hotels/non-existent-hotel-id-999")
    assert res.status_code == 404
    print("PASS: GET /hotels/{fake_id} returned 404 Not Found")


    # ------------------------------------------------------------------------
    # 2. Test Unauthenticated Access to Protected Hotel Endpoints (Expect 401)
    # ------------------------------------------------------------------------
    print("\n--- 2. Testing Unauthenticated Access (Expect 401 Unauthorized) ---")
    dummy_hotel_id = "00000000-0000-0000-0000-000000000000"
    unauth_tests = [
        ("POST", "/hotels", {"name": "Test", "address": "Test", "latitude": 30.0, "longitude": 79.0, "contact": "12345"}),
        ("PUT", f"/hotels/{dummy_hotel_id}", {"name": "Updated Name"}),
        ("POST", f"/hotels/{dummy_hotel_id}/book", {"room_id": "r1", "check_in": "2026-09-10", "check_out": "2026-09-12", "guests": 2}),
        ("GET", "/hotels/owner/bookings", None),
        ("GET", "/hotels/government/occupancy-report", None),
    ]

    for method, path, payload in unauth_tests:
        if method == "POST":
            res = client.post(path, json=payload)
        elif method == "PUT":
            res = client.put(path, json=payload)
        else:
            res = client.get(path)
        assert res.status_code == 401, f"Expected 401 for {method} {path}, got {res.status_code}"
        print(f"PASS: Unauthenticated {method} {path} correctly rejected (401)")


    # ------------------------------------------------------------------------
    # 3. Test Hotel Creation (POST /hotels) & RBAC
    # ------------------------------------------------------------------------
    print("\n--- 3. Testing Hotel Creation & Role Authorization ---")
    hotel_owner_1 = get_or_create_test_user("hotel_owner_test@yatrasetu.org", "hotel", "Ramesh Sharma")
    tourist_user = get_or_create_test_user("tourist_test@yatrasetu.org", "tourist", "Ananya Verma")

    # Tourist cannot create hotel -> 403
    app.dependency_overrides[get_current_user] = lambda: tourist_user
    res = client.post("/hotels", json={
        "name": "Unauthorized Hotel",
        "address": "Badrinath",
        "latitude": 30.74,
        "longitude": 79.49,
        "contact": "+91-9988776655"
    })
    assert res.status_code == 403, f"Expected 403, got {res.status_code}"
    print("PASS: Tourist role blocked from POST /hotels (403 Forbidden)")

    # Latitude / Longitude validation (Invalid lat: 95.0 -> 422)
    app.dependency_overrides[get_current_user] = lambda: hotel_owner_1
    res = client.post("/hotels", json={
        "name": "Invalid Lat Hotel",
        "address": "Badrinath",
        "latitude": 95.0,
        "longitude": 79.49,
        "contact": "+91-9988776655"
    })
    assert res.status_code == 422
    print("PASS: Invalid latitude (95.0) rejected with 422 validation error")

    # Hotel Owner creates a new hotel with rooms
    new_hotel_payload = {
        "name": "Badrinath Divine Valley Retreat",
        "description": "Luxurious spiritual retreat adjacent to Alaknanda river.",
        "address": "Temple Road, Badrinath, Chamoli, Uttarakhand",
        "latitude": 30.7433,
        "longitude": 79.4938,
        "contact": "+91-9876500001",
        "rooms": [
            {
                "room_type": "Executive Temple View Suite",
                "total_rooms": 2,
                "available_rooms": 2,
                "price_per_night": 3999.0
            },
            {
                "room_type": "Standard Yatri Room",
                "total_rooms": 5,
                "available_rooms": 5,
                "price_per_night": 1499.0
            }
        ]
    }
    res = client.post("/hotels", json=new_hotel_payload)
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    created_hotel = res.json()
    my_hotel_id = created_hotel["id"]
    # Verify owner_id is derived from token, not client
    assert created_hotel["owner_id"] == hotel_owner_1.id
    suite_room_id = created_hotel["rooms"][0]["id"]
    print(f"PASS: Hotel owner successfully registered '{created_hotel['name']}' (ID: {my_hotel_id}) with owner_id={created_hotel['owner_id']}")

    # Verify public reading of specific created hotel
    res = client.get(f"/hotels/{my_hotel_id}")
    assert res.status_code == 200
    assert res.json()["id"] == my_hotel_id
    assert len(res.json()["rooms"]) == 2
    print(f"PASS: GET /hotels/{my_hotel_id} returned hotel details with {len(res.json()['rooms'])} rooms")

    # Verify public availability of created hotel
    res = client.get(f"/hotels/{my_hotel_id}/availability")
    assert res.status_code == 200
    avail = res.json()
    assert avail["hotel_id"] == my_hotel_id
    assert avail["available_rooms"] == 7
    assert avail["total_rooms"] == 7
    print(f"PASS: GET /hotels/{my_hotel_id}/availability -> {avail['available_rooms']}/{avail['total_rooms']} rooms available")


    # ------------------------------------------------------------------------
    # 4. Test Hotel Update & Ownership Protection (PUT /hotels/{hotel_id})
    # ------------------------------------------------------------------------
    print("\n--- 4. Testing Hotel Update & Strict Ownership Enforcement ---")
    hotel_owner_2 = get_or_create_test_user("hotel_owner_2_test@yatrasetu.org", "hotel", "Kiran Patel")

    # Different hotel owner tries to edit Hotel 1 -> 403 Forbidden!
    app.dependency_overrides[get_current_user] = lambda: hotel_owner_2
    res = client.put(f"/hotels/{my_hotel_id}", json={"name": "Hacked Hotel Name"})
    assert res.status_code == 403, f"Expected 403, got {res.status_code}"
    print("PASS: Competitor hotel owner blocked from updating another's hotel (403 Forbidden)")

    # Legitimate owner updates details
    app.dependency_overrides[get_current_user] = lambda: hotel_owner_1
    res = client.put(f"/hotels/{my_hotel_id}", json={
        "name": "Badrinath Divine Valley Premium Retreat",
        "description": "Updated description with 24x7 hot water and temple transfer."
    })
    assert res.status_code == 200
    assert res.json()["name"] == "Badrinath Divine Valley Premium Retreat"
    print("PASS: Legitimate owner successfully updated hotel details (200 OK)")


    # ------------------------------------------------------------------------
    # 5. Test Room Booking, Date Validation & Overbooking Prevention
    # ------------------------------------------------------------------------
    print("\n--- 5. Testing Room Booking, Validations & Overbooking Prevention ---")
    # Hotel owner tries to book -> 403 Forbidden (Only tourist can book)
    app.dependency_overrides[get_current_user] = lambda: hotel_owner_1
    tomorrow = date.today() + timedelta(days=1)
    day_after = date.today() + timedelta(days=3)

    res = client.post(f"/hotels/{my_hotel_id}/book", json={
        "room_id": suite_room_id,
        "check_in": str(tomorrow),
        "check_out": str(day_after),
        "guests": 2
    })
    assert res.status_code == 403, f"Expected 403 for hotel role booking, got {res.status_code}"
    print("PASS: Hotel role blocked from booking (403 Forbidden: Tourist only)")

    # Tourist user booking
    app.dependency_overrides[get_current_user] = lambda: tourist_user

    # Date Validation: check_out before check_in -> 422
    res = client.post(f"/hotels/{my_hotel_id}/book", json={
        "room_id": suite_room_id,
        "check_in": str(day_after),
        "check_out": str(tomorrow),
        "guests": 2
    })
    assert res.status_code == 422
    print("PASS: Invalid checkout date (check_out <= check_in) rejected with 422")

    # Date Validation: check_in in the past -> 422
    past_date = date.today() - timedelta(days=2)
    res = client.post(f"/hotels/{my_hotel_id}/book", json={
        "room_id": suite_room_id,
        "check_in": str(past_date),
        "check_out": str(tomorrow),
        "guests": 2
    })
    assert res.status_code == 422
    print("PASS: Past check-in date rejected with 422")

    # Successful Booking 1 (suite has total_rooms = 2, available_rooms = 2)
    res = client.post(f"/hotels/{my_hotel_id}/book", json={
        "room_id": suite_room_id,
        "check_in": str(tomorrow),
        "check_out": str(day_after),
        "guests": 2
    })
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    booking_1 = res.json()
    assert booking_1["tourist_id"] == tourist_user.id
    assert booking_1["status"] == "confirmed"
    print(f"PASS: Booking 1 confirmed (ID: {booking_1['id']}, Tourist: {booking_1['tourist_id']}, Price: INR {booking_1['total_price']})")

    # Successful Booking 2 (available_rooms becomes 0)
    res = client.post(f"/hotels/{my_hotel_id}/book", json={
        "room_id": suite_room_id,
        "check_in": str(tomorrow),
        "check_out": str(day_after),
        "guests": 1
    })
    assert res.status_code == 201
    print("PASS: Booking 2 confirmed. Inventory for suite is now 0.")

    # Overbooking Prevention Test: Attempting Booking 3 when available = 0 -> 400 Bad Request!
    res = client.post(f"/hotels/{my_hotel_id}/book", json={
        "room_id": suite_room_id,
        "check_in": str(tomorrow),
        "check_out": str(day_after),
        "guests": 1
    })
    assert res.status_code == 400, f"Expected 400 for overbooking, got {res.status_code}: {res.text}"
    assert "overbooking prevented" in res.json()["detail"].lower()
    print("PASS: Overbooking strictly prevented (HTTP 400: 'No rooms available... Overbooking prevented.')")


    # ------------------------------------------------------------------------
    # 6. Test Owner Bookings Retrieval (GET /hotels/owner/bookings)
    # ------------------------------------------------------------------------
    print("\n--- 6. Testing Hotel Owner Bookings View & Privacy Isolation ---")
    # Hotel Owner 1 views bookings for their hotel
    app.dependency_overrides[get_current_user] = lambda: hotel_owner_1
    res = client.get("/hotels/owner/bookings")
    assert res.status_code == 200
    owner_1_bookings = res.json()
    my_hotel_bookings = [b for b in owner_1_bookings if b["hotel_id"] == my_hotel_id]
    assert len(my_hotel_bookings) == 2
    print(f"PASS: Hotel Owner 1 successfully viewed {len(my_hotel_bookings)} bookings for created hotel (total owned: {len(owner_1_bookings)})")

    # Hotel Owner 2 views their bookings -> should see 0 bookings (Cannot see Owner 1's bookings)
    app.dependency_overrides[get_current_user] = lambda: hotel_owner_2
    res = client.get("/hotels/owner/bookings")
    assert res.status_code == 200
    owner_2_bookings = res.json()
    assert len(owner_2_bookings) == 0
    print("PASS: Hotel Owner 2 isolated: Cannot see Hotel Owner 1's bookings (Privacy preserved)")


    # ------------------------------------------------------------------------
    # 7. Test Government Occupancy & Demand Monitoring
    # ------------------------------------------------------------------------
    print("\n--- 7. Testing Government Demand & Monitoring Report ---")
    gov_user = AuthenticatedUser(
        id="f1f2f3f4-b1b2-c1c2-d1d2-e1e2e3e4e5e6",
        email="monitoring@tourism.gov.in",
        role="government",
        full_name="Director of Tourism"
    )

    # Tourist / Hotel blocked from government report -> 403
    app.dependency_overrides[get_current_user] = lambda: tourist_user
    res = client.get("/hotels/government/occupancy-report")
    assert res.status_code == 403
    print("PASS: Tourist blocked from government occupancy report (403 Forbidden)")

    # Government user accesses demand report -> 200 OK
    app.dependency_overrides[get_current_user] = lambda: gov_user
    res = client.get("/hotels/government/occupancy-report")
    assert res.status_code == 200
    gov_report = res.json()
    assert "total_hotels" in gov_report and "total_capacity_rooms" in gov_report and "overall_occupancy_percentage" in gov_report
    print(f"PASS: Government accessed demand report: {gov_report['total_hotels']} hotels, {gov_report['total_capacity_rooms']} total capacity, Overall Occupancy: {gov_report['overall_occupancy_percentage']}%")

    app.dependency_overrides.clear()
    print("\n==================================================================")
    print(">>> ALL HOTEL MODULE AUTHORIZATION & BUSINESS LOGIC TESTS PASSED! <<<")
    print("==================================================================")

if __name__ == "__main__":
    run_hotel_tests()
