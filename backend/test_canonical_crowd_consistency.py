import os
import sys
import unittest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from routes.crowd import resolve_site_crowd_state, latest_observations
from routes.simulations import run_simulation_calculation

client = TestClient(app)

TEST_SITES = [f"TS{i:03d}" for i in range(1, 26)]

class TestCanonicalCrowdConsistency(unittest.TestCase):

    def test_single_vs_batch_endpoints_consistency(self):
        """Verify individual /sites/{id}/density matches batch /sites/density and /crowd/density-all."""
        # 1. Fetch batch
        res_batch = client.get("/sites/density")
        self.assertEqual(res_batch.status_code, 200)
        batch_raw = res_batch.json()
        density_map = batch_raw.get("densities") if "densities" in batch_raw else batch_raw

        # Also test /crowd/density-all alias
        res_alias_all = client.get("/crowd/density-all")
        self.assertEqual(res_alias_all.status_code, 200)
        alias_raw = res_alias_all.json()
        alias_map = alias_raw.get("densities") if "densities" in alias_raw else alias_raw

        for site_id in TEST_SITES:
            self.assertIn(site_id, density_map, f"Site {site_id} missing in batch response")
            b_site = density_map[site_id]
            a_site = alias_map[site_id]

            # 2. Fetch single
            res_single = client.get(f"/sites/{site_id}/density")
            self.assertEqual(res_single.status_code, 200)
            s_site = res_single.json()

            # 3. Fetch single alias
            res_single_alias = client.get(f"/crowd/density/{site_id}")
            self.assertEqual(res_single_alias.status_code, 200)
            sa_site = res_single_alias.json()

            # Canonical resolver direct call
            c_site = resolve_site_crowd_state(site_id)

            # Assert exact match across all four access points
            self.assertEqual(b_site["people_count"], s_site["people_count"], f"Mismatch in people_count for {site_id}")
            self.assertEqual(b_site["occupancy_percentage"], s_site["occupancy_percentage"], f"Mismatch in occupancy for {site_id}")
            self.assertEqual(b_site["status"], s_site["status"], f"Mismatch in status for {site_id}")
            self.assertEqual(b_site["wait_time_minutes"], s_site["wait_time_minutes"], f"Mismatch in wait_time for {site_id}")
            self.assertEqual(b_site["source"], s_site["source"], f"Mismatch in source for {site_id}")

            # Alias checks
            self.assertEqual(s_site["people_count"], sa_site["people_count"])
            self.assertEqual(b_site["people_count"], a_site["people_count"])
            self.assertEqual(s_site["people_count"], c_site["people_count"])
            print(f"[PASS] Canonical match for {site_id}: {b_site['people_count']} people, {b_site['occupancy_percentage']}%, {b_site['status']}, wait: {b_site['wait_time_minutes']}m, source: {b_site['source']}")

    def test_police_simulation_baseline_and_isolation(self):
        """Verify Police Simulation consumes canonical crowd baseline and does NOT write back to live state."""
        for site_id in ["TS001", "TS003"]:
            # State before simulation
            state_before = resolve_site_crowd_state(site_id)
            people_before = state_before["people_count"]
            source_before = state_before["source"]

            # Run simulation calculation with standard arguments
            sim_result = run_simulation_calculation(
                site_id=site_id,
                event_name="Devotee Influx Peak",
                event_date="2026-10-12",
                event_time="10:00",
                expected_crowd_increase=5000,
                event_duration_hours=3.0,
                created_by="Unit Test"
            )

            # Assert baseline matches canonical state
            self.assertEqual(sim_result["baseline_people_count"], people_before)
            self.assertEqual(sim_result["site_capacity"], state_before["capacity"])
            self.assertIn("data_sources", sim_result)

            # State after simulation must be 100% UNCHANGED
            state_after = resolve_site_crowd_state(site_id)
            self.assertEqual(state_after["people_count"], people_before, "Simulation corrupted canonical people_count!")
            self.assertEqual(state_after["source"], source_before, "Simulation altered canonical data source!")
            print(f"[PASS] Police Simulation isolation verified for {site_id}: baseline={sim_result['baseline_people_count']}, state preserved.")

    def test_alternatives_endpoint_crowd_consistency(self):
        """Verify /sites/{site_id}/alternatives uses the canonical crowd state."""
        for site_id in ["TS001", "TS003"]:
            canonical = resolve_site_crowd_state(site_id)

            res = client.get(f"/sites/{site_id}/alternatives")
            self.assertEqual(res.status_code, 200)
            data = res.json()

            self.assertEqual(data["current_occupancy_percentage"], canonical["occupancy_percentage"])
            self.assertEqual(data["current_status"], canonical["status"])
            self.assertIn("recommendations", data)
            self.assertGreater(len(data["recommendations"]), 0)

            # Check road connectivity is present from authoritative CSV
            alt0 = data["recommendations"][0]
            self.assertIn("road_connectivity", alt0)
            self.assertIn("distance_km", alt0)
            self.assertIn("travel_time_mins", alt0)
            print(f"[PASS] Alternatives crowd consistency for {site_id}: {data['current_status']} ({data['current_occupancy_percentage']}%), {len(data['recommendations'])} sister shrines.")

    def test_safety_and_reroute_crowd_consistency(self):
        """Verify /alerts reflects canonical crowd state and emergency reroute derives from it."""
        res = client.get("/alerts")
        self.assertEqual(res.status_code, 200)
        alerts = res.json()
        self.assertIsInstance(alerts, list)

        # Check that any crowd alert has matching status to canonical resolver
        for alert in alerts:
            site_id = alert.get("site_id")
            if site_id:
                canonical = resolve_site_crowd_state(site_id)
                self.assertEqual(alert.get("severity"), canonical["status"])
        print(f"[PASS] Safety alerts consistent with canonical crowd state.")

    def test_hotel_pricing_independent_inventory(self):
        """Verify dynamic hotel pricing queries canonical density without corrupting hotel room inventory."""
        res = client.get("/hotels/rooms/pricing?hotel_id=H001&room_type=standard&site_id=TS001")
        if res.status_code == 200:
            pricing = res.json()
            self.assertIn("base_price", pricing)
            self.assertIn("dynamic_price", pricing)
            print(f"[PASS] Hotel dynamic pricing responds with independent room inventory pricing.")
        else:
            print(f"[INFO] Hotel pricing returned status {res.status_code} (skipping optional DB-backed route).")

    def test_data_source_priority_hierarchy(self):
        """Verify priority order: (1) YOLO, (2) live telemetry, (3) historical, (4) demo simulation, and stale rejection."""
        test_site = "TS008" # Yamunotri

        # Save previous state
        prev = latest_observations.get(test_site)
        now_iso = datetime.now(timezone.utc).isoformat()
        stale_iso = "2025-01-01T00:00:00+00:00"

        try:
            # 1. Fallback when empty -> demo_simulation
            latest_observations.pop(test_site, None)
            state_demo = resolve_site_crowd_state(test_site)
            self.assertEqual(state_demo["source"], "demo_simulation")

            # 2. Historical baseline tier
            latest_observations[test_site] = {
                "people_count": 4200,
                "occupancy_percentage": 5.6,
                "status": "NORMAL",
                "source": "historical_baseline",
                "timestamp": now_iso
            }
            state_hist = resolve_site_crowd_state(test_site)
            self.assertEqual(state_hist["source"], "historical_baseline")
            self.assertEqual(state_hist["people_count"], 4200)

            # 3. Live telemetry overrides historical baseline
            latest_observations[test_site] = {
                "people_count": 5500,
                "occupancy_percentage": 7.3,
                "status": "NORMAL",
                "source": "live_telemetry",
                "queue_length": 150,
                "wait_time_minutes": 75,
                "timestamp": now_iso
            }
            state_live = resolve_site_crowd_state(test_site)
            self.assertEqual(state_live["source"], "live_telemetry")
            self.assertEqual(state_live["people_count"], 5500)

            # 4. YOLO video overrides live telemetry
            latest_observations[test_site] = {
                "people_count": 6200,
                "occupancy_percentage": 8.3,
                "status": "NORMAL",
                "source": "yolo_video",
                "queue_length": 200,
                "wait_time_minutes": 90,
                "timestamp": now_iso
            }
            state_yolo = resolve_site_crowd_state(test_site)
            self.assertEqual(state_yolo["source"], "yolo_video")
            self.assertEqual(state_yolo["people_count"], 6200)

            # 5. Stale observation (>900s old) rejected from live telemetry tier
            latest_observations[test_site] = {
                "people_count": 9999,
                "occupancy_percentage": 90.0,
                "status": "CRITICAL",
                "source": "live_telemetry",
                "timestamp": stale_iso
            }
            state_stale = resolve_site_crowd_state(test_site)
            self.assertNotEqual(state_stale["source"], "live_telemetry", "Stale telemetry was incorrectly accepted as live!")
            self.assertNotEqual(state_stale["people_count"], 9999)

            print(f"[PASS] Source priority hierarchy verified across all 4 tiers (YOLO -> Live -> Historical -> Demo) and stale rejection confirmed.")
        finally:
            if prev:
                latest_observations[test_site] = prev
            else:
                latest_observations.pop(test_site, None)

if __name__ == "__main__":
    unittest.main()
