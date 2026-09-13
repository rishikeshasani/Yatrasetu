"""
YatraSetu Canonical Crowd Engine & Ingestion Service
===================================================
Single shared backend source of truth for crowd state across all 25 shrines.
All observation sources (YOLO Video, Live Telemetry, Historical, Demo Simulation)
pass through this identical calculation pipeline:

  people_count + site_capacity
            ↓
  occupancy_percentage = (people_count / capacity) * 100
            ↓
  Authoritative Status Thresholds:
    < 50%    → NORMAL
    50 - <75% → MODERATE
    75 - <90% → HIGH
    ≥ 90%    → CRITICAL
            ↓
  Preserved Queue Wait Formula:
    ratio = clamp(occupancy_percentage / 100.0, 0.0, 1.0)
    wait_time_minutes = round(normal_wait + ratio * (peak_wait - normal_wait))
            ↓
  God's-Eye Command Center Contract & Multi-Tier Source Priority
"""

import os
import csv
import re
from datetime import datetime, timezone
from typing import Any, Optional, Dict, Tuple
from database import supabase, supabase_admin
from services.crowd_ml import crowd_ml_service

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
ROOT_DIR = os.path.abspath(os.path.join(BACKEND_DIR, ".."))
SPOTS_CSV_PATH = os.path.join(ROOT_DIR, "data", "tourist_spots.csv")
CROWD_CSV_PATH = os.path.join(ROOT_DIR, "data", "crowd_data.csv")

# Global authoritative in-memory observation cache
latest_observations: Dict[str, dict] = {}

LEGACY_SITE_ALIASES = {
    "site_kedarnath": "TS001",
    "site_badrinath": "TS002",
    "site_kashi": "TS003",
    "site_ayodhya": "TS004",
    "site_vaishnodevi": "TS005",
    "site_tirupati": "TS006",
    "site_puri": "TS007",
    "site_mahakaleshwar": "TS008",
    "site_goldentemple": "TS009",
    "site_meenakshi": "TS010",
}

SITE_METADATA_FALLBACK: Dict[str, dict] = {}
SITE_BASELINE_FALLBACK: Dict[str, dict] = {}

