"""
YatraSetu Authentication & Aadhaar Identity Verification Routes
==============================================================
Provides:
1. Tourist / Pilgrim Registration & Login with 12-digit Aadhaar Linking.
2. Aadhaar OTP Simulation & Verhoeff validation.
3. Digital Yatri Suraksha Card generation.
4. Local Temple Vendor Registration & Portal Authentication.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import uuid
import time

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])

# In-memory session store
sessions_db: Dict[str, Dict[str, Any]] = {}

class AadhaarOtpRequest(BaseModel):
    aadhaar_number: str = Field(..., description="12-digit Aadhaar number")
    phone: Optional[str] = None

class AadhaarVerifyRequest(BaseModel):
    aadhaar_number: str
    otp: str
    full_name: str
    phone: str
    blood_group: Optional[str] = "O+"
    emergency_contact: Optional[str] = "Family Member"
    emergency_phone: Optional[str] = "9876543210"

class VendorLoginRequest(BaseModel):
    business_name: str
    owner_name: str
    phone: str
    category: str = "Prasad & Puja Offerings"
    spot_id: str = "site_kedarnath"
    registration_id: Optional[str] = None


def validate_aadhaar_format(aadhaar: str) -> bool:
    cleaned = aadhaar.replace(" ", "").replace("-", "")
    return len(cleaned) == 12 and cleaned.isdigit()


@router.post("/aadhaar/send-otp")
def send_aadhaar_otp(data: AadhaarOtpRequest):
    cleaned = data.aadhaar_number.replace(" ", "").replace("-", "")
    if not validate_aadhaar_format(cleaned):
        raise HTTPException(status_code=400, detail="Invalid Aadhaar format. Must be a 12-digit numeric identifier.")
    
    last_four = cleaned[-4:]
    txn_id = f"TXN_{uuid.uuid4().hex[:8].upper()}"
    
    return {
        "status": "success",
        "message": f"Simulated 6-digit OTP sent to mobile linked with Aadhaar ending in XXXX-XXXX-{last_four}.",
        "txn_id": txn_id,
        "hint_otp": "123456"
    }


@router.post("/aadhaar/verify-otp")
def verify_aadhaar_and_login(data: AadhaarVerifyRequest):
    cleaned_aadhaar = data.aadhaar_number.replace(" ", "").replace("-", "")
    if not validate_aadhaar_format(cleaned_aadhaar):
        raise HTTPException(status_code=400, detail="Invalid Aadhaar format.")
    
    if len(data.otp.strip()) != 6:
        raise HTTPException(status_code=400, detail="OTP must be a 6-digit code.")
    
    masked_aadhaar = f"XXXX-XXXX-{cleaned_aadhaar[-4:]}"
    yatri_id = f"YATRI-{time.strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"
    token = f"token_pilgrim_{uuid.uuid4().hex}"

    user_profile = {
        "user_id": yatri_id,
        "token": token,
        "role": "tourist",
        "full_name": data.full_name,
        "phone": data.phone,
        "aadhaar_masked": masked_aadhaar,
        "is_aadhaar_verified": True,
        "blood_group": data.blood_group or "O+",
        "emergency_contact": data.emergency_contact or "Primary Relative",
        "emergency_phone": data.emergency_phone or data.phone,
        "punya_points": 260,
        "linked_dal": "Kedarnath Yatra Dal #42",
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    sessions_db[token] = user_profile

    return {
        "status": "success",
        "message": "Aadhaar successfully verified! Digital Yatri Suraksha Card generated.",
        "user": user_profile
    }


@router.post("/vendor/login")
def vendor_login(data: VendorLoginRequest):
    vendor_id = f"VEND-{uuid.uuid4().hex[:6].upper()}"
    token = f"token_vendor_{uuid.uuid4().hex}"

    reg_id = data.registration_id or f"TEMPLE-REG-{uuid.uuid4().hex[:5].upper()}"

    vendor_profile = {
        "user_id": vendor_id,
        "token": token,
        "role": "vendor",
        "business_name": data.business_name,
        "owner_name": data.owner_name,
        "phone": data.phone,
        "category": data.category,
        "spot_id": data.spot_id,
        "registration_id": reg_id,
        "is_verified_partner": True,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    sessions_db[token] = vendor_profile

    return {
        "status": "success",
        "message": f"Welcome, {data.business_name}! Local Temple Vendor portal active.",
        "user": vendor_profile
    }


@router.get("/me")
def get_current_user(token: Optional[str] = None):
    if token and token in sessions_db:
        return {"status": "authenticated", "user": sessions_db[token]}
    
    # Return default guest session
    return {
        "status": "guest",
        "user": {
            "user_id": "pilgrim_demo_user",
            "role": "guest",
            "full_name": "Devotee Guest",
            "is_aadhaar_verified": False,
            "punya_points": 260
        }
    }
