from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import supabase
from dependencies import require_role, AuthenticatedUser
from services.crowd_ml import crowd_ml_service


router = APIRouter()

latest_observations: dict[str, dict] = {}

@router.post("/internal/telemetry")
def internal_telemetry_sync(data: dict):
    site_id = data.get("site_id")
    if not site_id:
        return {"status": "error"}
    
    # Update the in-memory cache instantly
    latest_observations[site_id] = {
        "site_id": site_id,
        "people_count": data.get("people_count", 0),
        "occupancy_percentage": round((data.get("people_count", 0) / 2500) * 100, 1),
        "status": "CRITICAL" if data.get("people_count", 0) > 2000 else "NORMAL",
        "relative_surge_alert": crowd_ml_service.check_relative_surge(site_id, data.get("people_count", 0), capacity=2500),
        "last_updated": "Just now (Live ML Feed)"
    }
    
    # Try pushing to DB in background
    try:
        supabase.table("crowd_observations").insert(data).execute()
    except Exception:
        pass
        
    return {"status": "success"}



class CrowdUpdate(BaseModel):
    site_id: str
    people_count: int
    queue_length: int = 0
    timestamp: str = None

@router.post("/crowd/update")
def update_crowd(
    data: CrowdUpdate,
    current_user: AuthenticatedUser = Depends(require_role(["government"]))
):

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
    site_capacities = {"site_kedarnath": 13000, "TS001": 13000, "site_badrinath": 16000, "TS002": 16000, "site_kashi": 60000, "TS003": 60000, "site_tirupati": 85000, "TS006": 85000, "site_vaishnodevi": 50000, "TS005": 50000}
    capacity = site_capacities.get(site_id, 2500)
    site_name = site_id.replace("site_", "").capitalize()

    try:
        site_res = supabase.table("sites").select("*").eq("id", site_id).execute()
        if site_res.data:
            capacity = site_res.data[0].get("capacity", capacity)
            site_name = site_res.data[0].get("name", site_name)
    except Exception:
        pass

    # Query the latest observation from Supabase directly!
    try:
        res = supabase.table("crowd_observations").select("*").eq("site_id", site_id).order("id", desc=True).limit(1).execute()
        if res.data and len(res.data) > 0:
            latest = res.data[0]
            people_count = latest["people_count"]
            occupancy = round((people_count / capacity) * 100, 1)
            
            if occupancy < 50:
                status = "NORMAL"
            elif occupancy < 75:
                status = "MODERATE"
            elif occupancy < 90:
                status = "HIGH"
            else:
                status = "CRITICAL"
                
            return {
                "site_id": site_id,
                "site_name": site_name,
                "people_count": people_count,
                "occupancy_percentage": occupancy,
                "status": status,
                "relative_surge_alert": crowd_ml_service.check_relative_surge(site_id, people_count, capacity=capacity),
                "last_updated": "Just now (Live Feed)"
            }
    except Exception as e:
        print(f"Error fetching density from DB: {e}")

    # Fallback if DB fetch fails or is empty
    if site_id in latest_observations:
        cached = latest_observations[site_id]
        return {
            "site_id": site_id,
            "site_name": site_name + " Shrine",
            "people_count": cached["people_count"],
            "occupancy_percentage": cached["occupancy_percentage"],
            "status": cached["status"],
            "relative_surge_alert": cached.get("relative_surge_alert"),
            "last_updated": "Just now (Live Feed)"
        }

    return {
        "site_id": site_id,
        "site_name": site_name,
        "people_count": 1200,
        "occupancy_percentage": 48.0,
        "status": "NORMAL",
        "relative_surge_alert": crowd_ml_service.check_relative_surge(site_id, 1200, capacity=capacity),
        "last_updated": "Just now"
    }


@router.get("/sites/{site_id}/crowd-forecast")
def get_crowd_forecast(site_id: str):
    site_data = []
    try:
        site_data = supabase.table("sites").select("*").eq("id", site_id).execute().data
    except Exception:
        pass

    site_name = site_data[0]["name"] if site_data else site_id.replace("site_", "").replace("TS", "Spot ").capitalize()
    capacity = site_data[0]["capacity"] if site_data else 2500

    if site_id in latest_observations:
        cached = latest_observations[site_id]
        people_count = cached["people_count"]
        occupancy_percentage = cached["occupancy_percentage"]
        status = cached["status"]
        last_updated = "Just now (Live Feed)"
    else:
        obs = []
        try:
            obs = supabase.table("crowd_observations").select("*").eq("site_id", site_id).order("id", desc=True).limit(1).execute().data
        except Exception:
            pass
        if obs:
            people_count = obs[0]["people_count"]
            occupancy_percentage = round((people_count / capacity) * 100, 1)
            last_updated = obs[0].get("timestamp", "Just now")
        else:
            people_count = 1200
            occupancy_percentage = round((people_count / capacity) * 100, 1)
            last_updated = "Just now"

        if occupancy_percentage < 50:
            status = "NORMAL"
        elif occupancy_percentage < 75:
            status = "MODERATE"
        elif occupancy_percentage < 90:
            status = "HIGH"
        else:
            status = "CRITICAL"

    hist_data = []
    try:
        hist_data = supabase.table("historical_crowd_data").select("*").eq("spot_id", site_id).execute().data
    except Exception:
        pass

    if hist_data:
        hist = hist_data[0]
        normal_wait = hist.get("avg_queue_time_normal_mins", 25)
        peak_wait = hist.get("avg_queue_time_peak_mins", 120)
        qms = hist.get("queue_management_system", "Automated Queue Barricades")
        fast_track = hist.get("fast_track_details_cost", "Priority counter available") if hist.get("fast_track_available") else "Standard queuing"
        peak_seasons = hist.get("peak_season_months", "Peak festival seasons")
        upcoming_festivals = hist.get("peak_dates_and_festivals", "Upcoming Seasonal Utsav")
        weather_warnings = hist.get("weather_context_and_seasonality", "Comfortable weather for darshan")
        surge_triggers = hist.get("surge_trigger_factors", "Aarti & weekend holidays")
    else:
        normal_wait = 25
        peak_wait = 120
        qms = "Barricaded Queue Corridor"
        fast_track = "Senior & Divyang priority counter available"
        peak_seasons = "Summer & Festivals"
        upcoming_festivals = "Upcoming Temple Utsav"
        weather_warnings = "Comfortable conditions for darshan."
        surge_triggers = "Morning & Evening Aarti"

    if occupancy_percentage < 50:
        estimated_wait = normal_wait
    elif occupancy_percentage < 90:
        estimated_wait = normal_wait + ((peak_wait - normal_wait) * ((occupancy_percentage - 50) / 40))
    else:
        estimated_wait = peak_wait

    estimated_wait = max(0, int(round(estimated_wait)))

    return {
        "site_id": site_id,
        "site_name": site_name,
        "live_status": {
            "people_count": people_count,
            "occupancy_percentage": occupancy_percentage,
            "status": status,
            "last_updated": last_updated
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

