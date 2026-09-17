import sys
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from main import app

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

client = TestClient(app)

def test_hotel_rooms_and_maintenance():
    print("--- Testing Room Inventory and Maintenance Status ---")
    # 1. Fetch rooms
    res = client.get("/hotels/H001/rooms")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    rooms = res.json()
    assert len(rooms) >= 50, f"Expected at least 50 rooms, got {len(rooms)}"
    print(f"✓ Found {len(rooms)} certified rooms")

    # 2. Mark Room 108 as maintenance
    res_maint = client.patch("/hotels/H001/rooms/R108/status", json={"status": "maintenance"})
    assert res_maint.status_code == 200, f"Expected 200, got {res_maint.status_code}: {res_maint.text}"
    assert res_maint.json()["new_status"] == "maintenance"
    print("✓ Room 108 successfully set to maintenance")

    # 3. Verify room 108 is excluded from rooms-available
    tomorrow = datetime.now() + timedelta(days=1)
    day_after = tomorrow + timedelta(days=1)
    t_in = tomorrow.strftime("%Y-%m-%dT14:00")
    t_out = day_after.strftime("%Y-%m-%dT11:00")
    res_avail = client.get(f"/hotels/H001/rooms-available?check_in={t_in}&check_out={t_out}&guests=2")
    assert res_avail.status_code == 200
    avail_rooms = res_avail.json()
    avail_nums = [r["room_number"] for r in avail_rooms]
    assert "108" not in avail_nums, "Room 108 should not be available when in maintenance"
    print("✓ Room 108 excluded from availability query")

    # 4. Attempt booking on maintenance room 108 -> must return 409 Conflict
    res_book = client.post("/booking-requests", json={
        "hotel_id": "H001",
        "room_number": "108",
        "guest_name": "Test Pilgrim",
        "guest_count": 2,
        "check_in": t_in,
        "check_out": t_out
    })
    assert res_book.status_code == 409, f"Expected 409 Conflict for maintenance room, got {res_book.status_code}"
    print("✓ Booking request for maintenance room rejected with 409 Conflict")

    # 5. Restore Room 108 to available
    res_restore = client.patch("/hotels/H001/rooms/R108/status", json={"status": "available"})
    assert res_restore.status_code == 200
    assert res_restore.json()["new_status"] == "available"
    print("✓ Room 108 restored to available")


def test_qr_checkout_time_lock():
    print("\n--- Testing QR Checkout Time-Lock Enforcement ---")
    # 1. Create a confirmed booking with check_out in the future
    future_in = (datetime.now() - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M")
    future_out = (datetime.now() + timedelta(hours=5)).strftime("%Y-%m-%dT%H:%M")
    
    # Accept or create request
    res_req = client.post("/booking-requests", json={
        "hotel_id": "H001",
        "room_number": "115",
        "guest_name": "Lock Test Guest",
        "guest_count": 2,
        "check_in": future_in,
        "check_out": future_out
    })
    assert res_req.status_code == 201, f"Failed creating request: {res_req.text}"
    req_data = res_req.json()
    req_id = req_data["id"]
    booking_id = req_data["booking_id"]

    # Accept request
    res_acc = client.patch(f"/booking-requests/{req_id}/accept")
    assert res_acc.status_code == 200
    print(f"✓ Booking {booking_id} confirmed for Room 115 (Check-out in future: {future_out})")

    # 2. Attempt early checkout without override -> MUST FAIL with 400 Bad Request
    res_checkout_fail = client.post("/hotels/checkout", json={
        "booking_id": booking_id,
        "override": False
    })
    assert res_checkout_fail.status_code == 400, f"Expected 400 Bad Request, got {res_checkout_fail.status_code}"
    assert "locked" in res_checkout_fail.json()["detail"].lower(), f"Unexpected error detail: {res_checkout_fail.json()}"
    print(f"✓ Checkout locked verified: '{res_checkout_fail.json()['detail']}'")

    # 3. Checkout WITH staff emergency override -> MUST SUCCEED
    res_checkout_ok = client.post("/hotels/checkout", json={
        "booking_id": booking_id,
        "override": True
    })
    assert res_checkout_ok.status_code == 200, f"Expected 200 OK, got {res_checkout_ok.status_code}: {res_checkout_ok.text}"
    print(f"✓ Checkout with override succeeded: '{res_checkout_ok.json()['message']}'")


def test_dynamic_pricing_rules():
    print("\n--- Testing Dynamic Hourly Pricing Rules ---")
    dt_in = "2026-09-15T14:00"
    dt_out = "2026-09-15T17:00" # 3 hours
    
    # Deluxe: Base ₹750/hr, multiplier 1.35x (+50% surge) -> 1012.50/hr, 3 hrs = 3037.50
    res_p1 = client.get(f"/hotels/H001/calculate-price?check_in={dt_in}&check_out={dt_out}&room_type=Deluxe&multiplier_override=1.35")
    assert res_p1.status_code == 200
    p1 = res_p1.json()
    assert p1["final_hourly_rate"] == 1012.5, f"Expected 1012.5, got {p1['final_hourly_rate']}"
    assert p1["total_amount"] == 3037.5, f"Expected 3037.5, got {p1['total_amount']}"
    assert p1["is_capped"] is False
    print("✓ Deluxe 3-hr pricing: ₹1012.50/hr, Total: ₹3,037.50")

    # Long stay cap test: 24 hours at 1.50x multiplier
    dt_long_out = "2026-09-16T14:00" # 24 hours
    res_p2 = client.get(f"/hotels/H001/calculate-price?check_in={dt_in}&check_out={dt_long_out}&room_type=Deluxe&multiplier_override=1.50")
    assert res_p2.status_code == 200
    p2 = res_p2.json()
    # 24 * 1050 (capped at 1050) = 25,200 -> Hard cap 12,000!
    assert p2["total_amount"] == 12000.0, f"Expected 12000.0, got {p2['total_amount']}"
    assert p2["is_capped"] is True
    assert p2["cap_notice"] == "AI Surge Cap Applied"
    print("✓ 24-hr Deluxe stay hard capped at ₹12,000.00 with 'AI Surge Cap Applied'")


if __name__ == "__main__":
    try:
        test_hotel_rooms_and_maintenance()
        test_qr_checkout_time_lock()
        test_dynamic_pricing_rules()
        print("\n==========================================")
        print("ALL TESTS PASSED SUCCESSFULLY! (100% GREEN)")
        print("==========================================")
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