if os.path.exists(SPOTS_CSV_PATH):
    try:
        with open(SPOTS_CSV_PATH, mode="r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                s_id = row.get("spot_id")
                if s_id:
                    SITE_METADATA_FALLBACK[s_id] = {
                        "name": row.get("name", s_id),
                        "capacity": int(row.get("official_capacity_daily", 2500)),
                        "latitude": float(row.get("latitude", 0.0)),
                        "longitude": float(row.get("longitude", 0.0)),
                    }
    except Exception as e:
        print(f"[CrowdService] Error loading spots fallback from CSV: {e}")

if os.path.exists(CROWD_CSV_PATH):
    try:
        with open(CROWD_CSV_PATH, mode="r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                s_id = row.get("spot_id")
                if s_id and s_id in SITE_METADATA_FALLBACK:
                    cap = SITE_METADATA_FALLBACK[s_id]["capacity"]
                    norm_wait = int(row.get("avg_queue_time_normal_mins", 30))
                    peak_wait = max(1, int(row.get("avg_queue_time_peak_mins", 120)))
                    ratio = norm_wait / peak_wait
                    people = max(10, int(round(cap * ratio)))
                    occ = round((people / cap) * 100, 1)
                    SITE_BASELINE_FALLBACK[s_id] = {
                        "people_count": people,
                        "occupancy_percentage": occ,
                        "normal_wait": norm_wait,
                        "peak_wait": peak_wait,
                        "qms": row.get("queue_management_system", "Automated Queue Corridors"),
                        "fast_track": row.get("fast_track_details_cost", "Priority counter available") if row.get("fast_track_available") == "Yes" else "Standard queuing",
                        "peak_seasons": row.get("peak_season_months", "Peak seasons"),
                        "upcoming_festivals": row.get("peak_dates_and_festivals", "Seasonal Utsav"),
                        "weather_warnings": row.get("weather_context_and_seasonality", "Comfortable weather"),
                        "surge_triggers": row.get("surge_trigger_factors", "Aarti and weekend breaks")
                    }
    except Exception as e:
        print(f"[CrowdService] Error loading crowd baseline fallback from CSV: {e}")


def get_site_full_meta(site_id: str) -> Tuple[str, str, int, float, float]:
    """
    Resolves canonical site_id, site_name, official capacity, latitude, and longitude.
    Returns: (canonical_id, name, capacity, latitude, longitude)
    """
    canonical_id = LEGACY_SITE_ALIASES.get(site_id, site_id)
    name = canonical_id.replace("site_", "").replace("TS", "Spot ").capitalize()
    capacity = 2500
    latitude = 0.0
    longitude = 0.0

    # 1. Query Supabase 'sites' table
    try:
        res = supabase.table("sites").select("*").in_("id", [canonical_id, site_id]).execute()
        if res.data and len(res.data) > 0:
            rec = res.data[0]
            canonical_id = rec.get("id", canonical_id)
            name = rec.get("name", name)
            capacity = rec.get("capacity", capacity)
            latitude = float(rec.get("latitude") or 0.0)
            longitude = float(rec.get("longitude") or 0.0)
            # If coordinates are missing from DB, supplement from CSV metadata
            if (latitude == 0.0 and longitude == 0.0) and canonical_id in SITE_METADATA_FALLBACK:
                latitude = SITE_METADATA_FALLBACK[canonical_id]["latitude"]
                longitude = SITE_METADATA_FALLBACK[canonical_id]["longitude"]
            return canonical_id, name, capacity, latitude, longitude
    except Exception as e:
        pass

    # 2. Robust fallback from CSV metadata
    if canonical_id in SITE_METADATA_FALLBACK:
        meta = SITE_METADATA_FALLBACK[canonical_id]
        name = meta["name"]
        capacity = meta["capacity"]
        latitude = meta["latitude"]
        longitude = meta["longitude"]

    return canonical_id, name, capacity, latitude, longitude


def get_site_meta(site_id: str) -> Tuple[str, str, int]:
    """
    Backward-compatible resolver for canonical site_id, site_name, and capacity.
    Returns: (canonical_id, name, capacity)
    """
    canonical_id, name, capacity, _, _ = get_site_full_meta(site_id)
    return canonical_id, name, capacity


def calculate_occupancy_and_status(people_count: int, capacity: int) -> Tuple[float, str]:
    """
    Standardized, authoritative occupancy and status determination.
    Thresholds:
      < 50%    → NORMAL
      50 - <75% → MODERATE
      75 - <90% → HIGH
      ≥ 90%    → CRITICAL
    """
    cap = max(1, capacity)
    occupancy = round((people_count / cap) * 100, 1)
    if occupancy < 50.0:
        status = "NORMAL"
    elif occupancy < 75.0:
        status = "MODERATE"
    elif occupancy < 90.0:
        status = "HIGH"
    else:
        status = "CRITICAL"
    return occupancy, status


def calculate_queue_wait_time(occupancy_percentage: float, normal_wait: int, peak_wait: int) -> int:
    """
    Preserved canonical queue wait interpolation formula.
    ratio = clamp(occupancy_percentage / 100.0, 0.0, 1.0)
    wait_time_minutes = round(normal_wait + ratio * (peak_wait - normal_wait))
    """
    ratio = min(1.0, max(0.0, occupancy_percentage / 100.0))
    wait_mins = int(round(normal_wait + ratio * (peak_wait - normal_wait)))
    return wait_mins


def compute_deterministic_demo_occupancy(canonical_id: str, capacity: int, hour: int) -> Tuple[int, float]:
    """
    Computes a stable, deterministic crowd simulation profile based on site ID and the current hour bucket.
    Zero random numbers; stable within the same hour bucket.
    """
    ts_match = re.search(r"(\d+)", canonical_id)
    site_num = int(ts_match.group(1)) if ts_match else sum(ord(c) for c in canonical_id)

    # Base tier offsets for canonical 25 shrines
    if site_num in [1, 6]:          # Premier high-volume nodes (Kedarnath, Tirupati)
        base_occ = 72.0
    elif site_num in [3, 8, 15]:    # Major pilgrimage junctions (Kashi, Mahakaleshwar, Har Ki Pauri / Haridwar)
        base_occ = 58.0
    elif site_num in [4, 5, 7, 9]:  # Ayodhya, Vaishno Devi, Puri, Golden Temple
        base_occ = 48.0
    elif site_num in [2, 10, 12, 14]: # Badrinath, Meenakshi, Somnath, Sabarimala
        base_occ = 40.0
    elif site_num in [11, 13, 17, 25]: # Rameswaram, Shirdi, Prem Mandir, Kamakhya
        base_occ = 34.0
    else:                           # Heritage & circuit nodes (TS016, TS018 Taj, TS019-TS024)
        base_occ = 24.0

    # Diurnal pilgrimage wave (Morning aarti 6-9, midday 10-12, afternoon lull 13-15, evening aarti 16-20, night 21-5)
    if 6 <= hour <= 9:
        diurnal = 16.0
    elif 10 <= hour <= 12:
        diurnal = 8.0
    elif 13 <= hour <= 15:
        diurnal = -4.0
    elif 16 <= hour <= 20:
        diurnal = 20.0
    else:
        diurnal = -12.0

    # Deterministic pseudo-harmonic offset per site to avoid lockstep
    offset = ((site_num * 19 + hour * 11) % 21) - 10.0

    occ = max(10.0, min(96.0, round(base_occ + diurnal + offset, 1)))
    people = max(20, int(round(capacity * (occ / 100.0))))
    return people, occ


def get_site_baseline(canonical_id: str, capacity: int) -> Tuple[int, float, str]:
    """
    Computes a deterministic, legitimate site-specific baseline from official historical crowd data.
    """
    # 1. Check historical_crowd_data table in Supabase
    try:
        hist_res = supabase.table("historical_crowd_data").select("*").eq("spot_id", canonical_id).execute()
        if hist_res.data and len(hist_res.data) > 0:
            hist = hist_res.data[0]
            norm_wait = int(hist.get("avg_queue_time_normal_mins", 30))
            peak_wait = max(1, int(hist.get("avg_queue_time_peak_mins", 120)))
            ratio = norm_wait / peak_wait
            people_count = max(10, int(round(capacity * ratio)))
            occupancy, status = calculate_occupancy_and_status(people_count, capacity)
            return people_count, occupancy, status
    except Exception:
        pass

    # 2. Check local historical baseline cache from data/crowd_data.csv
    if canonical_id in SITE_BASELINE_FALLBACK:
        b = SITE_BASELINE_FALLBACK[canonical_id]
        people_count = b["people_count"]
        occupancy = b["occupancy_percentage"]
        status = "NORMAL" if occupancy < 50 else ("MODERATE" if occupancy < 75 else ("HIGH" if occupancy < 90 else "CRITICAL"))
        return people_count, occupancy, status

    # 3. Deterministic proportional fallback
    current_hour = datetime.now(timezone.utc).hour
    people_count, occupancy = compute_deterministic_demo_occupancy(canonical_id, capacity, current_hour)
    occupancy, status = calculate_occupancy_and_status(people_count, capacity)
    return people_count, occupancy, status


def is_observation_fresh(ts_val: Any, max_age_seconds: float = 900.0) -> bool:
    """
    Evaluates whether an observation timestamp is within freshness limits (default: 15 minutes / 900 seconds).
    Strictly uses timezone-aware UTC datetime comparisons to eliminate false timezone offsets.
    """
    if not ts_val:
        return True
    try:
        now_utc = datetime.now(timezone.utc)
        if isinstance(ts_val, (int, float)):
            import time
            age = time.time() - float(ts_val)
            return -5.0 <= age <= max_age_seconds

        if isinstance(ts_val, datetime):
            dt = ts_val
        else:
            ts_str = str(ts_val).strip()
            # If string ends with Z, replace with +00:00 for ISO compliance
            clean_ts = ts_str.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_ts)

        # Ensure dt is timezone-aware UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        age = (now_utc - dt).total_seconds()
        # Allow slight clock skew of up to 5 seconds into the future
        return -5.0 <= age <= max_age_seconds
    except Exception:
        return False


def process_crowd_observation(
    site_id: str,
    people_count: int,
    timestamp: str = None,
    source: str = "live_telemetry",
    zones: dict = None,
    capacity: int = None,
    camera_fov_count: int = None,
    frames_analyzed: int = None
) -> dict:
    """
    Canonical shared ingestion gateway for all observation sources.
    Ingests crowd telemetry from YOLO computer vision, live sensor feeds, or government updates.
    Eliminates calculation duplication across routes and services.
    """
    canonical_id, site_name, official_cap, latitude, longitude = get_site_full_meta(site_id)
    cap = capacity or official_cap or 2500
    if not timestamp:
        timestamp = datetime.now(timezone.utc).isoformat()

    occupancy, status = calculate_occupancy_and_status(people_count, cap)

    # Queue times retrieval
    normal_wait = 25
    peak_wait = 120
    if canonical_id in SITE_BASELINE_FALLBACK:
        b = SITE_BASELINE_FALLBACK[canonical_id]
        normal_wait = b.get("normal_wait", 25)
        peak_wait = b.get("peak_wait", 120)

    wait_mins = calculate_queue_wait_time(occupancy, normal_wait, peak_wait)

    source_label = "YOLO Video" if source == "yolo_video" else ("Live Telemetry" if source == "live_telemetry" else "Demo Simulation")

    obs = {
        "site_id": site_id,
        "canonical_id": canonical_id,
        "site_name": site_name,
        "latitude": latitude,
        "longitude": longitude,
        "people_count": people_count,
        "capacity": cap,
        "occupancy_percentage": occupancy,
        "status": status,
        "wait_time_minutes": wait_mins,
        "normal_wait": normal_wait,
        "peak_wait": peak_wait,
        "zones": zones or {},
        "source": source,
        "relative_surge_alert": crowd_ml_service.check_relative_surge(site_id, people_count, capacity=cap),
        "last_updated": f"Just now ({source_label})",
        "timestamp": timestamp
    }

    if camera_fov_count is not None:
        obs["camera_fov_count"] = camera_fov_count
    if frames_analyzed is not None:
        obs["frames_analyzed"] = frames_analyzed

    # Save to canonical in-memory registries
    # Prevent lower-priority GPS observations from overwriting active higher-priority YOLO or live telemetry observations
    existing = latest_observations.get(canonical_id) or latest_observations.get(site_id)
    if source in ["gps_crowd", "gps_crowd_demo"] and existing:
        if existing.get("source") in ["yolo_video", "live_telemetry"] and is_observation_fresh(existing.get("timestamp")):
            pass
        else:
            latest_observations[site_id] = obs
            latest_observations[canonical_id] = obs
    else:
        latest_observations[site_id] = obs
        latest_observations[canonical_id] = obs

    # Defensive background DB record insert:
    # Attempts insertion with 'source' column first. If the DB schema lacks 'source',
    # cleanly falls back to inserting without 'source' without failing.
    queue_len = (zones or {}).get("Queue Chokepoint", 0)
    try:
        supabase_admin.table("crowd_observations").insert({
            "site_id": canonical_id,
            "people_count": people_count,
            "queue_length": queue_len,
            "source": source,
            "timestamp": timestamp
        }).execute()
    except Exception as e:
        try:
            supabase_admin.table("crowd_observations").insert({
                "site_id": canonical_id,
                "people_count": people_count,
                "queue_length": queue_len,
                "timestamp": timestamp
            }).execute()
        except Exception as inner_e:
            pass

    return obs


def resolve_site_crowd_state(site_id: str) -> dict:
    """
    Unified authoritative crowd state resolver adhering to strict 4-tier precedence:
      Priority 1: Fresh YOLO observation (source: 'yolo_video') within 900s
      Priority 2: Fresh real/government/live telemetry observation (source: 'live_telemetry') within 900s
      Priority 3: Grounded historical baseline (source: 'historical_baseline' / 'historical')
      Priority 4: Deterministic demo simulation fallback (source: 'demo_simulation')

    Strictly satisfies the God's-Eye Command Center contract:
    { site_id, site_name, latitude, longitude, people_count, capacity, occupancy_percentage, status, source, timestamp, wait_time_minutes }
    """
    canonical_id, site_name, capacity, latitude, longitude = get_site_full_meta(site_id)

    # Retrieve official queue baseline parameters
    normal_wait = 25
    peak_wait = 120
    if canonical_id in SITE_BASELINE_FALLBACK:
        b = SITE_BASELINE_FALLBACK[canonical_id]
        normal_wait = b.get("normal_wait", 25)
        peak_wait = b.get("peak_wait", 120)
    else:
        try:
            hist_res = supabase.table("historical_crowd_data").select("avg_queue_time_normal_mins, avg_queue_time_peak_mins").eq("spot_id", canonical_id).limit(1).execute()
            if hist_res.data and len(hist_res.data) > 0:
                normal_wait = int(hist_res.data[0].get("avg_queue_time_normal_mins", 25))
                peak_wait = max(1, int(hist_res.data[0].get("avg_queue_time_peak_mins", 120)))
        except Exception:
            pass

    now_utc = datetime.now(timezone.utc)
    lookup_keys = [site_id, canonical_id]

    # Check for fresh YOLO observation
    yolo_obs = None
    for k in lookup_keys:
        if k in latest_observations:
            c = latest_observations[k]
            if c.get("source") == "yolo_video" and is_observation_fresh(c.get("timestamp")):
                yolo_obs = c
                break

    # Check for fresh GPS crowd observation
    from services.gps_crowd_service import gps_crowd_service
    gps_obs = gps_crowd_service.get_latest_gps_observation(canonical_id)
    if not gps_obs:
        for k in lookup_keys:
            if k in latest_observations:
                c = latest_observations[k]
                if c.get("source") in ["gps_crowd", "gps_crowd_demo"] and is_observation_fresh(c.get("timestamp")):
                    gps_obs = {
                        "active_device_count": c.get("active_device_count", int(round(c.get("people_count", 0) / 1.2))),
                        "gps_estimated_people": c.get("people_count", 0),
                        "device_to_person_factor": 1.2,
                        "source": c.get("source"),
                        "timestamp": c.get("timestamp")
                    }
                    break

    # Multi-Source Fusion: When both fresh YOLO and fresh GPS signals exist
    if yolo_obs and gps_obs:
        fused_count, fused_source, fusion_meta = gps_crowd_service.compute_multi_source_fusion(yolo_obs, gps_obs)
        occupancy, status = calculate_occupancy_and_status(fused_count, capacity)
        wait_mins = calculate_queue_wait_time(occupancy, normal_wait, peak_wait)
        res = {
            "site_id": site_id,
            "canonical_id": canonical_id,
            "site_name": site_name,
            "latitude": latitude,
            "longitude": longitude,
            "people_count": fused_count,
            "capacity": capacity,
            "occupancy_percentage": occupancy,
            "status": status,
            "wait_time_minutes": wait_mins,
            "normal_wait": normal_wait,
            "peak_wait": peak_wait,
            "source": fused_source,
            "relative_surge_alert": crowd_ml_service.check_relative_surge(site_id, fused_count, capacity=capacity),
            "last_updated": "Just now (Fused YOLO + GPS)",
            "timestamp": now_utc.isoformat(),
            "yolo_people_count": fusion_meta.get("yolo_people_count"),
            "gps_active_devices": fusion_meta.get("gps_active_devices"),
            "gps_estimated_people": fusion_meta.get("gps_estimated_people"),
            "fused_people_count": fused_count,
            "fusion_applied": True,
            "fusion_metadata": fusion_meta
        }
        if "camera_fov_count" in yolo_obs:
            res["camera_fov_count"] = yolo_obs["camera_fov_count"]
        return res

    # Priority 1: Fresh YOLO observation in memory (when GPS is not available)
    if yolo_obs:
        people_count = yolo_obs["people_count"]
        occupancy = yolo_obs["occupancy_percentage"]
        status = yolo_obs["status"]
        wait_mins = calculate_queue_wait_time(occupancy, normal_wait, peak_wait)
        res = {
            "site_id": site_id,
            "canonical_id": canonical_id,
            "site_name": site_name,
            "latitude": latitude,
            "longitude": longitude,
            "people_count": people_count,
            "capacity": capacity,
            "occupancy_percentage": occupancy,
            "status": status,
            "wait_time_minutes": wait_mins,
            "normal_wait": normal_wait,
            "peak_wait": peak_wait,
            "source": "yolo_video",
            "relative_surge_alert": yolo_obs.get("relative_surge_alert") or crowd_ml_service.check_relative_surge(site_id, people_count, capacity=capacity),
            "last_updated": yolo_obs.get("last_updated", "Just now (YOLO Video)"),
            "timestamp": yolo_obs.get("timestamp") or now_utc.isoformat(),
            "yolo_people_count": people_count,
            "fusion_applied": False
        }
        if "camera_fov_count" in yolo_obs:
            res["camera_fov_count"] = yolo_obs["camera_fov_count"]
        if "frames_analyzed" in yolo_obs:
            res["frames_analyzed"] = yolo_obs["frames_analyzed"]
        return res

    # Priority 2: Fresh real/government live telemetry observation in memory
    for k in lookup_keys:
        if k in latest_observations:
            cached = latest_observations[k]
            if cached.get("source") in ["live_telemetry", "government"]:
                if is_observation_fresh(cached.get("timestamp")):
                    people_count = cached["people_count"]
                    occupancy = cached["occupancy_percentage"]
                    status = cached["status"]
                    wait_mins = calculate_queue_wait_time(occupancy, normal_wait, peak_wait)
                    return {
                        "site_id": site_id,
                        "canonical_id": canonical_id,
                        "site_name": site_name,
                        "latitude": latitude,
                        "longitude": longitude,
                        "people_count": people_count,
                        "capacity": capacity,
                        "occupancy_percentage": occupancy,
                        "status": status,
                        "wait_time_minutes": wait_mins,
                        "normal_wait": normal_wait,
                        "peak_wait": peak_wait,
                        "source": "live_telemetry",
                        "relative_surge_alert": cached.get("relative_surge_alert") or crowd_ml_service.check_relative_surge(site_id, people_count, capacity=capacity),
                        "last_updated": cached.get("last_updated", "Just now (Live Telemetry)"),
                        "timestamp": cached.get("timestamp") or now_utc.isoformat()
                    }

    # Priority 3: Fresh GPS crowd observation (when YOLO and Live Telemetry in memory are absent)
    if gps_obs:
        people_count = gps_obs["gps_estimated_people"]
        occupancy, status = calculate_occupancy_and_status(people_count, capacity)
        wait_mins = calculate_queue_wait_time(occupancy, normal_wait, peak_wait)
        source = gps_obs.get("source", "gps_crowd")
        source_label = "Mobile GPS Geofence (Demo)" if "demo" in source else "Mobile GPS Geofence"
        return {
            "site_id": site_id,
            "canonical_id": canonical_id,
            "site_name": site_name,
            "latitude": latitude,
            "longitude": longitude,
            "people_count": people_count,
            "capacity": capacity,
            "occupancy_percentage": occupancy,
            "status": status,
            "wait_time_minutes": wait_mins,
            "normal_wait": normal_wait,
            "peak_wait": peak_wait,
            "source": source,
            "gps_active_devices": gps_obs.get("active_device_count", 0),
            "gps_estimated_people": people_count,
            "fusion_applied": False,
            "relative_surge_alert": crowd_ml_service.check_relative_surge(site_id, people_count, capacity=capacity),
            "last_updated": f"Just now ({source_label})",
            "timestamp": gps_obs.get("timestamp") or now_utc.isoformat()
        }

    # Priority 4: Check Supabase crowd_observations table for fresh observation
    try:
        res = supabase.table("crowd_observations").select("*").in_("site_id", lookup_keys).order("id", desc=True).limit(1).execute()
        if res.data and len(res.data) > 0:
            latest = res.data[0]
            if is_observation_fresh(latest.get("timestamp")):
                people_count = latest["people_count"]
                occupancy, status = calculate_occupancy_and_status(people_count, capacity)
                wait_mins = calculate_queue_wait_time(occupancy, normal_wait, peak_wait)
                db_source = latest.get("source") or "live_telemetry"
                return {
                    "site_id": site_id,
                    "canonical_id": canonical_id,
                    "site_name": site_name,
                    "latitude": latitude,
                    "longitude": longitude,
                    "people_count": people_count,
                    "capacity": capacity,
                    "occupancy_percentage": occupancy,
                    "status": status,
                    "wait_time_minutes": wait_mins,
                    "normal_wait": normal_wait,
                    "peak_wait": peak_wait,
                    "source": db_source,
                    "relative_surge_alert": crowd_ml_service.check_relative_surge(site_id, people_count, capacity=capacity),
                    "last_updated": f"Recent ({latest.get('timestamp', '')[:16]})",
                    "timestamp": latest.get("timestamp") or now_utc.isoformat()
                }
    except Exception:
        pass

    # Priority 4: Historical baseline observation in memory
    for k in lookup_keys:
        if k in latest_observations:
            cached = latest_observations[k]
            if cached.get("source") in ["historical", "historical_baseline"]:
                people_count = cached["people_count"]
                occupancy = cached.get("occupancy_percentage") or round((people_count / max(1, capacity)) * 100, 1)
                status = cached.get("status") or ("NORMAL" if occupancy < 50 else ("MODERATE" if occupancy < 75 else ("HIGH" if occupancy < 90 else "CRITICAL")))
                wait_mins = calculate_queue_wait_time(occupancy, normal_wait, peak_wait)
                return {
                    "site_id": site_id,
                    "canonical_id": canonical_id,
                    "site_name": site_name,
                    "latitude": latitude,
                    "longitude": longitude,
                    "people_count": people_count,
                    "capacity": capacity,
                    "occupancy_percentage": occupancy,
                    "status": status,
                    "wait_time_minutes": wait_mins,
                    "normal_wait": normal_wait,
                    "peak_wait": peak_wait,
                    "source": "historical_baseline",
                    "relative_surge_alert": cached.get("relative_surge_alert") or crowd_ml_service.check_relative_surge(site_id, people_count, capacity=capacity),
                    "last_updated": cached.get("last_updated", "Historical Baseline Dataset"),
                    "timestamp": cached.get("timestamp") or now_utc.isoformat()
                }

    # Priority 5: Deterministic demo simulation fallback
    current_hour = now_utc.hour
    people_count, occupancy = compute_deterministic_demo_occupancy(canonical_id, capacity, current_hour)
    occupancy, status = calculate_occupancy_and_status(people_count, capacity)
    wait_mins = calculate_queue_wait_time(occupancy, normal_wait, peak_wait)

    return {
        "site_id": site_id,
        "canonical_id": canonical_id,
        "site_name": site_name,
        "latitude": latitude,
        "longitude": longitude,
        "people_count": people_count,
        "capacity": capacity,
        "occupancy_percentage": occupancy,
        "status": status,
        "wait_time_minutes": wait_mins,
        "normal_wait": normal_wait,
        "peak_wait": peak_wait,
        "source": "demo_simulation",
        "relative_surge_alert": {
            "site_id": site_id,
            "is_relative_surge": (status in ["HIGH", "CRITICAL"]),
            "severity": status,
            "current_count": people_count,
            "expected_mean": float(int(capacity * 0.45)),
            "z_score": 1.85 if status == "CRITICAL" else (1.15 if status == "HIGH" else 0.2),
            "surge_percentage": f"+{int(occupancy - 45)}%" if occupancy > 45 else "+0%",
            "message": f"Demonstration surge model: {status} crowd flow estimated for {current_hour:02d}:00 bucket."
        },
        "last_updated": f"Demo Simulation ({current_hour:02d}:00 Bucket)",
        "timestamp": now_utc.isoformat()
    }
