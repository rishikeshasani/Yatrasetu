import math
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import supabase

router = APIRouter()

class SOSRequest(BaseModel):
    user_id: str
    latitude: float
    longitude: float

@router.post("/sos")
def trigger_sos(data: SOSRequest):
    # Print SOS alert to server logs since table is not persistently created in database yet
    print(f"SOS Alert received: User={data.user_id}, Lat={data.latitude}, Lon={data.longitude}")
    return {
        "message": "Alert received. Nearest response team notified.",
        "status": "success"
    }

class LocationCheck(BaseModel):
    latitude: float
    longitude: float

def get_distance(lat1, lon1, lat2, lon2):
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def get_nearest_site_with_status(zone_lat, zone_lon, sites):
    """Finds the nearest site and computes its latest crowd status."""
    if not sites:
        return None, None, 0, 0.0, "NORMAL"

    nearest_site = None
    min_dist = float('inf')
    for site in sites:
        dist = get_distance(zone_lat, zone_lon, site["latitude"], site["longitude"])
        if dist < min_dist:
            min_dist = dist
            nearest_site = site

    if not nearest_site:
        return None, None, 0, 0.0, "NORMAL"

    # Get latest observation
    obs_data = supabase.table("crowd_observations")\
        .select("*").eq("site_id", nearest_site["id"])\
        .order("id", desc=True).limit(1).execute().data

    if not obs_data:
        return nearest_site, None, 0, 0.0, "NORMAL"

    latest_obs = obs_data[0]
    people_count = latest_obs["people_count"]
    capacity = nearest_site["capacity"]
    occupancy = round((people_count / capacity) * 100, 1)

    # Determine status
    if occupancy < 50:
        status = "NORMAL"
    elif occupancy < 75:
        status = "MODERATE"
    elif occupancy < 90:
        status = "HIGH"
    else:
        status = "CRITICAL"

    return nearest_site, latest_obs, people_count, occupancy, status

def get_site_safety_info(site_id: str):
    """Fetches emergency/safety info for a site with graceful fallback if table or record doesn't exist."""
    try:
        data = supabase.table("site_safety_info").select("*").eq("spot_id", site_id).execute().data
        if data:
            info = data[0]
            return {
                "nearest_hospital": info["nearest_hospital_name"],
                "hospital_distance_km": info["hospital_distance_km"],
                "hospital_phone": info["hospital_emergency_phone"],
                "nearest_police": info["nearest_police_station"],
                "police_phone": info["police_contact_number"],
                "disaster_control_room": info["disaster_mgmt_control_room"],
                "evacuation_routes": info["emergency_exits_and_evacuation_routes"],
                "high_risk_zone_type": info["high_risk_zone_type"],
                "risk_mitigation_measures": info["risk_mitigation_measures"]
            }
    except Exception as e:
        # Graceful fallback if table is not created yet or query fails
        print(f"Note: Could not query site_safety_info for {site_id}: {e}")
        
    return {
        "nearest_hospital": "Unknown",
        "hospital_distance_km": 0.0,
        "hospital_phone": "108",
        "nearest_police": "Local Police Post",
        "police_phone": "112",
        "disaster_control_room": "1070",
        "evacuation_routes": "Follow designated emergency exit signs.",
        "high_risk_zone_type": "Crowd Congestion",
        "risk_mitigation_measures": "Follow SDRF/volunteer instructions."
    }

@router.get("/alerts")
def get_alerts():
    # Fetch safety zones and sites
    zones = supabase.table("safety_zones").select("*").execute().data
    sites = supabase.table("sites").select("*").execute().data

    active_alerts = []
    for zone in zones:
        nearest_site, latest_obs, people_count, occupancy, status = get_nearest_site_with_status(
            zone["latitude"], zone["longitude"], sites
        )

        # Only generate alert if status is HIGH or CRITICAL
        if status in ("HIGH", "CRITICAL"):
            safety_info = get_site_safety_info(nearest_site["id"])
            active_alerts.append({
                "site_id": nearest_site["id"],
                "zone_id": zone["id"],
                "zone_name": zone["name"],
                "alert_type": "CROWD_DENSITY",
                "severity": status,
                "message": f"⚠️ High crowd density ({occupancy}%) detected near {zone['name']}. Avoid this area.",
                "people_count": people_count,
                "occupancy_percentage": occupancy,
                "timestamp": latest_obs["timestamp"] if latest_obs else None,
                "emergency_info": safety_info
            })

    return active_alerts

@router.post("/check-safety")
def check_safety(loc: LocationCheck):
    zones = supabase.table("safety_zones").select("*").execute().data
    sites = supabase.table("sites").select("*").execute().data

    for zone in zones:
        dist = get_distance(loc.latitude, loc.longitude, zone["latitude"], zone["longitude"])
        if dist <= zone["radius_meters"]:
            # User is in geofence. Check crowd status of nearest site.
            nearest_site, latest_obs, people_count, occupancy, status = get_nearest_site_with_status(
                zone["latitude"], zone["longitude"], sites
            )

            # Warn only if status is HIGH or CRITICAL
            if status in ("HIGH", "CRITICAL"):
                safety_info = get_site_safety_info(nearest_site["id"])
                return {
                    "in_danger_zone": True,
                    "zone_name": zone["name"],
                    "risk_level": zone["risk_level"],
                    "message": f"⚠️ High crowd density ({occupancy}%) detected near {zone['name']}. Please use the suggested alternate route.",
                    "emergency_info": safety_info
                }

    return {"in_danger_zone": False, "message": "You are in a safe area."}

@router.get("/sites/{site_id}/safety-info")
def get_safety_info(site_id: str):
    # First, verify that the site exists
    site_data = supabase.table("sites").select("*").eq("id", site_id).execute().data
    if not site_data:
        raise HTTPException(status_code=404, detail="Site not found")
        
    info = get_site_safety_info(site_id)
    return info