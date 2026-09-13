"""
YatraSetu Transit Flow & Reroute Intelligence Service
=====================================================
Manages aggregate passenger flow observations for named pilgrimage transit nodes,
integrates real/simulated YOLO video detections, tracks the 6-stage reroute funnel,
and dynamically computes local fleet requirements with actionable deployment rationales.

Guarantees:
- Aggregate counts only; NO facial recognition or individual tourist tracking.
- Dynamic propagation: Video upload immediately overrides headcount, recalculates
  waiting queues, demand predictions, shortage/surplus, and fleet dispatch rationales.
"""

import math
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

# 6 Key Pilgrimage Transit Nodes
TRANSIT_NODES_REGISTRY: Dict[str, dict] = {
    "NODE_DELHI_NDLS": {
        "id": "NODE_DELHI_NDLS",
        "name": "Delhi Railway Station & ISBT",
        "region": "Delhi NCR",
        "type": "interstate_rail_bus",
        "latitude": 28.6670,
        "longitude": 77.2284,
        "nominal_capacity": 50000,
        "feed_id": "FEED-NODE-NDLS",
        "camera_name": "CCTV-NDLS-GATE-03 (Ajmeri Gate Staging)",
        "transit_waiting_factor": 0.08,
        "default_bus_capacity": 40,
        "usable_capacity_pct": 0.90, # 36 usable seats
        "initial_headcount": 1850,
        "inflow_per_min": 45,
        "outflow_per_min": 38,
        "agency_passengers_expected": 240,
        "reroutes_offered": 120,
        "reroutes_accepted": 85,
        "reroutes_confirmed": 64,
        "passengers_waiting": 38,
        "passengers_boarded": 26,
        "passengers_completed": 45,
        "expected_incoming": 35,
        "available_buses": 2,
    },
    "NODE_HARIDWAR_HW": {
        "id": "NODE_HARIDWAR_HW",
        "name": "Haridwar Railway Station & Bus Terminal",
        "region": "Haridwar Gateway",
        "type": "pilgrim_junction",
        "latitude": 29.9457,
        "longitude": 78.1642,
        "nominal_capacity": 35000,
        "feed_id": "FEED-NODE-HW-STN",
        "camera_name": "CCTV-HW-PLATFORM-01 (Station Concourse & Bus Plaza)",
        "transit_waiting_factor": 0.12,
        "default_bus_capacity": 40,
        "usable_capacity_pct": 0.90,
        "initial_headcount": 1420,
        "inflow_per_min": 38,
        "outflow_per_min": 32,
        "agency_passengers_expected": 310,
        "reroutes_offered": 95,
        "reroutes_accepted": 72,
        "reroutes_confirmed": 58,
        "passengers_waiting": 31,
        "passengers_boarded": 27,
        "passengers_completed": 60,
        "expected_incoming": 20,
        "available_buses": 1,
    },
    "NODE_RISHIKESH_BS": {
        "id": "NODE_RISHIKESH_BS",
        "name": "Rishikesh Bus Stand & ISBT",
        "region": "Rishikesh Foothills",
        "type": "gateway_staging",
        "latitude": 30.1087,
        "longitude": 78.2936,
        "nominal_capacity": 25000,
        "feed_id": "FEED-NODE-RISHIKESH",
        "camera_name": "CCTV-RK-BAY-04 (Natraj Chowk / Hill Transit Bay)",
        "transit_waiting_factor": 0.10,
        "default_bus_capacity": 40,
        "usable_capacity_pct": 0.90,
        "initial_headcount": 980,
        "inflow_per_min": 28,
        "outflow_per_min": 24,
        "agency_passengers_expected": 180,
        "reroutes_offered": 70,
        "reroutes_accepted": 50,
        "reroutes_confirmed": 42,
        "passengers_waiting": 25,
        "passengers_boarded": 17,
        "passengers_completed": 35,
        "expected_incoming": 15,
        "available_buses": 1,
    },
    "NODE_RUDRAPRAYAG": {
        "id": "NODE_RUDRAPRAYAG",
        "name": "Rudraprayag Sangam Transit Junction",
        "region": "Garhwal Confluence",
        "type": "corridor_fork",
        "latitude": 30.2844,
        "longitude": 78.9811,
        "nominal_capacity": 15000,
        "feed_id": "FEED-NODE-RUDRAPRAYAG",
        "camera_name": "CCTV-RP-CHECKPOINT (Alaknanda-Mandakini Bridge)",
        "transit_waiting_factor": 0.15,
        "default_bus_capacity": 40,
        "usable_capacity_pct": 0.90,
        "initial_headcount": 620,
        "inflow_per_min": 22,
        "outflow_per_min": 19,
        "agency_passengers_expected": 140,
        "reroutes_offered": 60,
        "reroutes_accepted": 45,
        "reroutes_confirmed": 36,
        "passengers_waiting": 22,
        "passengers_boarded": 14,
        "passengers_completed": 28,
        "expected_incoming": 18,
        "available_buses": 1,
    },
    "NODE_GUPTKASHI": {
        "id": "NODE_GUPTKASHI",
        "name": "Guptkashi Staging & Helipad Hub",
        "region": "Kedar Valley",
        "type": "valley_staging",
        "latitude": 30.5228,
        "longitude": 79.0777,
        "nominal_capacity": 12000,
        "feed_id": "FEED-NODE-GUPTKASHI",
        "camera_name": "CCTV-GK-PARKING (Main Bazaar & Helipad Shuttle Bay)",
        "transit_waiting_factor": 0.18,
        "default_bus_capacity": 40,
        "usable_capacity_pct": 0.90,
        "initial_headcount": 510,
        "inflow_per_min": 18,
        "outflow_per_min": 16,
        "agency_passengers_expected": 110,
        "reroutes_offered": 55,
        "reroutes_accepted": 40,
        "reroutes_confirmed": 34,
        "passengers_waiting": 28,
        "passengers_boarded": 6,
        "passengers_completed": 20,
        "expected_incoming": 22,
        "available_buses": 1,
    },
    "NODE_SONPRAYAG": {
        "id": "NODE_SONPRAYAG",
        "name": "Sonprayag Basecamp & Shuttle Terminal",
        "region": "Kedarnath Foothill Base",
        "type": "trek_basecamp",
        "latitude": 30.6300,
        "longitude": 78.9900,
        "nominal_capacity": 18000,
        "feed_id": "FEED-NODE-SONPRAYAG",
        "camera_name": "CCTV-SP-SHUTTLE (Gaurikund Shuttle Boarding Point)",
        "transit_waiting_factor": 0.25,
        "default_bus_capacity": 40,
        "usable_capacity_pct": 0.90,
        "initial_headcount": 890,
        "inflow_per_min": 34,
        "outflow_per_min": 26,
        "agency_passengers_expected": 220,
        "reroutes_offered": 80,
        "reroutes_accepted": 65,
        "reroutes_confirmed": 52,
        "passengers_waiting": 44,
        "passengers_boarded": 8,
        "passengers_completed": 30,
        "expected_incoming": 30,
        "available_buses": 1,
    }
}


