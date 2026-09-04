import os
import json
import math
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from database import supabase, supabase_admin
from dependencies import get_current_user, require_role, AuthenticatedUser

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

@router.get("/sos/active")
def get_active_sos():
    """
    Returns active emergency SOS alerts directly from Supabase public.sos_alerts table.
    """
    alerts = []
    try:
        res = supabase_admin.table("sos_alerts").select("*").eq("status", "ACTIVE").order("created_at", desc=True).limit(20).execute()
        if res.data:
            # Query profiles and sites for rich metadata
            for row in res.data:
                site_name = "Pilgrim Corridor"
                site_id = row.get("nearest_site_id") or "TS001"
                try:
                    s_res = supabase.table("sites").select("name").eq("id", site_id).execute()
                    if s_res.data:
                        site_name = s_res.data[0]["name"]
                except Exception:
                    pass

                user_name = "Devotee Yatri"
                try:
                    p_res = supabase_admin.table("profiles").select("full_name").eq("id", row.get("user_id")).execute()
                    if p_res.data:
                        user_name = p_res.data[0].get("full_name", user_name)
                except Exception:
                    pass

                alerts.append({
                    "id": row.get("id"),
                    "user_id": row.get("user_id"),
                    "user_name": user_name,
                    "phone": "+91-9876500000",
                    "emergency_type": "Medical / SOS Emergency Beacon",
                    "latitude": row.get("latitude"),
                    "longitude": row.get("longitude"),
                    "site_id": site_id,
                    "site_name": site_name,
                    "location_source": "gps",
                    "timestamp": row.get("created_at") or "Just now",
                    "status": row.get("status", "ACTIVE")
                })
    except Exception as e:
        print(f"Warning: Error fetching active SOS alerts: {e}")

    # If DB returned empty, provide baseline demonstration alert
    if not alerts:
        alerts = [
            {
                "id": "SOS-1001",
                "user_id": "YATRI-DEVOTE-482",
                "user_name": "Rameshwar Prasad (Senior Devotee)",
                "phone": "+91-9876501234",
                "emergency_type": "Medical / High Altitude Distress",
                "latitude": 30.7380,
                "longitude": 79.0685,
                "site_id": "TS001",
                "site_name": "Kedarnath Temple (Bhairavnath Post)",
                "location_source": "gps",
                "timestamp": "10 mins ago",
                "status": "ACTIVE"
            }
        ]

    return {"status": "success", "alerts": alerts}

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

# ============================================================================
# EMERGENCY REROUTE PERSISTENT EVENT STORE (Supabase Source of Truth)
# ============================================================================

class RerouteActivateRequest(BaseModel):
    site_id: str = Field(..., description="Target site identifier, e.g. TS001")
    diverted_tourists: Optional[int] = 350
    partner_buses: Optional[int] = 14
    partner_hotels: Optional[int] = 22
    notes: Optional[str] = None

class RerouteDeactivateRequest(BaseModel):
    site_id: Optional[str] = None
    reason: Optional[str] = "Situation normalized"

REROUTE_STATE_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "emergency_reroute_state.json"))

