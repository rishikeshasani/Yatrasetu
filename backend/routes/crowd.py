import os
import csv
import re
from datetime import datetime
from typing import Any, Optional, Dict, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import supabase, supabase_admin
from dependencies import require_role, AuthenticatedUser
from services.crowd_ml import crowd_ml_service


router = APIRouter()

latest_observations: dict[str, dict] = {}

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SPOTS_CSV_PATH = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "data", "tourist_spots.csv"))
CROWD_CSV_PATH = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "data", "crowd_data.csv"))

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

SITE_METADATA_FALLBACK = {}
SITE_BASELINE_FALLBACK = {}

if os.path.exists(SPOTS_CSV_PATH):
    try:
        with open(SPOTS_CSV_PATH, mode="r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                s_id = row.get("spot_id")
                if s_id:
                    SITE_METADATA_FALLBACK[s_id] = {
                        "name": row.get("name", s_id),
                        "capacity": int(row.get("official_capacity_daily", 2500))
                    }
    except Exception as e:
        print(f"Error loading spots fallback: {e}")

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
        print(f"Error loading crowd baseline fallback: {e}")


def get_site_meta(site_id: str) -> tuple[str, str, int]:
    """
    Resolves canonical site_id, site_name, and official capacity.
    Source of truth is the Supabase 'sites' table, with data/tourist_spots.csv as robust fallback.
    """
    canonical_id = LEGACY_SITE_ALIASES.get(site_id, site_id)
    name = canonical_id.replace("site_", "").replace("TS", "Spot ").capitalize()
    capacity = 2500

    # 1. Query Supabase 'sites' table
    try:
        res = supabase.table("sites").select("*").in_("id", [canonical_id, site_id]).execute()
        if res.data and len(res.data) > 0:
            rec = res.data[0]
            canonical_id = rec.get("id", canonical_id)
            name = rec.get("name", name)
            capacity = rec.get("capacity", capacity)
            return canonical_id, name, capacity
    except Exception as e:
        print(f"Error querying sites table for {site_id}: {e}")

    # 2. Robust fallback from CSV metadata
    if canonical_id in SITE_METADATA_FALLBACK:
        meta = SITE_METADATA_FALLBACK[canonical_id]
        name = meta["name"]
        capacity = meta["capacity"]

    return canonical_id, name, capacity


def compute_deterministic_demo_occupancy(canonical_id: str, capacity: int, hour: int) -> tuple[int, float]:
    """
    Computes a stable, deterministic crowd simulation profile based on site ID and the current hour bucket.
    Zero random numbers; stable within the same hour bucket.
    Yields realistic pilgrimage distribution across NORMAL, MODERATE, HIGH, and CRITICAL.
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


def get_site_baseline(canonical_id: str, capacity: int) -> tuple[int, float, str]:
    """
    Computes a deterministic, legitimate site-specific baseline from official historical crowd data.
    Never returns universal 1200 or 48.0%.
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
            occupancy = round((people_count / capacity) * 100, 1)
            status = "NORMAL" if occupancy < 50 else ("MODERATE" if occupancy < 75 else ("HIGH" if occupancy < 90 else "CRITICAL"))
            return people_count, occupancy, status
    except Exception as e:
        print(f"Error querying historical_crowd_data for {canonical_id}: {e}")

    # 2. Check local historical baseline cache from data/crowd_data.csv
    if canonical_id in SITE_BASELINE_FALLBACK:
        b = SITE_BASELINE_FALLBACK[canonical_id]
        people_count = b["people_count"]
        occupancy = b["occupancy_percentage"]
        status = "NORMAL" if occupancy < 50 else ("MODERATE" if occupancy < 75 else ("HIGH" if occupancy < 90 else "CRITICAL"))
        return people_count, occupancy, status

    # 3. Deterministic proportional fallback if spot has no queue data
    current_hour = datetime.now().hour
    people_count, occupancy = compute_deterministic_demo_occupancy(canonical_id, capacity, current_hour)
    status = "NORMAL" if occupancy < 50 else ("MODERATE" if occupancy < 75 else ("HIGH" if occupancy < 90 else "CRITICAL"))
    return people_count, occupancy, status


def process_crowd_observation(
    site_id: str,
    people_count: int,
    timestamp: str = None,
    source: str = "live_telemetry",
    zones: dict = None,
    capacity: int = None
) -> dict:
    """
    Shared backend logic for ingesting crowd telemetry from YOLO computer vision,
    live sensor telemetry, or government command updates.
    Eliminates internal HTTP loopbacks and standardizes observation state.
    """
    canonical_id, site_name, official_cap = get_site_meta(site_id)
    cap = capacity or official_cap or 2500
    if not timestamp:
        timestamp = datetime.utcnow().isoformat()

    occupancy = round((people_count / cap) * 100, 1)
    if occupancy < 50:
        status = "NORMAL"
    elif occupancy < 75:
        status = "MODERATE"
    elif occupancy < 90:
        status = "HIGH"
    else:
        status = "CRITICAL"

    source_label = "YOLO Video" if source == "yolo_video" else ("Live Telemetry" if source == "live_telemetry" else "Demo Simulation")

    obs = {
        "site_id": site_id,
        "canonical_id": canonical_id,
        "site_name": site_name,
        "people_count": people_count,
        "capacity": cap,
        "occupancy_percentage": occupancy,
        "status": status,
        "zones": zones or {},
        "source": source,
        "relative_surge_alert": crowd_ml_service.check_relative_surge(site_id, people_count, capacity=cap),
        "last_updated": f"Just now ({source_label})",
        "timestamp": timestamp
    }

    latest_observations[site_id] = obs
    latest_observations[canonical_id] = obs

    # Background DB record insert (best effort)
    try:
        supabase_admin.table("crowd_observations").insert({
            "site_id": canonical_id,
            "people_count": people_count,
            "queue_length": (zones or {}).get("Queue Chokepoint", 0),
            "timestamp": timestamp
        }).execute()
    except Exception as e:
        print(f"Notice: background crowd_observations insert: {e}")

    return obs


def is_observation_fresh(ts_val: Any, max_age_seconds: float = 900.0) -> bool:
    if not ts_val:
        return True
    try:
        from datetime import timezone
        now_utc = datetime.now(timezone.utc)
        if isinstance(ts_val, (int, float)):
            import time
            age = time.time() - float(ts_val)
            return -5.0 <= age <= max_age_seconds
        if isinstance(ts_val, datetime):
            dt = ts_val
        else:
            clean_ts = str(ts_val).replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_ts)

        if dt.tzinfo is not None:
            age = (now_utc - dt).total_seconds()
            return -5.0 <= age <= max_age_seconds
        else:
            age_loc = (datetime.now() - dt).total_seconds()
            return -5.0 <= age_loc <= max_age_seconds
    except Exception:
        return False