class TransitFlowService:
    def __init__(self):
        # In-memory mutable state for live demo and dynamic video ingestion
        self.nodes_state: Dict[str, dict] = {}
        self._init_state()

    def _init_state(self):
        now_iso = datetime.now(timezone.utc).isoformat()
        for node_id, raw in TRANSIT_NODES_REGISTRY.items():
            state = dict(raw)
            state["headcount"] = raw["initial_headcount"]
            state["confidence"] = 94.5
            state["last_source"] = "baseline_flow"
            state["last_updated"] = now_iso
            state["video_analysis_meta"] = None
            state["hourly_flow"] = self._generate_hourly_flow(state["headcount"])
            self.nodes_state[node_id] = self._compute_node_metrics(state)

    def _generate_hourly_flow(self, base_headcount: int) -> List[dict]:
        """Generates 24-hour flow profile based on typical transit arrival curves."""
        hourly_weights = [
            0.15, 0.10, 0.05, 0.08, 0.20, 0.45,
            0.85, 1.30, 1.65, 1.40, 1.15, 1.00,
            0.95, 0.90, 0.85, 0.95, 1.25, 1.60,
            1.75, 1.45, 1.10, 0.80, 0.50, 0.30
        ]
        history = []
        for hr, w in enumerate(hourly_weights):
            hr12 = hr if hr <= 12 else hr - 12
            hr12 = 12 if hr12 == 0 else hr12
            ampm = "AM" if hr < 12 else "PM"
            label = f"{hr12:02d}:00 {ampm}"
            flow = int(round(base_headcount * (w / 1.5)))
            history.append({
                "hour": hr,
                "label": label,
                "inflow": max(5, int(round(flow * 0.55))),
                "outflow": max(5, int(round(flow * 0.45))),
                "total_flow": flow
            })
        return history

    def _compute_node_metrics(self, node: dict) -> dict:
        """
        Dynamically computes local transport demand, bus requirements, shortage, and rationale.
        """
        headcount = node.get("headcount", 500)
        waiting = node.get("passengers_waiting", 0)
        incoming = node.get("expected_incoming", 0)
        confirmed_reroutes = node.get("reroutes_confirmed", 0)
        accepted_reroutes = node.get("reroutes_accepted", 0)
        offered_reroutes = node.get("reroutes_offered", 0)
        boarded_reroutes = node.get("passengers_boarded", 0)
        completed_reroutes = node.get("passengers_completed", 0)

        # Usable seat capacity
        bus_cap = node.get("default_bus_capacity", 40)
        usable_pct = node.get("usable_capacity_pct", 0.90)
        usable_cap = max(10, int(round(bus_cap * usable_pct))) # e.g. 36 seats

        # Expected local transit demand = waiting + incoming
        expected_demand = waiting + incoming

        # Required buses to clear the waiting queue + expected arrivals
        required_buses = max(1, math.ceil(expected_demand / usable_cap)) if expected_demand > 0 else 0
        available_buses = node.get("available_buses", 1)
        shortage = max(0, required_buses - available_buses)
        excess = max(0, available_buses - required_buses)

        # Operational status
        status = "OPTIMAL"
        if shortage >= 2:
            status = "CRITICAL_SHORTAGE"
        elif shortage == 1:
            status = "FLEET_SHORTAGE"
        elif expected_demand > usable_cap * 3:
            status = "SURGE"

        # Construct concise, clear human-readable deployment rationale
        if shortage > 0:
            rationale = (
                f"Deploy {shortage} additional local bus(es) — {waiting} passengers currently waiting, "
                f"{incoming} expected incoming, and {confirmed_reroutes} reroutes confirmed."
            )
        elif expected_demand > 0:
            rationale = (
                f"Current fleet of {available_buses} bus(es) ({available_buses * usable_cap} usable seats) "
                f"covers demand of {expected_demand} passengers ({waiting} waiting + {incoming} incoming)."
            )
        else:
            rationale = f"Nominal transit flow. {available_buses} bus(es) on standby with {available_buses * usable_cap} seat buffer."

        # Reroute funnel integrity
        funnel = {
            "offered": offered_reroutes,
            "accepted": accepted_reroutes,
            "confirmed": confirmed_reroutes,
            "waiting": waiting,
            "boarded": boarded_reroutes,
            "completed": completed_reroutes,
            "acceptance_rate_pct": round((accepted_reroutes / max(1, offered_reroutes)) * 100),
            "confirmation_rate_pct": round((confirmed_reroutes / max(1, accepted_reroutes)) * 100),
        }

        # Active alert triggers
        alerts = []
        if shortage > 0:
            alerts.append({
                "type": "FLEET_SHORTAGE",
                "severity": "CRITICAL" if shortage >= 2 else "WARNING",
                "message": f"Local transit shortage at {node['name']}: {shortage} additional bus(es) required.",
                "action": f"Dispatch {shortage} local shuttle(s) immediately"
            })
        if confirmed_reroutes >= 40:
            alerts.append({
                "type": "REROUTE_SURGE",
                "severity": "WARNING",
                "message": f"High reroute confirmation volume ({confirmed_reroutes} confirmed) converging on {node['name']}.",
                "action": "Coordinate destination sister shrine staging"
            })
        if node.get("inflow_per_min", 0) > 40:
            alerts.append({
                "type": "PASSENGER_SURGE",
                "severity": "WARNING",
                "message": f"Elevated arrival velocity: {node['inflow_per_min']} passengers/min entering station concourse.",
                "action": "Increase terminal boarding gate throughput"
            })

        node["expected_demand"] = expected_demand
        node["usable_capacity"] = usable_cap
        node["required_buses"] = required_buses
        node["shortage_buses"] = shortage
        node["excess_buses"] = excess
        node["status"] = status
        node["rationale"] = rationale
        node["funnel"] = funnel
        node["alerts"] = alerts
        return node

    def get_all_nodes(self) -> List[dict]:
        """Returns all 6 transit nodes with computed metrics."""
        return [self._compute_node_metrics(n) for n in self.nodes_state.values()]

    def get_node(self, node_id: str) -> Optional[dict]:
        """Returns detailed telemetry and fleet sizing for a specific transit node."""
        if node_id not in self.nodes_state:
            # Check for case-insensitive match
            for k, v in self.nodes_state.items():
                if k.lower() == node_id.lower() or v["name"].lower() == node_id.lower():
                    return self._compute_node_metrics(v)
            return None
        return self._compute_node_metrics(self.nodes_state[node_id])

    def update_node_from_yolo(
        self,
        node_id: str,
        fov_headcount: int,
        frame_counts: List[int],
        confidence: float = 95.0,
        video_filename: str = "cctv_feed.mp4"
    ) -> dict:
        """
        DYNAMIC VIDEO-TO-DASHBOARD INGESTION:
        Called directly when a real or uploaded video stream is processed by YOLO.
        Overwrites node headcount, computes inflow/outflow from frame delta,
        adjusts waiting passenger queues, recalculates demand and bus requirements,
        and returns updated state.
        """
        node = self.get_node(node_id)
        if not node:
            raise ValueError(f"Transit node '{node_id}' not found in registry.")

        now_iso = datetime.now(timezone.utc).isoformat()

        # Compute dynamic inflow/outflow from video frame variance
        if len(frame_counts) >= 2:
            deltas = [frame_counts[i] - frame_counts[i-1] for i in range(1, len(frame_counts))]
            pos_deltas = [d for d in deltas if d > 0]
            neg_deltas = [abs(d) for d in deltas if d < 0]
            inflow_rate = max(8, int(round((sum(pos_deltas) / max(1, len(pos_deltas))) * 6))) if pos_deltas else 25
            outflow_rate = max(6, int(round((sum(neg_deltas) / max(1, len(neg_deltas))) * 6))) if neg_deltas else 20
        else:
            inflow_rate = max(10, int(round(fov_headcount * 0.04)))
            outflow_rate = max(8, int(round(fov_headcount * 0.035)))

        # Waiting queue dynamically scales with detected station density
        waiting_factor = node.get("transit_waiting_factor", 0.12)
        dynamically_waiting = max(5, int(round(fov_headcount * waiting_factor)))

        # Expected incoming dynamically scales with inflow velocity
        dynamically_incoming = max(5, int(round(inflow_rate * 0.75)))

        # Update mutable state
        node["headcount"] = fov_headcount
        node["inflow_per_min"] = inflow_rate
        node["outflow_per_min"] = outflow_rate
        node["confidence"] = confidence
        node["passengers_waiting"] = dynamically_waiting
        node["expected_incoming"] = dynamically_incoming
        node["last_source"] = "yolo_video"
        node["last_updated"] = now_iso
        node["video_analysis_meta"] = {
            "video_file": video_filename,
            "frames_analyzed": len(frame_counts),
            "peak_fov_headcount": fov_headcount,
            "average_fov_headcount": int(round(sum(frame_counts) / len(frame_counts))) if frame_counts else fov_headcount,
            "frame_detections": frame_counts[:10],
            "inflow_per_min": inflow_rate,
            "outflow_per_min": outflow_rate,
            "timestamp": now_iso
        }

        # Update hourly flow profile with current reading
        node["hourly_flow"] = self._generate_hourly_flow(fov_headcount)

        self.nodes_state[node_id] = self._compute_node_metrics(node)
        return self.nodes_state[node_id]

    def simulate_node_observation(
        self,
        node_id: str,
        headcount: Optional[int] = None,
        passengers_waiting: Optional[int] = None,
        expected_incoming: Optional[int] = None,
        reroutes_confirmed: Optional[int] = None,
        available_buses: Optional[int] = None
    ) -> dict:
        """Allows demo simulation and live parameter tweaks."""
        node = self.get_node(node_id)
        if not node:
            raise ValueError(f"Transit node '{node_id}' not found.")

        if headcount is not None:
            node["headcount"] = headcount
            node["hourly_flow"] = self._generate_hourly_flow(headcount)
        if passengers_waiting is not None:
            node["passengers_waiting"] = passengers_waiting
        if expected_incoming is not None:
            node["expected_incoming"] = expected_incoming
        if reroutes_confirmed is not None:
            node["reroutes_confirmed"] = reroutes_confirmed
            node["reroutes_accepted"] = max(reroutes_confirmed, node.get("reroutes_accepted", 0))
            node["reroutes_offered"] = max(node["reroutes_accepted"], node.get("reroutes_offered", 0))
        if available_buses is not None:
            node["available_buses"] = available_buses

        node["last_updated"] = datetime.now(timezone.utc).isoformat()
        node["last_source"] = "demo_simulation"

        self.nodes_state[node_id] = self._compute_node_metrics(node)
        return self.nodes_state[node_id]

    def dispatch_local_buses(self, node_id: str, buses_to_deploy: int) -> dict:
        """
        Simulates deploying local shuttles/buses to a transit node.
        Increases available fleet and moves passengers from waiting to boarded.
        """
        node = self.get_node(node_id)
        if not node:
            raise ValueError(f"Transit node '{node_id}' not found.")

        deploy_count = max(1, buses_to_deploy)
        usable_cap = node.get("usable_capacity", 36)
        seats_added = deploy_count * usable_cap

        # Passengers cleared from waiting queue
        curr_waiting = node.get("passengers_waiting", 0)
        cleared = min(curr_waiting, seats_added)
        node["passengers_waiting"] = max(0, curr_waiting - cleared)
        node["passengers_boarded"] = node.get("passengers_boarded", 0) + cleared
        node["available_buses"] = node.get("available_buses", 1) + deploy_count
        node["last_updated"] = datetime.now(timezone.utc).isoformat()

        self.nodes_state[node_id] = self._compute_node_metrics(node)
        return {
            "status": "success",
            "message": f"Dispatched {deploy_count} bus(es) to {node['name']}. {cleared} passengers boarded.",
            "node": self.nodes_state[node_id]
        }


# Global singleton instance
transit_flow_service = TransitFlowService()
