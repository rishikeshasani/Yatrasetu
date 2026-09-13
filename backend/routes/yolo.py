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


@router.post("/analyze-video")
async def analyze_video(
    site_id: str = Form(..., description="Canonical shrine site ID (e.g. TS001-TS025)"),
    sample_interval_sec: float = Form(1.0, description="Sampling interval in seconds for frame extraction"),
    max_frames: int = Form(30, description="Maximum number of frames to sample and analyze"),
    file: UploadFile = File(..., description="Video file stream for YOLO person detection"),
    current_user: AuthenticatedUser = Depends(require_role(["government", "police", "tourist"])),
):
    """
    YOLO Computer Vision Video Ingestion Endpoint:
    - Accepts video upload and canonical site_id.
    - Validates canonical site identifier against system registry.
    - Validates video format and content-type.
    - Safely buffers video stream to temporary disk storage.
    - Decodes video frames via OpenCV at specified sample interval.
    - Executes real Ultralytics YOLO person inference on sampled frames.
    - Derives camera FOV headcount and passes through the shared canonical crowd engine.
    - Authoritatively updates live site crowd state under source 'yolo_video'.
    - Returns structured JSON meeting the telemetry contract with disclaimer.
    """
    canonical_id = LEGACY_SITE_ALIASES.get(site_id, site_id)
    if canonical_id not in SITE_METADATA_FALLBACK:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or unrecognized site_id '{site_id}'. Must resolve to a canonical site in TS001-TS025.",
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

        observation = yolo_service.analyze_video_stream(
            video_path=temp_path,
            site_id=canonical_id,
            sample_interval_sec=max(0.2, min(5.0, sample_interval_sec)),
            max_frames=max(1, min(120, max_frames)),
        )

        return {
            "status": "success",
            "message": f"Successfully analyzed video for {observation['site_name']} ({canonical_id})",
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