def resolve_site_crowd_state(site_id: str) -> dict:
    """
    Unified authoritative crowd state resolver.
    Precedence Order:
      A. Fresh YOLO observation (source: 'yolo_video')
      B. Fresh real/government/live telemetry observation (source: 'live_telemetry')
      C. Historical baseline (source: 'historical')
      D. Deterministic demo simulation fallback (source: 'demo_simulation')

    Preserves normal_wait and peak_wait queue interpolation parameters strictly.
    """
    canonical_id, site_name, capacity = get_site_meta(site_id)

    # 1. Retrieve official queue baseline parameters
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

    now = datetime.now()
    lookup_keys = [site_id, canonical_id]

    # Precedence A: Fresh YOLO observation in memory
    for k in lookup_keys:
        if k in latest_observations:
            cached = latest_observations[k]
            if cached.get("source") == "yolo_video":
                if is_observation_fresh(cached.get("timestamp")):
                    people_count = cached["people_count"]
                    occupancy = cached["occupancy_percentage"]
                    status = cached["status"]
                    ratio = min(1.0, max(0.0, occupancy / 100.0))
                    wait_mins = int(round(normal_wait + ratio * (peak_wait - normal_wait)))
                    return {
                        "site_id": site_id,
                        "site_name": site_name,
                        "people_count": people_count,
                        "capacity": capacity,
                        "occupancy_percentage": occupancy,
                        "status": status,
                        "wait_time_minutes": wait_mins,
                        "normal_wait": normal_wait,
                        "peak_wait": peak_wait,
                        "source": "yolo_video",
                        "relative_surge_alert": cached.get("relative_surge_alert") or crowd_ml_service.check_relative_surge(site_id, people_count, capacity=capacity),
                        "last_updated": cached.get("last_updated", "Just now (YOLO Video)")
                    }

    # Precedence B: Fresh real/government live telemetry observation in memory
    for k in lookup_keys:
        if k in latest_observations:
            cached = latest_observations[k]
            if cached.get("source") in ["live_telemetry", "government"]:
                if is_observation_fresh(cached.get("timestamp")):
                    people_count = cached["people_count"]
                    occupancy = cached["occupancy_percentage"]
                    status = cached["status"]
                    ratio = min(1.0, max(0.0, occupancy / 100.0))
                    wait_mins = int(round(normal_wait + ratio * (peak_wait - normal_wait)))
                    return {
                        "site_id": site_id,
                        "site_name": site_name,
                        "people_count": people_count,
                        "capacity": capacity,
                        "occupancy_percentage": occupancy,
                        "status": status,
                        "wait_time_minutes": wait_mins,
                        "normal_wait": normal_wait,
                        "peak_wait": peak_wait,
                        "source": "live_telemetry",
                        "relative_surge_alert": cached.get("relative_surge_alert") or crowd_ml_service.check_relative_surge(site_id, people_count, capacity=capacity),
                        "last_updated": cached.get("last_updated", "Just now (Live Telemetry)")
                    }

    # Check Supabase crowd_observations table for fresh observation
    try:
        res = supabase.table("crowd_observations").select("*").in_("site_id", lookup_keys).order("id", desc=True).limit(1).execute()
        if res.data and len(res.data) > 0:
            latest = res.data[0]
            if is_observation_fresh(latest.get("timestamp")):
                people_count = latest["people_count"]
                occupancy = round((people_count / capacity) * 100, 1)
                status = "NORMAL" if occupancy < 50 else ("MODERATE" if occupancy < 75 else ("HIGH" if occupancy < 90 else "CRITICAL"))
                ratio = min(1.0, max(0.0, occupancy / 100.0))
                wait_mins = int(round(normal_wait + ratio * (peak_wait - normal_wait)))
                return {
                    "site_id": site_id,
                    "site_name": site_name,
                    "people_count": people_count,
                    "capacity": capacity,
                    "occupancy_percentage": occupancy,
                    "status": status,
                    "wait_time_minutes": wait_mins,
                    "normal_wait": normal_wait,
                    "peak_wait": peak_wait,
                    "source": "live_telemetry",
                    "relative_surge_alert": crowd_ml_service.check_relative_surge(site_id, people_count, capacity=capacity),
                    "last_updated": f"Recent ({latest.get('timestamp', '')[:16]})"
                }
    except Exception as e:
        print(f"Notice: querying crowd_observations: {e}")

    # Precedence C: Historical baseline observation in memory
    for k in lookup_keys:
        if k in latest_observations:
            cached = latest_observations[k]
            if cached.get("source") in ["historical", "historical_baseline"]:
                people_count = cached["people_count"]
                occupancy = cached.get("occupancy_percentage") or round((people_count / max(1, capacity)) * 100, 1)
                status = cached.get("status") or ("NORMAL" if occupancy < 50 else ("MODERATE" if occupancy < 75 else ("HIGH" if occupancy < 90 else "CRITICAL")))
                ratio = min(1.0, max(0.0, occupancy / 100.0))
                wait_mins = int(round(normal_wait + ratio * (peak_wait - normal_wait)))
                return {
                    "site_id": site_id,
                    "site_name": site_name,
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
                    "timestamp": cached.get("timestamp") or now.isoformat()
                }

    # Precedence D: Deterministic demo simulation fallback
    current_hour = now.hour
    people_count, occupancy = compute_deterministic_demo_occupancy(canonical_id, capacity, current_hour)
    status = "NORMAL" if occupancy < 50 else ("MODERATE" if occupancy < 75 else ("HIGH" if occupancy < 90 else "CRITICAL"))
    ratio = min(1.0, max(0.0, occupancy / 100.0))
    wait_mins = int(round(normal_wait + ratio * (peak_wait - normal_wait)))

    return {
        "site_id": site_id,
        "site_name": site_name,
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
        "timestamp": now.isoformat()
    }


