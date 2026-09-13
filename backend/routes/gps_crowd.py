"""
YatraSetu GPS Crowd Ingestion & Aggregation API Routes
======================================================
Provides endpoints for:
1. Mobile tourist GPS location ping (strictly geofence matching & anonymous active device counting).
2. Command center / simulated aggregate GPS ingestion.
3. System status of GPS geofences, active devices, and fusion parameters.

STRICT PRIVACY:
- NEVER logs or returns individual user coordinates.
- NEVER exposes device hashes or movement trails.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

from dependencies import security, get_current_user, require_role, AuthenticatedUser
from services.crowd_service import (
    SITE_METADATA_FALLBACK,
    LEGACY_SITE_ALIASES,
    resolve_site_crowd_state,
)
from services.gps_crowd_service import (
    gps_crowd_service,
    SHRINE_GEOFENCE_RADII,
    DEFAULT_GEOFENCE_RADIUS_METERS,
)

router = APIRouter(prefix="/crowd/gps", tags=["GPS Crowd Estimation"])


class GPSLocationPing(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")
    client_identifier: Optional[str] = Field(None, description="Optional anonymous transient client token for deduplication")


class GPSAggregateRequest(BaseModel):
    site_id: str = Field(..., description="Canonical shrine ID (TS001-TS025)")
    active_device_count: int = Field(..., ge=0, description="Number of active devices inside geofence")
    is_demo: Optional[bool] = Field(False, description="Flag indicating demonstration telemetry")


@router.get("/status")
def get_gps_system_status():
    """
    Returns the operational configuration of the GPS crowd estimation subsystem:
    - Configured geofence radii across shrines
    - Estimation factor (devices to people)
    - Explainable fusion weights
    - Current active device counts per shrine
    """
    active_counts = {}
    for s_id in SITE_METADATA_FALLBACK.keys():
        cnt = gps_crowd_service.get_active_device_count(s_id)
        if cnt > 0:
            active_counts[s_id] = cnt

    return {
        "status": "operational",
        "description": "Mobile GPS-based crowd estimation infrastructure with explainable multi-source fusion",
        "device_to_person_factor": gps_crowd_service.device_to_person_factor,
        "fusion_weights": {
            "yolo_weight": gps_crowd_service.yolo_weight,
            "gps_weight": gps_crowd_service.gps_weight
        },
        "default_geofence_radius_meters": DEFAULT_GEOFENCE_RADIUS_METERS,
        "active_devices_by_site": active_counts,
        "privacy_guarantee": "No individual tourist coordinates, trajectories, or device IDs are persisted or exposed."
    }


@router.post("")
@router.post("/")
def submit_tourist_gps_location(
    data: GPSLocationPing,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    Tourist Mobile Location Ping Endpoint:
    - Receives mobile device coordinates.
    - Resolves nearest canonical shrine and checks geofence containment.
    - Anonymously counts unique active devices within the site's sliding 15-minute window.
    - Aggregates at ingestion time; NEVER persists or logs user coordinates.
    - Returns geofence feedback to the user without exposing other devotees.
    """
    # Optional authentication resolution
    client_id = data.client_identifier
    if credentials and credentials.credentials:
        try:
            user = get_current_user(credentials)
            if user:
                client_id = client_id or user.id
        except Exception:
            pass

    # If still None, fall back to client IP as salt seed
    if not client_id and request.client:
        client_id = request.client.host

    try:
        result = gps_crowd_service.record_location_ping(
            latitude=data.latitude,
            longitude=data.longitude,
            client_identifier=client_id
        )
        return {
            "status": "success",
            **result
        }
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing GPS location ping: {str(e)}"
        )


@router.post("/aggregate")
def submit_aggregated_gps_crowd(
    data: GPSAggregateRequest,
    current_user: AuthenticatedUser = Depends(require_role(["government", "police", "tourist"]))
):
    """
    Aggregated GPS Crowd Telemetry / Demo Ingestion:
    - Accepts pre-aggregated active device counts for a site.
    - Converts to estimated people using the canonical factor.
    - Updates the shared crowd engine.
    - Protected by RBAC (government/police command center or authenticated testing).
    """
    canonical_id = LEGACY_SITE_ALIASES.get(data.site_id, data.site_id)
    if canonical_id not in SITE_METADATA_FALLBACK:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid site_id '{data.site_id}'. Must resolve to canonical site TS001-TS025."
        )

    source = "gps_crowd_demo" if data.is_demo else "gps_crowd"

    obs = gps_crowd_service.publish_gps_observation(
        site_id=canonical_id,
        active_device_count=data.active_device_count,
        source=source,
        is_demo=bool(data.is_demo)
    )

    # Resolve updated live crowd state through the shared engine
    updated_state = resolve_site_crowd_state(canonical_id)

    return {
        "status": "success",
        "message": f"Aggregated GPS crowd updated for {updated_state['site_name']} ({canonical_id})",
        "gps_observation": obs,
        "site_crowd_state": updated_state,
        "submitted_by": {
            "user_id": current_user.id,
            "role": current_user.role,
            "subrole": current_user.government_subrole
        }
    }


@router.get("/{site_id}")
def get_site_gps_signal(site_id: str):
    """Returns the current aggregated GPS signal for a canonical site if fresh."""
    canonical_id = LEGACY_SITE_ALIASES.get(site_id, site_id)
    if canonical_id not in SITE_METADATA_FALLBACK:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site '{site_id}' not found in canonical shrine registry."
        )

    obs = gps_crowd_service.get_latest_gps_observation(canonical_id)
    active_devices = gps_crowd_service.get_active_device_count(canonical_id)
    radius = gps_crowd_service.get_geofence_radius(canonical_id)

    return {
        "site_id": canonical_id,
        "site_name": SITE_METADATA_FALLBACK[canonical_id]["name"],
        "geofence_radius_meters": radius,
        "active_device_count": active_devices,
        "gps_estimated_people": int(round(active_devices * gps_crowd_service.device_to_person_factor)),
        "device_to_person_factor": gps_crowd_service.device_to_person_factor,
        "latest_observation": obs
    }