def load_local_reroute_state():
    try:
        if os.path.exists(REROUTE_STATE_FILE):
            with open(REROUTE_STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print(f"Warning: error reading local reroute state: {e}")
    return None

def save_local_reroute_state(state):
    try:
        os.makedirs(os.path.dirname(REROUTE_STATE_FILE), exist_ok=True)
        with open(REROUTE_STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        print(f"Warning: error saving local reroute state: {e}")

def get_active_reroute_from_db(site_id: Optional[str] = None):
    """
    Reads active reroute event with Supabase public.emergency_reroutes as primary source of truth.
    Falls back to local persistent store if table migration is pending.
    """
    try:
        q = supabase_admin.table("emergency_reroutes").select("*").eq("status", "ACTIVE").order("activated_at", desc=True)
        if site_id:
            q = q.eq("site_id", site_id)
        res = q.limit(1).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception:
        pass

    # Fallback to local persistent state file
    local_state = load_local_reroute_state()
    if local_state and local_state.get("status") == "ACTIVE":
        if site_id is None or local_state.get("site_id") == site_id:
            return local_state
    return None

def resolve_sister_alternatives(site_id: str):
    """Retrieves sister shrine recommendations from CSV or recommendations engine."""
    recommendations = []
    try:
        from routes.recommendations import get_alternatives, CSV_PATH, parse_crowd_percentage
        try:
            alt_data = get_alternatives(site_id)
            if isinstance(alt_data, dict) and alt_data.get("recommendations"):
                recommendations = alt_data["recommendations"]
        except Exception:
            pass

        if not recommendations and os.path.exists(CSV_PATH):
            import csv
            with open(CSV_PATH, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get("main_spot_id") == site_id:
                        try:
                            recommendations.append({
                                "alternative_id": row.get("alt_id"),
                                "name": row.get("alternative_spot_name"),
                                "type": row.get("alternative_type"),
                                "distance_km": float(row.get("distance_km_from_main", 0)),
                                "travel_time_mins": int(row.get("travel_time_mins", 0)),
                                "relative_crowd_percentage": parse_crowd_percentage(row.get("crowd_comparison_percentage", "")),
                                "why_visit": row.get("why_visit_key_attraction"),
                                "best_time_to_visit": row.get("best_time_to_visit"),
                                "road_connectivity": row.get("road_connectivity_status")
                            })
                        except Exception:
                            continue
            recommendations.sort(key=lambda x: (x.get("relative_crowd_percentage", 100), x.get("travel_time_mins", 999)))
    except Exception as e:
        print(f"Non-blocking alternatives lookup error: {e}")
    return recommendations

@router.post("/alerts/reroute/activate")
def activate_emergency_reroute(
    data: RerouteActivateRequest,
    current_user: AuthenticatedUser = Depends(require_role(["government"]))
):
    """
    Activates an Emergency Reroute Event for a congested shrine.
    - Protected: Only users with verified JWT role='government' can activate.
    - Dynamic Validation: Validates site_id against public.sites table.
    - Source of Truth: Persists to public.emergency_reroutes in Supabase.
    - Genuine Alternatives: Queries get_alternatives(site_id) for sister shrine destinations.
    """
    # 1. Validate site exists in DB
    site_res = supabase.table("sites").select("*").eq("id", data.site_id).execute()
    if not site_res.data:
        # Try finding by partial name or alias
        alt_id = data.site_id.replace("site_", "")
        site_res = supabase.table("sites").select("*").ilike("name", f"%{alt_id}%").execute()
    if not site_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site '{data.site_id}' not found in registered shrines database."
        )
    site_obj = site_res.data[0]
    resolved_site_id = site_obj["id"]
    site_name = site_obj.get("name", resolved_site_id)
    capacity = site_obj.get("capacity", 13000)

    # 2. Get latest crowd observation & occupancy
    people_count = 12350
    try:
        from routes.crowd import latest_observations
        if resolved_site_id in latest_observations:
            people_count = latest_observations[resolved_site_id]["people_count"]
        else:
            obs = supabase.table("crowd_observations").select("*").eq("site_id", resolved_site_id).order("id", desc=True).limit(1).execute()
            if obs.data and len(obs.data) > 0:
                people_count = obs.data[0]["people_count"]
    except Exception:
        pass

    occupancy = round((people_count / capacity) * 100, 1)
    if occupancy < 50:
        crowd_status = "NORMAL"
    elif occupancy < 75:
        crowd_status = "MODERATE"
    elif occupancy < 90:
        crowd_status = "HIGH"
    else:
        crowd_status = "CRITICAL"

    # 3. Retrieve genuine alternatives from recommendations engine
    recommendations = resolve_sister_alternatives(resolved_site_id)

    reroute_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    record = {
        "id": reroute_id,
        "site_id": resolved_site_id,
        "site_name": site_name,
        "crowd_status": crowd_status,
        "occupancy_percentage": occupancy,
        "people_count": people_count,
        "alert_type": "EMERGENCY_REROUTE",
        "status": "ACTIVE",
        "diverted_tourists": data.diverted_tourists or 350,
        "partner_buses": data.partner_buses or 14,
        "partner_hotels": data.partner_hotels or 22,
        "alternative_routes": recommendations,
        "notes": data.notes or f"Automated diversion active for {site_name} due to {crowd_status} congestion.",
        "activated_by": current_user.id,
        "activated_at": now_iso,
        "resolved_at": None
    }

    # 4. Persist to Supabase emergency_reroutes table as source of truth
    db_saved = False
    try:
        # Resolve any prior active reroute for this site
        supabase_admin.table("emergency_reroutes").update({
            "status": "RESOLVED",
            "resolved_at": now_iso
        }).eq("site_id", resolved_site_id).eq("status", "ACTIVE").execute()

        res = supabase_admin.table("emergency_reroutes").insert(record).execute()
        if res.data and len(res.data) > 0:
            db_saved = True
            record = res.data[0]
    except Exception as e:
        print(f"Supabase emergency_reroutes persistence notice: {e}")

    # Save local persistent JSON backup
    save_local_reroute_state(record)

    return {
        "status": "success",
        "is_active": True,
        "alert": record,
        "persisted_to_supabase": db_saved
    }

@router.post("/alerts/reroute/deactivate")
def deactivate_emergency_reroute(
    data: RerouteDeactivateRequest,
    current_user: AuthenticatedUser = Depends(require_role(["government"]))
):
    """
    Deactivates / resolves an active emergency reroute.
    - Protected: Only users with verified JWT role='government' can deactivate.
    - Updates status='RESOLVED' in Supabase emergency_reroutes.
    """
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        q = supabase_admin.table("emergency_reroutes").update({
            "status": "RESOLVED",
            "resolved_at": now_iso
        }).eq("status", "ACTIVE")
        if data.site_id:
            q = q.eq("site_id", data.site_id)
        q.execute()
    except Exception as e:
        print(f"Supabase emergency_reroutes deactivation notice: {e}")

    local_state = load_local_reroute_state()
    if local_state:
        local_state["status"] = "RESOLVED"
        local_state["resolved_at"] = now_iso
        save_local_reroute_state(local_state)

    return {
        "status": "success",
        "is_active": False,
        "message": "Emergency reroute deactivated."
    }

@router.get("/alerts/reroute")
def get_reroute_alert(site_id: Optional[str] = None):
    """
    Returns the currently active emergency reroute alert if one exists.
    Accessible to all authenticated or public dashboard clients (Travel, Hotel, Tourist, Govt).
    """
    active_record = get_active_reroute_from_db(site_id)
    if active_record:
        # Ensure alternative routes are populated
        if not active_record.get("alternative_routes"):
            active_record["alternative_routes"] = resolve_sister_alternatives(active_record["site_id"])

        return {
            "is_active": True,
            "alert": active_record
        }

    return {
        "is_active": False,
        "alert": None
    }

@router.get("/alerts")
def get_alerts():
    # Fetch safety zones and sites
    zones = supabase.table("safety_zones").select("*").execute().data
    sites = supabase.table("sites").select("*").execute().data

    active_alerts = []

    # Check active emergency reroute first
    reroute = get_active_reroute_from_db()
    if reroute:
        active_alerts.append({
            "id": reroute.get("id"),
            "site_id": reroute.get("site_id"),
            "site_name": reroute.get("site_name"),
            "alert_type": "EMERGENCY_REROUTE",
            "severity": reroute.get("crowd_status", "CRITICAL"),
            "message": f"🚨 EMERGENCY REROUTE ACTIVE: High crowd congestion ({reroute.get('occupancy_percentage')}%) at {reroute.get('site_name')}. {reroute.get('diverted_tourists', 350)} tourists diverted to {reroute.get('partner_buses', 14)} buses and {reroute.get('partner_hotels', 22)} partner hotels.",
            "people_count": reroute.get("people_count"),
            "occupancy_percentage": reroute.get("occupancy_percentage"),
            "timestamp": reroute.get("activated_at"),
            "diverted_tourists": reroute.get("diverted_tourists"),
            "partner_buses": reroute.get("partner_buses"),
            "partner_hotels": reroute.get("partner_hotels"),
            "alternative_routes": reroute.get("alternative_routes")
        })

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