@router.post("/internal/telemetry")
def internal_telemetry_sync(data: dict):
    site_id = data.get("site_id")
    if not site_id:
        return {"status": "error", "message": "site_id required"}

    people_count = data.get("people_count", 0)
    capacity = data.get("capacity")
    zones = data.get("zones", {})
    source = data.get("source", "yolo_video")
    timestamp = data.get("timestamp")

    obs = process_crowd_observation(
        site_id=site_id,
        people_count=people_count,
        timestamp=timestamp,
        source=source,
        zones=zones,
        capacity=capacity
    )
    return {"status": "success", "observation": obs}


class CrowdUpdate(BaseModel):
    site_id: str
    people_count: int
    queue_length: int = 0
    timestamp: str = None

@router.post("/crowd/update")
def update_crowd(
    data: CrowdUpdate,
    current_user: AuthenticatedUser = Depends(require_role(["government", "police"]))
):
    obs = process_crowd_observation(
        site_id=data.site_id,
        people_count=data.people_count,
        timestamp=data.timestamp,
        source="live_telemetry"
    )
    return obs

@router.get("/sites/{site_id}/forecast")
def get_site_prediction_forecast(site_id: str):
    canonical_id, _, capacity = get_site_meta(site_id)
    return crowd_ml_service.predict_24h_forecast(site_id=site_id, capacity=capacity)

