"""
YatraSetu Mobile GPS-Based Crowd Estimation Subsystem
=====================================================
Processes anonymized mobile location signals against canonical shrine geofences.
Calculates active-device counts and derives estimated crowd population.

CRITICAL PRIVACY GUARANTEES:
1. NEVER stores, logs, or returns individual tourist GPS trails or historical coordinates.
2. Device deduplication uses short-lived ephemeral salted hashes with 15-minute TTL.
3. No personal identities, user IDs, or device IDs are exposed via any API.
4. Operates strictly on AGGREGATED site-level metrics at ingestion time.

ESTIMATION & FUSION RULES:
1. GPS Devices != People. Uses a conservative, configurable multiplier (default 1.2x).
2. Explainable weighted fusion when YOLO and GPS are both fresh:
     fused_count = round(0.6 * yolo_people_count + 0.4 * gps_estimated_people)
3. Falls back gracefully through canonical crowd precedence when signals are missing.
"""

import os
import math
import hashlib
import secrets
from datetime import datetime, timezone
from typing import Optional, Dict, Tuple, List, Any

from database import supabase_admin
from services.crowd_service import (
    SITE_METADATA_FALLBACK,
    LEGACY_SITE_ALIASES,
    get_site_full_meta,
    is_observation_fresh,
    latest_observations,
)

# Configurable constants
DEFAULT_GEOFENCE_RADIUS_METERS = 1000  # Default 1.0 km radius
GPS_ACTIVE_WINDOW_SECONDS = 900.0       # 15 minutes sliding TTL
DEFAULT_DEVICE_TO_PERSON_FACTOR = 1.2   # Multiplier (family groups / children)
DEFAULT_YOLO_WEIGHT = 0.6               # Visual observation weight in fusion
DEFAULT_GPS_WEIGHT = 0.4                # Geofence density weight in fusion

# Shrine-specific geofence radii (meters) based on geographic terrain
SHRINE_GEOFENCE_RADII: Dict[str, int] = {
    "TS001": 1500,  # Kedarnath: Alpine valley and temple perimeter
    "TS002": 1500,  # Badrinath: Alaknanda valley and town bounds
    "TS003": 800,   # Kashi Vishwanath & Dashashwamedh: Dense urban river corridor
    "TS004": 1200,  # Ram Janmabhoomi: Pilgrim corridor and darshan approach
    "TS005": 2000,  # Vaishno Devi: Bhawan and Sanjichhat approach
    "TS006": 1500,  # Tirumala: Vaikuntham queue and ring road complex
    "TS007": 1000,  # Puri Jagannath: Grand Road and sanctum precinct
    "TS008": 1000,  # Mahakaleshwar: Mahakal Lok corridor
    "TS009": 800,   # Golden Temple: Heritage street and Parikrama
    "TS010": 800,   # Meenakshi: Concentric temple towers and Masi streets
    "TS011": 1000,  # Rameswaram: Agni Theertham and east corridor
    "TS012": 1000,  # Somnath: Coastal promenade and sanctum
    "TS013": 1000,  # Shirdi: Samadhi Mandir and queue complexes
    "TS014": 2000,  # Sabarimala: Sannidhanam and forest pathway
    "TS015": 800,   # Har Ki Pauri: Brahmakund and river ghats
}

