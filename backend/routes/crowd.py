import os
from typing import Any, Optional, Dict, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import supabase, supabase_admin
from dependencies import require_role, AuthenticatedUser
from services.crowd_ml import crowd_ml_service
from services.crowd_service import (
    latest_observations,
    LEGACY_SITE_ALIASES,
    SITE_METADATA_FALLBACK,
    SITE_BASELINE_FALLBACK,
    get_site_meta,
    get_site_full_meta,
    calculate_occupancy_and_status,
    calculate_queue_wait_time,
    compute_deterministic_demo_occupancy,
    get_site_baseline,
    is_observation_fresh,
    process_crowd_observation,
    resolve_site_crowd_state,
)

router = APIRouter()


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
    canonical_id, site_name, capacity = get_site_meta(site_id)
    crowd_state = resolve_site_crowd_state(site_id)
    return crowd_ml_service.predict_24h_forecast(
        site_id=canonical_id,
        capacity=capacity,
        site_name=site_name,
        current_state=crowd_state
    )


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
    Satisfies the God's-Eye Command Center contract with coordinates and provenance metadata.
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
    canonical_id, site_name, capacity, lat, lon = get_site_full_meta(site_id)
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
        "latitude": lat,
        "longitude": lon,
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