@router.get("/sites/{site_id}/schedule-insights")
def get_site_schedule_insights(site_id: str):
    canonical_id, _, capacity = get_site_meta(site_id)
    return crowd_ml_service.get_daily_schedule_insights(site_id=site_id, capacity=capacity)

@router.get("/sites/{site_id}/relative-surge")
def get_site_relative_surge_status(site_id: str):
    canonical_id, site_name, capacity = get_site_meta(site_id)
    if site_id in latest_observations:
        latest_count = latest_observations[site_id]["people_count"]
        return crowd_ml_service.check_relative_surge(site_id=site_id, people_count=latest_count, capacity=capacity)

    try:
        res = supabase.table("crowd_observations").select("*").in_("site_id", [canonical_id, site_id]).order("id", desc=True).limit(1).execute()
        if res.data and len(res.data) > 0:
            count = res.data[0]["people_count"]
            return crowd_ml_service.check_relative_surge(site_id=site_id, people_count=count, capacity=capacity)
    except Exception:
        pass

    people_count, _, _ = get_site_baseline(canonical_id, capacity)
    return {
        "site_id": site_id,
        "is_relative_surge": False,
        "severity": "NORMAL",
        "current_count": people_count,
        "expected_mean": float(people_count),
        "z_score": 0.0,
        "surge_percentage": "+0%",
        "message": "Baseline crowd volume is within normal operating limits."
    }

