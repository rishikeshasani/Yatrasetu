import os
import shutil
import tempfile
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends, status

from dependencies import require_role, AuthenticatedUser
from services.crowd_service import (
    LEGACY_SITE_ALIASES,
    SITE_METADATA_FALLBACK,
    get_site_meta,
)
from services.yolo_service import yolo_service, DEFAULT_YOLO_FEEDS

router = APIRouter(prefix="/yolo", tags=["YOLO Crowd Vision"])

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv"}


@router.get("/status")
def get_yolo_status():
    """Returns the operational status of the YOLO vision subsystem and configured feeds."""
    return {
        "is_operational": yolo_service.is_operational,
        "model_path": yolo_service.model_path,
        "model_filename": yolo_service.model_filename,
        "person_class_id": yolo_service.get_person_class_id() if yolo_service.is_operational else None,
        "configured_feeds": DEFAULT_YOLO_FEEDS,
    }


from services.transit_service import transit_flow_service, TRANSIT_NODES_REGISTRY


@router.post("/analyze-video")
async def analyze_video(
    site_id: Optional[str] = Form(None, description="Canonical shrine site ID (e.g. TS001-TS025)"),
    node_id: Optional[str] = Form(None, description="Named transit node ID (e.g. NODE_SONPRAYAG, NODE_HARIDWAR_HW)"),
    sample_interval_sec: float = Form(1.0, description="Sampling interval in seconds for frame extraction"),
    max_frames: int = Form(30, description="Maximum number of frames to sample and analyze"),
    file: UploadFile = File(..., description="Video file stream for YOLO person detection"),
    current_user: AuthenticatedUser = Depends(require_role(["government", "police", "tourist", "travel_company"])),
):
    """
    YOLO Computer Vision Video Ingestion Endpoint:
    - Accepts video upload for either a sacred shrine (site_id) or a named transit node (node_id).
    - Validates target entity against registry.
    - Decodes video frames via OpenCV at specified sample interval.
    - Executes real Ultralytics YOLO person inference on sampled frames.
    - Dynamically propagates results into central crowd or transit flow engine.
    - Instantly recalculates passenger demand, fleet requirements, and operational alerts.
    """
    target_node = node_id or (site_id if site_id and (site_id.startswith("NODE_") or site_id in TRANSIT_NODES_REGISTRY) else None)
    target_site = site_id if not target_node else None

    if not target_node and not target_site:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'site_id' (for a sacred shrine) or 'node_id' (for a transit region) must be provided.",
        )

    # Validate site or node
    canonical_site_id = None
    if target_node:
        if target_node not in TRANSIT_NODES_REGISTRY:
            # Check case-insensitive match
            matched = None
            for k in TRANSIT_NODES_REGISTRY:
                if k.lower() == target_node.lower():
                    matched = k
                    break
            if not matched:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid transit node_id '{target_node}'. Valid nodes: {list(TRANSIT_NODES_REGISTRY.keys())}",
                )
            target_node = matched
    else:
        canonical_site_id = LEGACY_SITE_ALIASES.get(target_site, target_site)
        if canonical_site_id not in SITE_METADATA_FALLBACK:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid or unrecognized site_id '{target_site}'. Must resolve to a canonical site in TS001-TS025.",
            )

    # Validate file extension
    filename = file.filename or "video.mp4"
    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed video formats: {sorted(list(ALLOWED_VIDEO_EXTENSIONS))}",
        )

    if not yolo_service.is_operational:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="YOLO vision service is not operational or model weights could not be loaded.",
        )

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_video:
            temp_path = temp_video.name
            shutil.copyfileobj(file.file, temp_video)

        if target_node:
            # Process for Transit Region / Node
            node_result = yolo_service.analyze_transit_node_video(
                video_path=temp_path,
                node_id=target_node,
                sample_interval_sec=max(0.2, min(5.0, sample_interval_sec)),
                max_frames=max(1, min(120, max_frames)),
            )
            return {
                "status": "success",
                "target_type": "transit_node",
                "message": f"Successfully analyzed video for transit hub {node_result['name']} ({target_node})",
                "node": node_result,
                "fleet_recommendation": {
                    "expected_demand": node_result["expected_demand"],
                    "usable_capacity": node_result["usable_capacity"],
                    "required_buses": node_result["required_buses"],
                    "available_buses": node_result["available_buses"],
                    "shortage_buses": node_result["shortage_buses"],
                    "rationale": node_result["rationale"],
                },
                "processed_by": {
                    "user_id": current_user.id,
                    "role": current_user.role,
                },
            }
        else:
            # Process for Sacred Shrine
            observation = yolo_service.analyze_video_stream(
                video_path=temp_path,
                site_id=canonical_site_id,
                sample_interval_sec=max(0.2, min(5.0, sample_interval_sec)),
                max_frames=max(1, min(120, max_frames)),
            )

            return {
                "status": "success",
                "target_type": "shrine_site",
                "message": f"Successfully analyzed video for {observation['site_name']} ({canonical_site_id})",
                "observation": observation,
                "processed_by": {
                    "user_id": current_user.id,
                    "role": current_user.role,
                    "subrole": current_user.government_subrole,
                },
            }

    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Video analysis error: {str(ve)}",
        )
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference execution error: {str(re)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error processing video stream: {str(e)}",
        )
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception:
                pass
