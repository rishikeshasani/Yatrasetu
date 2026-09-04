import math
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from database import supabase, supabase_admin
from dependencies import get_current_user, AuthenticatedUser

router = APIRouter()

class SOSRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")
    user_id: Optional[str] = Field(None, description="Optional legacy user ID; ignored in favor of verified JWT identity")

class LocationCheck(BaseModel):
    latitude: float
    longitude: float

def get_distance(lat1, lon1, lat2, lon2):
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def find_nearest_site(lat: float, lon: float) -> Optional[dict]:
    """Finds the geographically closest site to the given coordinates. Returns None if lookup fails."""
    try:
        res = supabase.table("sites").select("id, name, latitude, longitude").execute()
        sites = res.data or []
        if not sites:
            return None
        nearest = None
        min_dist = float("inf")
        for s in sites:
            if s.get("latitude") is not None and s.get("longitude") is not None:
                d = get_distance(lat, lon, s["latitude"], s["longitude"])
                if d < min_dist:
                    min_dist = d
                    nearest = s
        return nearest
    except Exception as e:
        print(f"Warning: Could not fetch sites for nearest site lookup: {e}")
        return None

@router.post("/sos")
def trigger_sos(
    data: SOSRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Emergency SOS Endpoint:
    - Protected: Requires authenticated user (tourist, etc.).
    - Identity: Derives user_id strictly from verified JWT/auth context (current_user.id).
    - Coordinates: Validated (-90 to 90 lat, -180 to 180 lon).
    - Nearest Site: Dynamically resolved from existing sites database (NULL if unresolved).
    - Persistence: Persisted to public.sos_alerts table in Supabase.
    - Lifecycle Status: Stored with status='ACTIVE'.
    - Response: Preserves frontend contract with message and status='success'.
    """
    # 1. Determine nearest site if available (non-blocking: NULL if lookup fails)
    nearest_site = None
    try:
        nearest_site = find_nearest_site(data.latitude, data.longitude)
    except Exception as e:
        print(f"Non-blocking nearest-site lookup error: {e}")

    nearest_site_id = nearest_site["id"] if nearest_site else None
    nearest_name = nearest_site["name"] if nearest_site else None

    alert_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    alert_record = {
        "id": alert_id,
        "user_id": current_user.id,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "nearest_site_id": nearest_site_id,
        "status": "ACTIVE",
        "created_at": now_iso
    }

    # 2. Persist to Supabase database (admin client)
    try:
        res = supabase_admin.table("sos_alerts").insert(alert_record).execute()
        if not res.data:
            raise Exception("Database returned empty response on insert")
    except Exception as e:
        print(f"Error persisting SOS alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record emergency SOS alert in database."
        )

    # 3. Server diagnostic log (no secrets/passwords/tokens)
    print(f"SOS Alert Recorded: alert_id={alert_id}, user={current_user.id}, lat={data.latitude}, lon={data.longitude}, nearest_site={nearest_site_id}, status=ACTIVE")

    # 4. Return frontend-compatible response
    site_msg = f" for {nearest_name}" if nearest_name else ""
    return {
        "message": f"Alert received. Nearest response team notified{site_msg}.",
        "status": "success",
        "alert_id": alert_id,
        "nearest_site_id": nearest_site_id,
        "sos_status": "ACTIVE"
    }

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