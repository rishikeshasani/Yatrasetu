import os
import csv
import uuid
from datetime import datetime, date, time, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from database import supabase_admin
from dependencies import AuthenticatedUser, require_role, require_police_operations
from routes.crowd import get_site_meta, get_site_baseline, resolve_site_crowd_state

router = APIRouter(tags=["Police Crowd Surge Simulations"])

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SAFETY_CSV_PATH = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "data", "safety_zones.csv"))
ALTERNATIVES_CSV_PATH = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "data", "alternatives.csv"))
CROWD_CSV_PATH = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "data", "crowd_data.csv"))


# ----------------------------------------------------------------------------
# Helper Data Loaders
# ----------------------------------------------------------------------------

def load_safety_zone_record(canonical_id: str) -> Optional[Dict[str, str]]:
    """Loads safety zone details from data/safety_zones.csv without fabricating coordinates."""
    if not os.path.exists(SAFETY_CSV_PATH):
        return None
    try:
        with open(SAFETY_CSV_PATH, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("spot_id") == canonical_id:
                    return row
    except Exception as e:
        print(f"Warning: error reading safety_zones.csv: {e}")
    return None


def load_alternatives_records(canonical_id: str) -> List[Dict[str, Any]]:
    """Loads surrounding lower-density alternatives from data/alternatives.csv."""
    recommendations = []
    if not os.path.exists(ALTERNATIVES_CSV_PATH):
        return recommendations
    try:
        with open(ALTERNATIVES_CSV_PATH, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("main_spot_id") == canonical_id:
                    try:
                        dist = float(row.get("distance_km_from_main", 0))
                        travel_time = int(row.get("travel_time_mins", 0))
                        digits = "".join(c for c in row.get("crowd_comparison_percentage", "") if c.isdigit())
                        rel_crowd = int(digits) if digits else 50
                    except ValueError:
                        continue

                    recommendations.append({
                        "alternative_id": row.get("alt_id"),
                        "name": row.get("alternative_spot_name"),
                        "type": row.get("alternative_type"),
                        "distance_km": dist,
                        "travel_time_mins": travel_time,
                        "relative_crowd_percentage": rel_crowd,
                        "crowd_savings": f"{max(0, 100 - rel_crowd)}% less crowded",
                        "why_visit": row.get("why_visit_key_attraction"),
                        "best_time_to_visit": row.get("best_time_to_visit"),
                        "road_connectivity": row.get("road_connectivity_status")
                    })
        recommendations.sort(key=lambda x: (x["relative_crowd_percentage"], x["travel_time_mins"]))
    except Exception as e:
        print(f"Warning: error reading alternatives.csv: {e}")
    return recommendations


# ----------------------------------------------------------------------------
# Pydantic Schemas
# ----------------------------------------------------------------------------

class CreateSimulationRequest(BaseModel):
    site_id: str = Field(..., description="Target site/venue identifier, e.g. TS001")
    event_name: Optional[str] = Field("Planned Rally / Event", description="Name or nature of the planned event")
    event_date: str = Field(..., description="Date of planned event (YYYY-MM-DD)")
    event_time: str = Field(..., description="Time of planned event (HH:MM)")
    expected_crowd_increase: int = Field(..., gt=0, description="Expected additional crowd influx (> 0)")
    event_duration_hours: Optional[float] = Field(4.0, gt=0, description="Estimated duration in hours")

    @field_validator("event_date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        clean_date = v.strip()
        try:
            date.fromisoformat(clean_date)
        except Exception:
            raise ValueError("Invalid date format. Expected ISO format YYYY-MM-DD.")
        return clean_date

    @field_validator("event_time")
    @classmethod
    def validate_time(cls, v: str) -> str:
        clean_time = v.strip()
        parts = clean_time.split(":")
        if len(parts) < 2:
            raise ValueError("Invalid time format. Expected HH:MM.")
        try:
            h = int(parts[0])
            m = int(parts[1])
            if not (0 <= h <= 23 and 0 <= m <= 59):
                raise ValueError()
        except Exception:
            raise ValueError("Invalid time format. Hours must be 0-23, minutes 0-59.")
        return f"{h:02d}:{m:02d}"

    @field_validator("expected_crowd_increase")
    @classmethod
    def validate_crowd(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Expected crowd increase must be greater than zero.")
        if v > 1000000:
            raise ValueError("Expected crowd increase exceeds maximum realistic scenario threshold (1,000,000).")
        return v


class SimulationResponse(BaseModel):
    id: str
    created_by: Optional[str] = None
    site_id: str
    site_name: str
    event_name: str
    event_date: str
    event_time: str
    event_duration_hours: float
    expected_crowd_increase: int
    baseline_people_count: int
    simulated_people_count: int
    site_capacity: int
    simulated_occupancy_percentage: float
    simulated_crowd_status: str
    traffic_impact: str
    risk_level: str
    risk_explanation: str
    estimated_delay_minutes: int
    delay_display: str
    scenario_disclaimer: str
    high_risk_zones: List[Dict[str, Any]]
    low_density_alternatives: List[Dict[str, Any]]
    recommendations: List[str]
    data_sources: Dict[str, Any]
    created_at: str
    updated_at: str


# ----------------------------------------------------------------------------
# Core Simulation Engine
# ----------------------------------------------------------------------------

def run_simulation_calculation(
    site_id: str,
    event_name: str,
    event_date: str,
    event_time: str,
    expected_crowd_increase: int,
    event_duration_hours: float,
    created_by: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes deterministic scenario surge calculation using authoritative real YatraSetu data.
    Never modifies live crowd observations or sites capacity.
    """
    canonical_id, site_name, capacity = get_site_meta(site_id)

    # 1. Authoritative baseline crowd observation from canonical resolver
    baseline_state = resolve_site_crowd_state(canonical_id)
    baseline_count = baseline_state["people_count"]

    # 2. Virtual surge calculation
    simulated_count = baseline_count + expected_crowd_increase
    simulated_occ = round((simulated_count / max(1, capacity)) * 100.0, 1)

    # 3. YatraSetu standard crowd thresholds (<50% NORMAL, 50-75% MODERATE, 75-90% HIGH, >=90% CRITICAL)
    if simulated_occ < 50.0:
        simulated_status = "NORMAL"
        risk_level = "LOW"
        risk_explanation = "Current venue capacity appears sufficient under this scenario. Routine monitoring recommended."
        traffic_impact = "LOW"
        delay_mins = 15
        delay_display = "10–20 minutes (Nominal flow)"
    elif simulated_occ < 75.0:
        simulated_status = "MODERATE"
        risk_level = "MODERATE"
        risk_explanation = "Additional monitoring and proactive queue/traffic management may be required."
        traffic_impact = "MODERATE"
        delay_mins = 30
        delay_display = "20–40 minutes (Moderate congestion)"
    elif simulated_occ < 90.0:
        simulated_status = "HIGH"
        risk_level = "HIGH"
        risk_explanation = "Prepare crowd-control teams, stagger arrivals, and consider perimeter diversion measures."
        traffic_impact = "HIGH"
        delay_mins = 50
        delay_display = "40–60 minutes (Heavy queues)"
    else:
        simulated_status = "CRITICAL"
        risk_level = "CRITICAL"
        risk_explanation = "High congestion risk. Prepare controlled entry, traffic diversion, and emergency response measures."
        traffic_impact = "SEVERE"
        delay_mins = 75
        delay_display = "60+ minutes (Severe chokepoint delays)"

    # 4. High-risk zones derived from real safety data (data/safety_zones.csv)
    safety_record = load_safety_zone_record(canonical_id)
    high_risk_zones = []

    if safety_record:
        # Zone 1: Main Temple Sanctum / Ingress Gate
        if simulated_occ >= 75.0:
            high_risk_zones.append({
                "zone_name": f"{site_name} - Main Ingress & Sanctum Gate",
                "risk_level": "CRITICAL" if simulated_occ >= 90.0 else "HIGH",
                "reason": f"Simulated occupancy reaches {simulated_occ}%, exceeding safe throughput capacity at pedestrian entry corrals.",
                "mitigation": safety_record.get("risk_mitigation_measures", "Deploy rapid barricades and queue marshals.")
            })

        # Zone 2: Transport & Parking Approach
        if expected_crowd_increase >= 3000 or simulated_occ >= 75.0:
            high_risk_zones.append({
                "zone_name": f"{site_name} - Arterial Approach & Satellite Parking",
                "risk_level": "HIGH" if simulated_occ >= 90.0 else "MODERATE",
                "reason": f"Projected influx of +{expected_crowd_increase:,} persons creates vehicular backpressure on arterial junctions.",
                "mitigation": "Divert incoming private vehicles to designated peripheral holding grounds."
            })

        # Zone 3: Evacuation route & hazard vulnerability
        if simulated_occ >= 90.0 and safety_record.get("emergency_exits_and_evacuation_routes"):
            evac_text = safety_record.get("emergency_exits_and_evacuation_routes", "").split(";")[0]
            high_risk_zones.append({
                "zone_name": f"{site_name} - Primary Evacuation Corridor ({evac_text})",
                "risk_level": "CRITICAL",
                "reason": f"Specific hazard: {safety_record.get('high_risk_zone_type', 'Crowd Congestion')}. Requires unobstructed clearway.",
                "mitigation": "Enforce strict zero-encroachment corridor; pre-position medical first-aid teams."
            })

    # 5. Low-density surrounding alternatives from real alternatives data (data/alternatives.csv)
    alternatives = load_alternatives_records(canonical_id)

    # 6. Operational preventive recommendations
    if simulated_status == "NORMAL":
        recommendations = [
            "Maintain nominal police post presence at main shrine gates.",
            "Verify clear CCTV surveillance coverage across access avenues.",
            "Keep standard emergency lanes clear and unobstructed."
        ]
    elif simulated_status == "MODERATE":
        recommendations = [
            "Station traffic constabulary personnel at primary intersection approaches.",
            "Activate secondary parking holding areas to stagger vehicle arrival.",
            "Maintain real-time gate metering and public address advisories.",
            "Advise pilgrims on estimated queue durations upon arrival."
        ]
    elif simulated_status == "HIGH":
        recommendations = [
            "Mobilize additional crowd-control personnel and deploy rapid barricades.",
            "Enforce one-way pedestrian flow corridors at entry and exit portals.",
            "Establish perimeter traffic holding points to prevent sanctum chokepoints.",
            "Recommend lower-density alternative destinations via pilgrim mobile channels.",
            "Prepare transit shuttle buses at peripheral satellite parking hubs."
        ]
    else:  # CRITICAL
        recommendations = [
            "Implement staged batch entry at primary gates with maximum throughput caps.",
            "Enforce heavy vehicle diversions to peripheral bypass arteries.",
            "Deploy reserve police platoons, SDRF rescue squads, and rapid response units.",
            "Designate and strictly protect dedicated green emergency evacuation corridors.",
            "Place medical triage and emergency ambulance posts on high alert.",
            "Prepare corridor rerouting protocol for administrative execution if surge manifests."
        ]

    # 7. Data sources transparency
    data_sources = {
        "live_baseline": f"{baseline_count:,} devotees ({baseline_state.get('last_updated', 'Canonical crowd resolver')})",
        "site_capacity": f"{capacity:,} devotees (Official daily carrying capacity)",
        "historical_crowd_data": "Available (USDMA/BKTC historical influx patterns)",
        "safety_zone_data": "Available (Official District Disaster Management blueprints)",
        "fastag_vehicle_inflow": "Future Integration (Automated highway toll plaza telemetry)",
        "railway_irctc_arrivals": "Future Integration (Incoming passenger reservation trends)",
        "event_calendar_ingestion": "Manual Input (Future automated municipal event calendar)"
    }

    now_iso = datetime.now(timezone.utc).isoformat()
    sim_id = str(uuid.uuid4())

    return {
        "id": sim_id,
        "created_by": created_by,
        "site_id": canonical_id,
        "site_name": site_name,
        "event_name": event_name,
        "event_date": event_date,
        "event_time": event_time,
        "event_duration_hours": event_duration_hours,
        "expected_crowd_increase": expected_crowd_increase,
        "baseline_people_count": baseline_count,
        "simulated_people_count": simulated_count,
        "site_capacity": capacity,
        "simulated_occupancy_percentage": simulated_occ,
        "simulated_crowd_status": simulated_status,
        "traffic_impact": traffic_impact,
        "risk_level": risk_level,
        "risk_explanation": risk_explanation,
        "estimated_delay_minutes": delay_mins,
        "delay_display": delay_display,
        "scenario_disclaimer": "AI-Assisted Crowd Surge Scenario: Scenario estimate based on current crowd telemetry, historical crowd patterns, site capacity and safety information.",
        "high_risk_zones": high_risk_zones,
        "low_density_alternatives": alternatives,
        "recommendations": recommendations,
        "data_sources": data_sources,
        "created_at": now_iso,
        "updated_at": now_iso
    }


# ----------------------------------------------------------------------------
# Endpoints (Strictly Police Command Only)
# ----------------------------------------------------------------------------

@router.post(
    "/police/crowd-simulations",
    response_model=SimulationResponse,
    status_code=status.HTTP_201_CREATED
)
@router.post(
    "/government/crowd-simulations",
    response_model=SimulationResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False
)
def create_crowd_simulation(
    payload: CreateSimulationRequest,
    current_user: AuthenticatedUser = Depends(require_police_operations)
):
    """
    Police Command Endpoint: Runs an internal crowd surge scenario simulation.
    - Protected: Authenticated Police officers ONLY (Government/Tourist/Hotel/Travel -> 403 Forbidden).
    - Isolation: Strictly separate from live crowd observations. Does NOT modify sites or live density.
    - Supabase: Supabase is the sole authoritative store. If Supabase fails, returns explicit 500 error.
    """
    # 1. Validate site exists in canonical catalog (TS001-TS025)
    import re
    canonical_id, site_name, capacity = get_site_meta(payload.site_id)
    is_canonical = bool(canonical_id and re.match(r"^TS0(0[1-9]|1[0-9]|2[0-5])$", canonical_id))
    if not is_canonical:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site '{payload.site_id}' is not a valid canonical YatraSetu destination (TS001–TS025)."
        )

    # 2. Run simulation calculation
    sim_data = run_simulation_calculation(
        site_id=canonical_id,
        event_name=payload.event_name or "Planned Rally / Event",
        event_date=payload.event_date,
        event_time=payload.event_time,
        expected_crowd_increase=payload.expected_crowd_increase,
        event_duration_hours=payload.event_duration_hours or 4.0,
        created_by=current_user.id
    )

    # 3. Persist strictly to Supabase public.crowd_simulations table
    # Prepare record matching public.crowd_simulations schema
    db_record = {
        "id": sim_data["id"],
        "created_by": current_user.id,
        "site_id": canonical_id,
        "site_name": site_name,
        "event_name": sim_data["event_name"],
        "event_date": sim_data["event_date"],
        "event_time": sim_data["event_time"],
        "expected_crowd_increase": sim_data["expected_crowd_increase"],
        "baseline_people_count": sim_data["baseline_people_count"],
        "simulated_people_count": sim_data["simulated_people_count"],
        "simulated_occupancy_percentage": sim_data["simulated_occupancy_percentage"],
        "simulated_crowd_status": sim_data["simulated_crowd_status"],
        "traffic_impact": sim_data["traffic_impact"],
        "risk_level": sim_data["risk_level"],
        "risk_explanation": sim_data["risk_explanation"],
        "estimated_delay_minutes": sim_data["estimated_delay_minutes"],
        "delay_display": sim_data["delay_display"],
        "event_duration_hours": sim_data["event_duration_hours"],
        "high_risk_zones": sim_data["high_risk_zones"],
        "low_density_alternatives": sim_data["low_density_alternatives"],
        "recommendations": sim_data["recommendations"],
        "data_sources": sim_data["data_sources"],
        "created_at": sim_data["created_at"],
        "updated_at": sim_data["updated_at"]
    }

    try:
        insert_res = supabase_admin.table("crowd_simulations").insert(db_record).execute()
        if not insert_res.data:
            # Check if returned error
            raise Exception("No data returned from Supabase insert.")
    except Exception as e:
        error_msg = str(e)
        print(f"Supabase persistence error for crowd_simulations: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Supabase database error storing simulation: {error_msg}. Ensure migration '007_create_crowd_simulations.sql' is applied."
        )

    return SimulationResponse(**sim_data)


@router.get(
    "/police/crowd-simulations",
    response_model=List[SimulationResponse]
)
@router.get(
    "/government/crowd-simulations",
    response_model=List[SimulationResponse],
    include_in_schema=False
)
def list_crowd_simulations(
    current_user: AuthenticatedUser = Depends(require_police_operations)
):
    """
    Police Command Endpoint: Lists previous crowd surge scenario simulations.
    - Protected: Authenticated Police officers ONLY (Government/Tourist/Hotel/Travel -> 403 Forbidden).
    - Authoritative: Queries directly from public.crowd_simulations in Supabase.
    """
    try:
        res = supabase_admin.table("crowd_simulations")\
            .select("*")\
            .order("created_at", desc=True)\
            .execute()
        rows = res.data or []
    except Exception as e:
        error_msg = str(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Supabase database error querying simulations: {error_msg}. Ensure migration '007_create_crowd_simulations.sql' is applied."
        )

    results = []
    for r in rows:
        # Resolve site capacity if not directly stored in older rows
        _, _, cap = get_site_meta(r.get("site_id", "TS001"))
        r_copy = dict(r)
        r_copy["site_capacity"] = r_copy.get("site_capacity") or cap
        r_copy["scenario_disclaimer"] = "AI-Assisted Crowd Surge Scenario: Scenario estimate based on current crowd telemetry, historical crowd patterns, site capacity and safety information."
        results.append(SimulationResponse(**r_copy))

    return results


@router.get(
    "/police/crowd-simulations/{simulation_id}",
    response_model=SimulationResponse
)
@router.get(
    "/government/crowd-simulations/{simulation_id}",
    response_model=SimulationResponse,
    include_in_schema=False
)
def get_crowd_simulation(
    simulation_id: str,
    current_user: AuthenticatedUser = Depends(require_police_operations)
):
    """
    Police Command Endpoint: Retrieves a specific simulation dossier by ID.
    - Protected: Authenticated Police officers ONLY (Government/Tourist/Hotel/Travel -> 403 Forbidden).
    """
    try:
        res = supabase_admin.table("crowd_simulations")\
            .select("*")\
            .eq("id", simulation_id)\
            .execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Simulation scenario '{simulation_id}' not found."
            )
        record = res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Supabase database error querying simulation: {error_msg}."
        )

    _, _, cap = get_site_meta(record.get("site_id", "TS001"))
    r_copy = dict(record)
    r_copy["site_capacity"] = r_copy.get("site_capacity") or cap
    r_copy["scenario_disclaimer"] = "AI-Assisted Crowd Surge Scenario: Scenario estimate based on current crowd telemetry, historical crowd patterns, site capacity and safety information."
    return SimulationResponse(**r_copy)


@router.delete(
    "/police/crowd-simulations/{simulation_id}"
)
@router.delete(
    "/government/crowd-simulations/{simulation_id}",
    include_in_schema=False
)
def delete_crowd_simulation(
    simulation_id: str,
    current_user: AuthenticatedUser = Depends(require_police_operations)
):
    """
    Police Command Endpoint: Deletes a simulation scenario.
    - Protected: Authenticated Police officers ONLY (Government/Tourist/Hotel/Travel -> 403 Forbidden).
    - Rule: Deletes ONLY the specific simulation record; never deletes crowd observations, sites, or safety info.
    """
    try:
        # First verify it exists
        chk = supabase_admin.table("crowd_simulations").select("id, created_by").eq("id", simulation_id).execute()
        if not chk.data or len(chk.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Simulation scenario '{simulation_id}' not found."
            )

        del_res = supabase_admin.table("crowd_simulations").delete().eq("id", simulation_id).execute()
        return {
            "status": "success",
            "message": f"Simulation scenario '{simulation_id}' deleted successfully."
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Supabase database error deleting simulation: {error_msg}."
        )
