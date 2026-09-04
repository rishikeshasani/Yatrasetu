from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import supabase
from dependencies import require_role, AuthenticatedUser

router = APIRouter()

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
    # Prepare payload
    payload = {
        "site_id": data.site_id,
        "people_count": data.people_count,
        "queue_length": data.queue_length
    }
    if data.timestamp:
        payload["timestamp"] = data.timestamp

    # Save observation
    supabase.table("crowd_observations").insert(payload).execute()

    # Get site capacity
    site = supabase.table("sites").select("*").eq("id", data.site_id).execute().data[0]
    occupancy = round((data.people_count / site["capacity"]) * 100, 1)

    # Determine status
    if occupancy < 50:
        status = "NORMAL"
    elif occupancy < 75:
        status = "MODERATE"
    elif occupancy < 90:
        status = "HIGH"
    else:
        status = "CRITICAL"

    return {
        "site_id": data.site_id,
        "people_count": data.people_count,
        "occupancy_percentage": occupancy,
        "status": status
    }

@router.get("/sites/{site_id}/prediction")
def predict_crowd(site_id: str):
    obs = supabase.table("crowd_observations")\
        .select("*").eq("site_id", site_id)\
        .order("timestamp", desc=True).limit(5).execute().data

    if len(obs) < 2:
        return {"prediction": "Not enough data yet"}

    counts = [o["people_count"] for o in obs]
    trend = counts[0] - counts[-1]
    next_estimate = max(0, counts[0] + (trend // len(counts)))

    return {"site_id": site_id, "predicted_next_count": next_estimate}


@router.get("/sites/{site_id}/density")
def get_site_density(site_id: str):
    # Fetch site to get capacity and name
    site_data = supabase.table("sites").select("*").eq("id", site_id).execute().data
    if not site_data:
        raise HTTPException(status_code=404, detail="Site not found")
    site = site_data[0]

    # Fetch latest observation
    obs = supabase.table("crowd_observations")\
        .select("*").eq("site_id", site_id)\
        .order("id", desc=True).limit(1).execute().data

    if not obs:
        return {
            "site_id": site_id,
            "site_name": site["name"],
            "people_count": 0,
            "occupancy_percentage": 0.0,
            "status": "NORMAL",
            "last_updated": None
        }

    latest_obs = obs[0]
    people_count = latest_obs["people_count"]
    occupancy_percentage = round((people_count / site["capacity"]) * 100, 1)

    # Determine status based on thresholds
    if occupancy_percentage < 50:
        status = "NORMAL"
    elif occupancy_percentage < 75:
        status = "MODERATE"
    elif occupancy_percentage < 90:
        status = "HIGH"
    else:
        status = "CRITICAL"

    return {
        "site_id": site_id,
        "site_name": site["name"],
        "people_count": people_count,
        "occupancy_percentage": occupancy_percentage,
        "status": status,
        "last_updated": latest_obs["timestamp"]
    }


@router.get("/sites/{site_id}/crowd-forecast")
def get_crowd_forecast(site_id: str):
    # 1. Fetch site details
    site_data = supabase.table("sites").select("*").eq("id", site_id).execute().data
    if not site_data:
        raise HTTPException(status_code=404, detail="Site not found")
    site = site_data[0]

    # 2. Fetch latest crowd observation (ordered by id desc)
    obs = supabase.table("crowd_observations")\
        .select("*").eq("site_id", site_id)\
        .order("id", desc=True).limit(1).execute().data

    if obs:
        latest_obs = obs[0]
        people_count = latest_obs["people_count"]
        occupancy_percentage = round((people_count / site["capacity"]) * 100, 1)
        last_updated = latest_obs["timestamp"]
    else:
        people_count = 0
        occupancy_percentage = 0.0
        last_updated = None

    # Determine status
    if occupancy_percentage < 50:
        status = "NORMAL"
    elif occupancy_percentage < 75:
        status = "MODERATE"
    elif occupancy_percentage < 90:
        status = "HIGH"
    else:
        status = "CRITICAL"

    # 3. Fetch historical crowd metadata
    hist_data = []
    try:
        hist_data = supabase.table("historical_crowd_data").select("*").eq("spot_id", site_id).execute().data
    except Exception as e:
        # Catch exception in case table hasn't been created yet
        print(f"Error querying historical_crowd_data: {e}")

    if not hist_data:
        # Graceful fallback if no historical metadata exists yet
        return {
            "site_id": site_id,
            "site_name": site["name"],
            "live_status": {
                "people_count": people_count,
                "occupancy_percentage": occupancy_percentage,
                "status": status,
                "last_updated": last_updated
            },
            "queue_forecast": {
                "estimated_current_wait_mins": 0,
                "normal_wait_mins": 0,
                "peak_wait_mins": 0,
                "queue_management_system": "Standard Queuing",
                "fast_track_details": "N/A"
            },
            "seasonal_context": {
                "peak_seasons": "Unknown",
                "upcoming_peak_festivals": "Unknown",
                "weather_warnings": "None",
                "surge_triggers": "Unknown"
            }
        }

    hist = hist_data[0]
    normal_wait = hist["avg_queue_time_normal_mins"]
    peak_wait = hist["avg_queue_time_peak_mins"]

    # 4. Calculate expected_wait dynamically using the approved formula:
    # - occupancy < 50% -> normal_wait
    # - 50% to < 90% -> linear interpolation from normal_wait to peak_wait
    # - >= 90% -> peak_wait
    if occupancy_percentage < 50:
        estimated_wait = normal_wait
    elif occupancy_percentage < 90:
        estimated_wait = normal_wait + (
            (peak_wait - normal_wait) *
            ((occupancy_percentage - 50) / 40)
        )
    else:
        estimated_wait = peak_wait

    # Round to nearest integer for user display
    estimated_wait = int(round(estimated_wait))

    # Ensure estimated_wait is non-negative and bounded correctly
    estimated_wait = max(0, estimated_wait)

    return {
        "site_id": site_id,
        "site_name": site["name"],
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
            "queue_management_system": hist["queue_management_system"],
            "fast_track_details": hist["fast_track_details_cost"] if hist["fast_track_available"] else "N/A"
        },
        "seasonal_context": {
            "peak_seasons": hist["peak_season_months"],
            "upcoming_peak_festivals": hist["peak_dates_and_festivals"],
            "weather_warnings": hist["weather_context_and_seasonality"],
            "surge_triggers": hist["surge_trigger_factors"]
        }
    }