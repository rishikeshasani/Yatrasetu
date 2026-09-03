from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import supabase
from services.crowd_ml import crowd_ml_service

router = APIRouter()

latest_observations: dict[str, dict] = {}

class CrowdUpdate(BaseModel):
    site_id: str
    people_count: int
    queue_length: int = 0
    timestamp: str = None

@router.post("/crowd/update")
def update_crowd(data: CrowdUpdate):
    payload = {
        "site_id": data.site_id,
        "people_count": data.people_count,
        "queue_length": data.queue_length
    }
    if data.timestamp:
        payload["timestamp"] = data.timestamp

    try:
        supabase.table("crowd_observations").insert(payload).execute()
    except Exception:
        pass

    site_capacities = {
        "site_kedarnath": 2500,
        "site_badrinath": 3200,
        "site_kashi": 6000,
        "site_tirupati": 12000,
        "site_vaishnodevi": 8000
    }
    capacity = site_capacities.get(data.site_id, 200)
    try:
        site_res = supabase.table("sites").select("*").eq("id", data.site_id).execute()
        if site_res.data:
            capacity = site_res.data[0].get("capacity", capacity)
    except Exception:
        pass

    occupancy = round((data.people_count / capacity) * 100, 1)

    if occupancy < 50:
        status = "NORMAL"
    elif occupancy < 75:
        status = "MODERATE"
    elif occupancy < 90:
        status = "HIGH"
    else:
        status = "CRITICAL"

    relative_surge = crowd_ml_service.check_relative_surge(
        site_id=data.site_id,
        people_count=data.people_count,
        capacity=capacity
    )

    result = {
        "site_id": data.site_id,
        "people_count": data.people_count,
        "occupancy_percentage": occupancy,
        "status": status,
        "relative_surge_alert": relative_surge
    }

    latest_observations[data.site_id] = result
    return result

@router.get("/sites/{site_id}/forecast")
def get_site_prediction_forecast(site_id: str):
    site_capacities = {"site_kedarnath": 2500, "site_badrinath": 3200, "site_kashi": 6000, "site_tirupati": 12000, "site_vaishnodevi": 8000}
    capacity = site_capacities.get(site_id, 200)
    try:
        site_res = supabase.table("sites").select("*").eq("id", site_id).execute()
        if site_res.data:
            capacity = site_res.data[0].get("capacity", capacity)
    except Exception:
        pass

    return crowd_ml_service.predict_24h_forecast(site_id=site_id, capacity=capacity)

@router.get("/sites/{site_id}/schedule-insights")
def get_site_schedule_insights(site_id: str):
    site_capacities = {"site_kedarnath": 2500, "site_badrinath": 3200, "site_kashi": 6000, "site_tirupati": 12000, "site_vaishnodevi": 8000}
    capacity = site_capacities.get(site_id, 200)
    try:
        site_res = supabase.table("sites").select("*").eq("id", site_id).execute()
        if site_res.data:
            capacity = site_res.data[0].get("capacity", capacity)
    except Exception:
        pass

    return crowd_ml_service.get_daily_schedule_insights(site_id=site_id, capacity=capacity)

@router.get("/sites/{site_id}/relative-surge")
def get_site_relative_surge_status(site_id: str):
    site_capacities = {"site_kedarnath": 2500, "site_badrinath": 3200, "site_kashi": 6000, "site_tirupati": 12000, "site_vaishnodevi": 8000}
    capacity = site_capacities.get(site_id, 200)
    latest_count = 1200
    if site_id in latest_observations:
        latest_count = latest_observations[site_id]["people_count"]
    return crowd_ml_service.check_relative_surge(site_id=site_id, people_count=latest_count, capacity=capacity)

@router.get("/sites/{site_id}/prediction")
def predict_crowd(site_id: str):
    obs = []
    try:
        obs = supabase.table("crowd_observations").select("*").eq("site_id", site_id).order("timestamp", desc=True).limit(5).execute().data
    except Exception:
        pass

    if len(obs) < 2:
        return {"prediction": "Not enough data yet"}

    counts = [o["people_count"] for o in obs]
    trend = counts[0] - counts[-1]
    next_estimate = max(0, counts[0] + (trend // len(counts)))
    return {"site_id": site_id, "predicted_next_count": next_estimate}

@router.get("/sites/{site_id}/density")
def get_site_density(site_id: str):
    if site_id in latest_observations:
        cached = latest_observations[site_id]
        return {
            "site_id": site_id,
            "site_name": site_id.replace("site_", "").capitalize() + " Shrine",
            "people_count": cached["people_count"],
            "occupancy_percentage": cached["occupancy_percentage"],
            "status": cached["status"],
            "relative_surge_alert": cached.get("relative_surge_alert"),
            "last_updated": "Just now (Live Feed)"
        }

    site_capacities = {"site_kedarnath": 2500, "site_badrinath": 3200, "site_kashi": 6000, "site_tirupati": 12000, "site_vaishnodevi": 8000}
    capacity = site_capacities.get(site_id, 2500)
    site_name = site_id.replace("site_", "").capitalize()

    return {
        "site_id": site_id,
        "site_name": site_name,
        "people_count": 1200,
        "occupancy_percentage": 48.0,
        "status": "NORMAL",
        "relative_surge_alert": crowd_ml_service.check_relative_surge(site_id, 1200, capacity=capacity),
        "last_updated": "Just now"
    }
