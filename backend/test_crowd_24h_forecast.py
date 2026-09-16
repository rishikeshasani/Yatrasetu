import os
import sys
import unittest
from datetime import datetime, timezone, timedelta

# Ensure backend directory is in path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from fastapi.testclient import TestClient
from main import app
from services.crowd_ml import crowd_ml_service

client = TestClient(app)

class TestCrowd24hForecast(unittest.TestCase):
    def setUp(self):
        self.crowd_ml = crowd_ml_service

    def test_forecast_returns_24_hours_and_anchors(self):
        """Verify predict_24h_forecast produces exactly 24 hours with hour 0 anchored to live observation."""
        # TS001 Kedarnath Temple (Capacity 15000, live ~12350 -> ~95% or 82%)
        start_time = datetime(2026, 9, 16, 10, 0, 0)
        result = self.crowd_ml.predict_24h_forecast("TS001", capacity=15000, start_time=start_time)
        self.assertIn("forecasts", result)
        forecasts = result["forecasts"]
        self.assertEqual(len(forecasts), 24, "Must return exactly 24 hours of forecast")

        # First item must be marked as current
        hour_0 = forecasts[0]
        self.assertTrue(hour_0.get("is_current"), "Hour 0 must be flagged as is_current: True")

        # Check that predicted occupancy is not stuck at 0.2%
        self.assertGreater(hour_0["occupancy_percentage"], 5.0, "Anchored occupancy must reflect real capacity, not unscaled 0.2%")

        # Verify time labels exist and are well-formed (e.g., '10 AM')
        for item in forecasts:
            self.assertIn("time_label", item)
            self.assertIn("occupancy_percentage", item)
            self.assertIn("predicted_count", item)
            self.assertIn("status", item)
            self.assertIn(item["status"], ["NORMAL", "MODERATE", "HIGH", "CRITICAL"])
            self.assertGreaterEqual(item["occupancy_percentage"], 0.0)
            self.assertLessEqual(item["occupancy_percentage"], 100.0)

    def test_canonical_status_thresholds(self):
        """Verify strict canonical status thresholds: <50% NORMAL, 50-74% MODERATE, 75-89% HIGH, >=90% CRITICAL."""
        result = self.crowd_ml.predict_24h_forecast("TS001", capacity=15000)
        forecasts = result["forecasts"]
        for f in forecasts:
            occ = f["occupancy_percentage"]
            status = f["status"]
            if occ >= 90.0:
                self.assertEqual(status, "CRITICAL")
            elif occ >= 75.0:
                self.assertEqual(status, "HIGH")
            elif occ >= 50.0:
                self.assertEqual(status, "MODERATE")
            else:
                self.assertEqual(status, "NORMAL")

    def test_multi_site_forecast_diversity(self):
        """Verify forecasts for different shrines scale to their specific capacities and baselines."""
        sites_to_test = [
            ("TS001", 15000),  # Kedarnath
            ("TS002", 16000),  # Badrinath
            ("TS003", 120000), # Kashi Vishwanath
            ("TS024", 1200)    # Hemkund Sahib
        ]
        for site_id, cap in sites_to_test:
            result = self.crowd_ml.predict_24h_forecast(site_id, capacity=cap)
            f = result["forecasts"]
            self.assertEqual(len(f), 24, f"{site_id} must have 24 forecasts")
            occ_values = [item["occupancy_percentage"] for item in f]
            # Verify values vary diurnally (not constant)
            self.assertGreater(max(occ_values) - min(occ_values), 1.0, f"{site_id} should have diurnal variation")

    def test_api_site_forecast_endpoint(self):
        """Test GET /sites/{site_id}/forecast returns provenance, capacity, and 24 hours."""
        res = client.get("/sites/TS001/forecast")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["site_id"], "TS001")
        self.assertEqual(data["forecast_period"], "24h")
        self.assertEqual(len(data["forecasts"]), 24)
        self.assertIn("source", data)
        self.assertIn("source_label", data)
        self.assertIn("last_updated", data)
        self.assertEqual(data["capacity"], 13000)

    def test_hotel_booking_advance_and_past_validation(self):
        """Test booking validation prevents past dates and bookings beyond 365 days."""
        now = datetime.now()

        # 1. Past check-in should fail
        past_checkin = (now - timedelta(days=2)).isoformat()
        res_past = client.post("/booking-requests", json={
            "hotel_id": "H001",
            "tourist_id": "00000000-0000-0000-0000-000000000001",
            "room_id": "R101",
            "room_number": "101",
            "guest_name": "Test Pilgrim",
            "check_in": past_checkin,
            "check_out": now.isoformat()
        })
        self.assertEqual(res_past.status_code, 400)
        self.assertIn("past", res_past.json().get("detail", "").lower())

        # 2. Far future (>365 days) check-in should fail
        future_checkin = (now + timedelta(days=400)).isoformat()
        future_checkout = (now + timedelta(days=402)).isoformat()
        res_future = client.post("/booking-requests", json={
            "hotel_id": "H001",
            "tourist_id": "00000000-0000-0000-0000-000000000001",
            "room_id": "R101",
            "room_number": "101",
            "guest_name": "Test Pilgrim",
            "check_in": future_checkin,
            "check_out": future_checkout
        })
        self.assertEqual(res_future.status_code, 400)
        self.assertIn("365", res_future.json().get("detail", "").lower())

if __name__ == "__main__":
    unittest.main()