@router.get("/sites/{site_id}/prediction")
def predict_crowd(site_id: str):
    canonical_id = LEGACY_SITE_ALIASES.get(site_id, site_id)
    obs = []
    try:
        obs = supabase.table("crowd_observations").select("*").in_("site_id", [canonical_id, site_id]).order("timestamp", desc=True).limit(5).execute().data
    except Exception:
        pass

    if len(obs) < 2:
        return {"prediction": "Not enough data yet"}

    counts = [o["people_count"] for o in obs]
    trend = counts[0] - counts[-1]
    next_estimate = max(0, counts[0] + (trend // len(counts)))
    return {"site_id": site_id, "predicted_next_count": next_estimate}

@router.get("/sites/density")
@router.get("/crowd/density-all")
def get_all_sites_density():
    """
    Returns unified authoritative crowd state for all canonical destinations (TS001-TS025).
    Single shared backend-derived source of truth across Tourist, Government, Travel, Hotel, and Simulation.
    """
    results = {}
    for i in range(1, 26):
        sid = f"TS{i:03d}"
        results[sid] = resolve_site_crowd_state(sid)
    return results


@router.get("/crowd/density/{site_id}")
@router.get("/sites/{site_id}/density")
def get_site_density(site_id: str):
    return resolve_site_crowd_state(site_id)


@router.get("/sites/{site_id}/crowd-forecast")
def get_crowd_forecast(site_id: str):
    canonical_id, site_name, capacity = get_site_meta(site_id)
    crowd_state = resolve_site_crowd_state(site_id)

    people_count = crowd_state["people_count"]
    occupancy_percentage = crowd_state["occupancy_percentage"]
    status = crowd_state["status"]
    last_updated = crowd_state["last_updated"]
    normal_wait = crowd_state["normal_wait"]
    peak_wait = crowd_state["peak_wait"]
    estimated_wait = crowd_state["wait_time_minutes"]

    hist_data = []
    try:
        hist_data = supabase.table("historical_crowd_data").select("*").eq("spot_id", canonical_id).execute().data
    except Exception:
        pass

    if hist_data:
        hist = hist_data[0]
        qms = hist.get("queue_management_system", "Automated Queue Barricades")
        fast_track = hist.get("fast_track_details_cost", "Priority counter available") if hist.get("fast_track_available") else "Standard queuing"
        peak_seasons = hist.get("peak_season_months", "Peak festival seasons")
        upcoming_festivals = hist.get("peak_dates_and_festivals", "Upcoming Seasonal Utsav")
        weather_warnings = hist.get("weather_context_and_seasonality", "Comfortable weather for darshan")
        surge_triggers = hist.get("surge_trigger_factors", "Aarti & weekend holidays")
    elif canonical_id in SITE_BASELINE_FALLBACK:
        b = SITE_BASELINE_FALLBACK[canonical_id]
        normal_wait = b.get("normal_wait", 25)
        peak_wait = b.get("peak_wait", 120)
        qms = b.get("qms", "Barricaded Queue Corridor")
        fast_track = b.get("fast_track", "Senior & Divyang priority counter available")
        peak_seasons = b.get("peak_seasons", "Summer & Festivals")
        upcoming_festivals = b.get("upcoming_festivals", "Upcoming Temple Utsav")
        weather_warnings = b.get("weather_warnings", "Comfortable conditions for darshan.")
        surge_triggers = b.get("surge_triggers", "Morning & Evening Aarti")
    else:
        qms = "Barricaded Queue Corridor"
        fast_track = "Senior & Divyang priority counter available"
        peak_seasons = "Summer & Festivals"
        upcoming_festivals = "Upcoming Temple Utsav"
        weather_warnings = "Comfortable conditions for darshan."
        surge_triggers = "Morning & Evening Aarti"

    return {
        "site_id": site_id,
        "site_name": site_name,
        "live_status": {
            "people_count": people_count,
            "occupancy_percentage": occupancy_percentage,
            "status": status,
            "last_updated": last_updated,
            "source": crowd_state.get("source", "demo_simulation")
        },
        "queue_forecast": {
            "estimated_current_wait_mins": estimated_wait,
            "normal_wait_mins": normal_wait,
            "peak_wait_mins": peak_wait,
            "queue_management_system": qms,
            "fast_track_details": fast_track
        },
        "seasonal_context": {
            "peak_seasons": peak_seasons,
            "upcoming_peak_festivals": upcoming_festivals,
            "weather_warnings": weather_warnings,
            "surge_triggers": surge_triggers
        }
    }