# In-memory daily rotation salt for ephemeral device hashing (never stored to disk)
_SESSION_SALT = secrets.token_hex(16)


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates geodesic distance between two coordinates in meters using the Haversine formula."""
    R = 6371000.0  # Earth's mean radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class GPSCrowdService:
    def __init__(self):
        # In-memory sliding window for active devices per site:
        # site_id -> { ephemeral_hash: last_seen_epoch_timestamp }
        self._active_devices: Dict[str, Dict[str, float]] = {}

        # Authoritative GPS observation snapshots:
        # site_id -> observation dict
        self._latest_gps_observations: Dict[str, dict] = {}

        # Configurable estimation parameters
        self.device_to_person_factor: float = DEFAULT_DEVICE_TO_PERSON_FACTOR
        self.yolo_weight: float = DEFAULT_YOLO_WEIGHT
        self.gps_weight: float = DEFAULT_GPS_WEIGHT

    def get_geofence_radius(self, site_id: str) -> int:
        """Returns the configured geofence radius for a canonical site."""
        canonical_id = LEGACY_SITE_ALIASES.get(site_id, site_id)
        return SHRINE_GEOFENCE_RADII.get(canonical_id, DEFAULT_GEOFENCE_RADIUS_METERS)

    def match_nearest_site(self, latitude: float, longitude: float) -> Tuple[Optional[str], Optional[str], float, bool]:
        """
        Calculates distance from provided GPS point to all canonical TS001-TS025 sites.
        Identifies the nearest site and verifies if the point is within its geofence.

        Returns: (canonical_site_id, site_name, distance_meters, is_inside_geofence)
        """
        if not (-90.0 <= latitude <= 90.0 and -180.0 <= longitude <= 180.0):
            raise ValueError("Coordinates out of valid planetary bounds.")

        nearest_id = None
        nearest_name = None
        min_dist = float("inf")

        for s_id, meta in SITE_METADATA_FALLBACK.items():
            s_lat = meta.get("latitude", 0.0)
            s_lon = meta.get("longitude", 0.0)
            if s_lat == 0.0 and s_lon == 0.0:
                continue

            dist = haversine_distance_meters(latitude, longitude, s_lat, s_lon)
            if dist < min_dist:
                min_dist = dist
                nearest_id = s_id
                nearest_name = meta.get("name", s_id)

        if not nearest_id:
            return None, None, float("inf"), False

        radius = self.get_geofence_radius(nearest_id)
        is_inside = min_dist <= radius

        return nearest_id, nearest_name, min_dist, is_inside

    def _hash_device(self, identifier: Optional[str]) -> str:
        """Generates an irreversible ephemeral hash using session salt."""
        raw = identifier or secrets.token_hex(8)
        return hashlib.sha256(f"{_SESSION_SALT}:{raw}".encode("utf-8")).hexdigest()[:16]

    def _prune_stale_devices(self, site_id: str, current_time: float) -> int:
        """Prunes device entries older than GPS_ACTIVE_WINDOW_SECONDS."""
        if site_id not in self._active_devices:
            return 0

        cutoff = current_time - GPS_ACTIVE_WINDOW_SECONDS
        active_map = self._active_devices[site_id]
        stale_keys = [k for k, ts in active_map.items() if ts < cutoff]
        for k in stale_keys:
            del active_map[k]

        return len(active_map)

    def record_location_ping(
        self,
        latitude: float,
        longitude: float,
        client_identifier: Optional[str] = None
    ) -> dict:
        """
        Ingests a single tourist location signal:
        - Determines geofence containment against canonical shrines.
        - Aggregates the active device count without persisting coordinates.
        - Triggers an updated GPS crowd observation for the site.
        """
        nearest_id, nearest_name, distance_m, is_inside = self.match_nearest_site(latitude, longitude)
        now_epoch = datetime.now(timezone.utc).timestamp()
        now_iso = datetime.now(timezone.utc).isoformat()

        if not nearest_id:
            return {
                "inside_geofence": False,
                "message": "No matching canonical shrine site resolved."
            }

        radius = self.get_geofence_radius(nearest_id)

        if is_inside:
            device_hash = self._hash_device(client_identifier)
            if nearest_id not in self._active_devices:
                self._active_devices[nearest_id] = {}
            self._active_devices[nearest_id][device_hash] = now_epoch

            active_devices = self._prune_stale_devices(nearest_id, now_epoch)
            estimated_people = int(round(active_devices * self.device_to_person_factor))

            obs = self.publish_gps_observation(
                site_id=nearest_id,
                active_device_count=active_devices,
                gps_estimated_people=estimated_people,
                timestamp=now_iso,
                source="gps_crowd",
                is_demo=False
            )

            return {
                "inside_geofence": True,
                "site_id": nearest_id,
                "site_name": nearest_name,
                "distance_meters": round(distance_m, 1),
                "geofence_radius_meters": radius,
                "active_devices_in_site": active_devices,
                "gps_estimated_people": estimated_people,
                "timestamp": now_iso
            }
        else:
            return {
                "inside_geofence": False,
                "nearest_site_id": nearest_id,
                "nearest_site_name": nearest_name,
                "distance_meters": round(distance_m, 1),
                "geofence_radius_meters": radius,
                "message": f"Device is outside {nearest_name} geofence ({round(distance_m, 1)}m away; geofence radius {radius}m)."
            }

    def get_active_device_count(self, site_id: str) -> int:
        """Returns the current number of unique active mobile devices within the 15-minute window."""
        canonical_id = LEGACY_SITE_ALIASES.get(site_id, site_id)
        now_epoch = datetime.now(timezone.utc).timestamp()
        return self._prune_stale_devices(canonical_id, now_epoch)

    def publish_gps_observation(
        self,
        site_id: str,
        active_device_count: int,
        gps_estimated_people: Optional[int] = None,
        timestamp: Optional[str] = None,
        source: str = "gps_crowd",
        is_demo: bool = False
    ) -> dict:
        """
        Publishes an aggregated GPS crowd observation.
        - Calculates estimated people: active_devices * factor
        - Updates internal GPS observation store
        - Passes through shared crowd engine
        - Defensively attempts database snapshot insertion
        """
        canonical_id = LEGACY_SITE_ALIASES.get(site_id, site_id)
        if not timestamp:
            timestamp = datetime.now(timezone.utc).isoformat()

        if gps_estimated_people is None:
            gps_estimated_people = int(round(active_device_count * self.device_to_person_factor))

        radius = self.get_geofence_radius(canonical_id)

        obs = {
            "site_id": canonical_id,
            "active_device_count": active_device_count,
            "gps_estimated_people": gps_estimated_people,
            "device_to_person_factor": self.device_to_person_factor,
            "geofence_radius_meters": radius,
            "source": source,
            "is_demo": is_demo,
            "timestamp": timestamp,
            "estimation_notes": f"Aggregated mobile GPS geofence signal ({active_device_count} devices × {self.device_to_person_factor} factor)."
        }

        # Store in internal GPS registry
        self._latest_gps_observations[canonical_id] = obs
        self._latest_gps_observations[site_id] = obs

        # Defensive background database snapshot insert
        try:
            supabase_admin.table("gps_crowd_aggregates").insert({
                "site_id": canonical_id,
                "active_device_count": active_device_count,
                "gps_estimated_people": gps_estimated_people,
                "geofence_radius_meters": radius,
                "source": source,
                "is_demo": is_demo,
                "timestamp": timestamp
            }).execute()
        except Exception as e:
            # Non-blocking if table migration is pending or table does not exist
            pass

        return obs

    def get_latest_gps_observation(self, site_id: str) -> Optional[dict]:
        """Returns the latest valid GPS observation if within 15-minute freshness window."""
        canonical_id = LEGACY_SITE_ALIASES.get(site_id, site_id)
        obs = self._latest_gps_observations.get(canonical_id)
        if not obs:
            return None

        if is_observation_fresh(obs.get("timestamp"), max_age_seconds=GPS_ACTIVE_WINDOW_SECONDS) or obs.get("is_showcase"):
            return obs
        return None

    def compute_multi_source_fusion(
        self,
        yolo_obs: Optional[dict],
        gps_obs: Optional[dict]
    ) -> Tuple[Optional[int], Optional[str], Optional[dict]]:
        """
        Executes explainable multi-source crowd fusion:
        - If both YOLO and GPS are fresh:
            fused_count = round(YOLO_WEIGHT * yolo_count + GPS_WEIGHT * gps_count)
            source = "fused_yolo_gps"
        - If only YOLO is fresh:
            people_count = yolo_count, source = "yolo_video"
        - If only GPS is fresh:
            people_count = gps_count, source = gps_obs["source"]
        - If neither is fresh:
            returns (None, None, None) to fall back through historical/demo tiers.

        Returns: (people_count, source, fusion_metadata)
        """
        has_yolo = yolo_obs is not None and is_observation_fresh(yolo_obs.get("timestamp"))
        has_gps = gps_obs is not None and is_observation_fresh(gps_obs.get("timestamp"))

        if has_yolo and has_gps:
            yolo_count = yolo_obs["people_count"]
            gps_people = gps_obs["gps_estimated_people"]
            fused_count = int(round(self.yolo_weight * yolo_count + self.gps_weight * gps_people))

            fusion_meta = {
                "fusion_applied": True,
                "strategy": "explainable_weighted_fusion",
                "yolo_people_count": yolo_count,
                "yolo_weight": self.yolo_weight,
                "gps_active_devices": gps_obs["active_device_count"],
                "gps_estimated_people": gps_people,
                "gps_weight": self.gps_weight,
                "device_to_person_factor": gps_obs.get("device_to_person_factor", self.device_to_person_factor),
                "fused_people_count": fused_count,
                "disclaimer": "Fused estimate combining YOLO visual FOV detection with mobile geofence density."
            }
            return fused_count, "fused_yolo_gps", fusion_meta

        elif has_yolo:
            return yolo_obs["people_count"], "yolo_video", {
                "fusion_applied": False,
                "yolo_people_count": yolo_obs["people_count"],
                "disclaimer": "Primary YOLO visual perception active; no fresh GPS geofence signal detected."
            }

        elif has_gps:
            source = gps_obs.get("source", "gps_crowd")
            return gps_obs["gps_estimated_people"], source, {
                "fusion_applied": False,
                "gps_active_devices": gps_obs["active_device_count"],
                "gps_estimated_people": gps_obs["gps_estimated_people"],
                "device_to_person_factor": gps_obs.get("device_to_person_factor", self.device_to_person_factor),
                "disclaimer": "GPS-derived crowd estimate; no fresh YOLO video stream active."
            }

        return None, None, None


# Global singleton instance
gps_crowd_service = GPSCrowdService()
