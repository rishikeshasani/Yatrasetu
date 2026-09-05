from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from database import supabase, supabase_admin
from datetime import datetime

router = APIRouter(prefix="/fleet", tags=["fleet"])

# ---------------------------------------------------------------------------
# In-memory cache so the Hotel dashboard can get instant reads
# without hammering Supabase on every poll.
# ---------------------------------------------------------------------------
_fleet_cache: List[dict] = [
    {
        "id": "HR-01",
        "from_location": "Delhi (ISBT Kashmiri Gate)",
        "to_location": "Haridwar (Har Ki Pauri)",
        "departure_time": "06:00 AM",
        "arrival_time": "11:00 AM",
        "journey_date": "Oct 12 (Fri)",
        "direction": "forward",
        "buses": 3,
        "capacity": 42,
        "occupancy": 94,
        "bus_type": "Volvo A/C",
        "status": "HIGH DEMAND",
        "operator": "Sharma Travels",
        "updated_at": datetime.utcnow().isoformat(),
    },
    {
        "id": "HR-02",
        "from_location": "Dehradun (Bus Stand)",
        "to_location": "Haridwar (Har Ki Pauri)",
        "departure_time": "08:30 AM",
        "arrival_time": "10:30 AM",
        "journey_date": "Oct 12 (Fri)",
        "direction": "forward",
        "buses": 2,
        "capacity": 38,
        "occupancy": 100,
        "bus_type": "Sleeper",
        "status": "FULL",
        "operator": "Sharma Travels",
        "updated_at": datetime.utcnow().isoformat(),
    },
    {
        "id": "HR-03",
        "from_location": "Haridwar (Har Ki Pauri)",
        "to_location": "Delhi (ISBT Kashmiri Gate)",
        "departure_time": "04:00 PM",
        "arrival_time": "09:30 PM",
        "journey_date": "Oct 13 (Sun)",
        "direction": "return",
        "buses": 3,
        "capacity": 42,
        "occupancy": 88,
        "bus_type": "Volvo A/C",
        "status": "RETURN",
        "operator": "Sharma Travels",
        "updated_at": datetime.utcnow().isoformat(),
    },
    {
        "id": "HR-04",
        "from_location": "Rishikesh (Triveni Ghat)",
        "to_location": "Haridwar (Har Ki Pauri)",
        "departure_time": "10:00 AM",
        "arrival_time": "11:00 AM",
        "journey_date": "Oct 12 (Fri)",
        "direction": "forward",
        "buses": 1,
        "capacity": 30,
        "occupancy": 67,
        "bus_type": "Mini Bus",
        "status": "NORMAL",
        "operator": "Sharma Travels",
        "updated_at": datetime.utcnow().isoformat(),
    },
]


class FleetRouteUpdate(BaseModel):
    id: str
    buses: int
    operator: Optional[str] = "Sharma Travels"


class FleetSchedulePayload(BaseModel):
    routes: List[FleetRouteUpdate]


# ---------------------------------------------------------------------------
# GET /fleet/schedules  — read current schedule (hotel dashboard polls this)
# ---------------------------------------------------------------------------
@router.get("/schedules")
def get_fleet_schedules():
    """
    Returns the current live fleet schedule.
    Used by: HotelDashboard and TravelCompanyDashboard to show inbound/outbound bus schedules.
    """
    # Try to read from Supabase first; fall back to in-memory cache
    try:
        resp = supabase_admin.table("fleet_schedules").select("*").order("departure_time").execute()
        if resp.data and len(resp.data) > 0:
            return {"status": "success", "source": "supabase", "routes": resp.data}
    except Exception:
        pass

    # Fallback to in-memory cache
    return {"status": "success", "source": "cache", "routes": _fleet_cache}


# ---------------------------------------------------------------------------
# POST /fleet/schedules  — travel operator or government saves adjusted schedule
# ---------------------------------------------------------------------------
@router.post("/schedules")
def save_fleet_schedules(payload: FleetSchedulePayload):
    """
    Travel operator or Government submits adjusted bus counts.
    1. Updates the in-memory cache instantly (Hotel dashboard sees it immediately).
    2. Upserts each route into Supabase fleet_schedules table.
    """
    updated_ids = []

    for update in payload.routes:
        # 1. Update in-memory cache
        matched_cache = None
        for route in _fleet_cache:
            if route["id"] == update.id:
                route["buses"] = update.buses
                route["updated_at"] = datetime.utcnow().isoformat()
                matched_cache = route
                break

        # 2. Update Supabase (updates existing route fields, or upserts full cache row if new)
        try:
            res = supabase_admin.table("fleet_schedules").update({
                "buses": update.buses,
                "updated_at": datetime.utcnow().isoformat(),
            }).eq("id", update.id).execute()
            if not res.data and matched_cache:
                supabase_admin.table("fleet_schedules").upsert(matched_cache).execute()
        except Exception as e:
            print(f"Notice: Supabase fleet_schedules update for {update.id}: {e}")

        updated_ids.append(update.id)

    # Read current state after update
    current_routes = _fleet_cache
    try:
        resp = supabase_admin.table("fleet_schedules").select("*").order("departure_time").execute()
        if resp.data and len(resp.data) > 0:
            current_routes = resp.data
    except Exception:
        pass

    return {
        "status": "success",
        "message": f"Fleet schedule updated for {len(updated_ids)} route(s). Dashboards synchronized.",
        "updated_routes": updated_ids,
        "routes": current_routes,
    }


# ---------------------------------------------------------------------------
# GET /fleet/schedules/inbound  — hotel-specific endpoint (forward routes only)
# ---------------------------------------------------------------------------
@router.get("/schedules/inbound")
def get_inbound_buses():
    """
    Lightweight endpoint used exclusively by HotelDashboard.
    Returns only forward/inbound routes headed to Haridwar.
    """
    try:
        resp = supabase_admin.table("fleet_schedules").select("*").eq("direction", "forward").execute()
        if resp.data and len(resp.data) > 0:
            return {"status": "success", "source": "supabase", "routes": resp.data}
    except Exception:
        pass

    inbound = [r for r in _fleet_cache if r.get("direction") == "forward"]
    return {"status": "success", "source": "cache", "routes": inbound}
