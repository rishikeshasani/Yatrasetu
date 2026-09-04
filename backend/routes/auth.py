import re
import time
import uuid
from enum import Enum
from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator
from supabase_auth.errors import AuthApiError, AuthError

from database import supabase

router = APIRouter(tags=["Authentication & Identity"])

# In-memory session store for Aadhaar & Temple Vendor demo sessions
sessions_db: Dict[str, Dict[str, Any]] = {}

# --------------------------------------------------------------------------
# Role Definitions & Validation
# --------------------------------------------------------------------------
class UserRole(str, Enum):
    TOURIST = "tourist"
    HOTEL = "hotel"
    TRAVEL_COMPANY = "travel_company"
    GOVERNMENT = "government"


# --------------------------------------------------------------------------
# Pydantic Request & Response Models
# --------------------------------------------------------------------------
class SignupRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Password (at least 6 characters)")
    full_name: str = Field(..., min_length=1, description="Full name of the user")
    role: UserRole = Field(UserRole.TOURIST, description="User role: tourist, hotel, travel_company, government")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean_email = v.strip().lower()
        email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        if not re.match(email_regex, clean_email):
            raise ValueError("Invalid email format.")
        return clean_email

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        clean_name = v.strip()
        if not clean_name:
            raise ValueError("Full name cannot be empty or whitespace.")
        return clean_name


class LoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str) -> str:
        clean_email = v.strip().lower()
        if not clean_email:
            raise ValueError("Email cannot be empty.")
        return clean_email


class ProfileResponse(BaseModel):
    id: str
    full_name: Optional[str] = None
    role: Optional[str] = None
    created_at: Optional[str] = None


class UserResponseModel(BaseModel):
    id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None


class SignupResponse(BaseModel):
    message: str
    user: UserResponseModel
    profile: Optional[ProfileResponse] = None
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"


class LoginResponse(BaseModel):
    message: str
    access_token: str
    token_type: str = "bearer"
    user: UserResponseModel
    profile: Optional[ProfileResponse] = None


class MeResponse(BaseModel):
    id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    created_at: Optional[str] = None
    profile: Optional[ProfileResponse] = None


from dependencies import AuthenticatedUser, get_current_user, require_role


# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------
@router.post("/auth/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(data: SignupRequest):
    """
    Registers a new user with Supabase Auth and records their profile in public.profiles.
    Supported roles: tourist, hotel, travel_company, government.
    """
    role_value = data.role.value if isinstance(data.role, Enum) else str(data.role)
    
    try:
        auth_response = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {
                "data": {
                    "full_name": data.full_name,
                    "role": role_value,
                }
            }
        })
    except AuthApiError as e:
        status_code = e.status if (e.status and 400 <= e.status < 500) else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=f"Signup failed: {e.message}")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during signup: {str(e)}"
        )

    user = auth_response.user
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User registration failed. No user was created."
        )

    # Verify and ensure record in public.profiles table
    profile_data = None
    try:
        prof_res = supabase.table("profiles").select("*").eq("id", user.id).execute()
        if prof_res.data and len(prof_res.data) > 0:
            profile_data = prof_res.data[0]
        else:
            # Fallback upsert if trigger has not executed
            insert_res = supabase.table("profiles").upsert({
                "id": user.id,
                "full_name": data.full_name,
                "role": role_value
            }).execute()
            if insert_res.data and len(insert_res.data) > 0:
                profile_data = insert_res.data[0]
    except Exception:
        # Fallback profile presentation if database read failed temporarily
        profile_data = {
            "id": user.id,
            "full_name": data.full_name,
            "role": role_value,
            "created_at": None
        }

    session = auth_response.session
    access_token = session.access_token if session else None

    msg = "User registered successfully."
    if not access_token:
        msg += " If email confirmation is enabled, please verify your email before logging in."

    full_name_val = profile_data.get("full_name") if profile_data else data.full_name
    role_val = profile_data.get("role") if profile_data else role_value
    created_at_val = profile_data.get("created_at") if profile_data else None

    return SignupResponse(
        message=msg,
        user=UserResponseModel(
            id=user.id,
            email=user.email,
            full_name=full_name_val,
            role=role_val
        ),
        profile=ProfileResponse(
            id=user.id,
            full_name=full_name_val,
            role=role_val,
            created_at=created_at_val
        ),
        access_token=access_token,
        token_type="bearer" if access_token else None
    )


@router.post("/auth/login", response_model=LoginResponse)
def login(data: LoginRequest):
    """
    Authenticates a user via Supabase Auth and returns an access token along with their profile.
    """
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
    except AuthApiError as e:
        error_msg = e.message or ""
        if "email not confirmed" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not confirmed. Please check your inbox or confirm your email in the Supabase Dashboard before logging in."
            )
        elif "invalid login credentials" in error_msg.lower() or "invalid credentials" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )
        status_code = e.status if (e.status and 400 <= e.status < 500) else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=f"Login failed: {error_msg}")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during login: {str(e)}"
        )

    user = auth_response.user
    session = auth_response.session
    if not user or not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed. No active session returned."
        )

    # Fetch profile record from public.profiles
    profile_data = None
    try:
        prof_res = supabase.table("profiles").select("*").eq("id", user.id).execute()
        if prof_res.data and len(prof_res.data) > 0:
            profile_data = prof_res.data[0]
    except Exception:
        pass

    user_meta = user.user_metadata or {}
    full_name = (profile_data.get("full_name") if profile_data else None) or user_meta.get("full_name")
    role = (profile_data.get("role") if profile_data else None) or user_meta.get("role", "tourist")

    # If profile record was missing, synchronize it
    if not profile_data:
        try:
            insert_res = supabase.table("profiles").upsert({
                "id": user.id,
                "full_name": full_name,
                "role": role
            }).execute()
            if insert_res.data and len(insert_res.data) > 0:
                profile_data = insert_res.data[0]
        except Exception:
            profile_data = {
                "id": user.id,
                "full_name": full_name,
                "role": role,
                "created_at": None
            }

    return LoginResponse(
        message="Login successful.",
        access_token=session.access_token,
        token_type="bearer",
        user=UserResponseModel(
            id=user.id,
            email=user.email,
            full_name=full_name,
            role=role
        ),
        profile=ProfileResponse(
            id=user.id,
            full_name=full_name,
            role=role,
            created_at=profile_data.get("created_at") if profile_data else None
        )
    )


@router.get("/auth/me", response_model=MeResponse)
def get_current_user_profile(current_user: AuthenticatedUser = Depends(get_current_user)):
    """
    Returns the authenticated user's details and profile.
    Requires Bearer token in the Authorization header.
    Validates token, extracts user ID, and loads verified role from public.profiles.
    """
    profile_obj = ProfileResponse(
        id=current_user.id,
        full_name=current_user.full_name,
        role=current_user.role,
        created_at=current_user.created_at
    )

    return MeResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        created_at=current_user.created_at,
        profile=profile_obj
    )


# --------------------------------------------------------------------------
# Role-Protected Verification Endpoints (for Swagger UI testing)
# --------------------------------------------------------------------------
@router.get("/auth/roles/government-only")
def government_only_endpoint(
    current_user: AuthenticatedUser = Depends(require_role("government"))
):
    """
    Role-Protected Endpoint: Only accessible by users with role 'government'.
    Returns 401 if unauthenticated, 403 if authenticated user is not government.
    """
    return {
        "message": "Authorized: Access granted to Government Administration Portal.",
        "user_id": current_user.id,
        "email": current_user.email,
        "role": current_user.role
    }


@router.get("/auth/roles/hotel-only")
def hotel_only_endpoint(
    current_user: AuthenticatedUser = Depends(require_role("hotel"))
):
    """
    Role-Protected Endpoint: Only accessible by users with role 'hotel'.
    Returns 401 if unauthenticated, 403 if authenticated user is not hotel.
    """
    return {
        "message": "Authorized: Access granted to Hotel Partner Portal.",
        "user_id": current_user.id,
        "email": current_user.email,
        "role": current_user.role
    }


@router.get("/auth/roles/travel-company-only")
def travel_company_only_endpoint(
    current_user: AuthenticatedUser = Depends(require_role("travel_company"))
):
    """
    Role-Protected Endpoint: Only accessible by users with role 'travel_company'.
    Returns 401 if unauthenticated, 403 if authenticated user is not travel_company.
    """
    return {
        "message": "Authorized: Access granted to Travel Company Operations Portal.",
        "user_id": current_user.id,
        "email": current_user.email,
        "role": current_user.role
    }


@router.get("/auth/roles/tourist-only")
def tourist_only_endpoint(
    current_user: AuthenticatedUser = Depends(require_role("tourist"))
):
    """
    Role-Protected Endpoint: Only accessible by users with role 'tourist'.
    Returns 401 if unauthenticated, 403 if authenticated user is not tourist.
    """
    return {
        "message": "Authorized: Access granted to Pilgrim & Tourist Services.",
        "user_id": current_user.id,
        "role": current_user.role
    }


# ==========================================================================
# 2. Aadhaar Identity Verification Endpoints (origin/main)
# ==========================================================================
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


@router.post("/auth/aadhaar/send-otp")
@router.post("/aadhaar/send-otp")
def send_aadhaar_otp(data: AadhaarOtpRequest):
    """
    Simulates sending an OTP to the mobile number linked with the 12-digit Aadhaar.
    """
    cleaned = data.aadhaar_number.replace(" ", "").replace("-", "")
    if not validate_aadhaar_format(cleaned):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Aadhaar format. Must be a 12-digit numeric identifier."
        )
    
    last_four = cleaned[-4:]
    txn_id = f"TXN_{uuid.uuid4().hex[:8].upper()}"
    
    return {
        "status": "success",
        "message": f"Simulated 6-digit OTP sent to mobile linked with Aadhaar ending in XXXX-XXXX-{last_four}.",
        "txn_id": txn_id,
        "hint_otp": "123456"
    }


@router.post("/auth/aadhaar/verify-otp")
@router.post("/aadhaar/verify-otp")
def verify_aadhaar_and_login(data: AadhaarVerifyRequest):
    """
    Verifies 6-digit Aadhaar OTP and issues a Digital Yatri Suraksha Card profile.
    """
    cleaned_aadhaar = data.aadhaar_number.replace(" ", "").replace("-", "")
    if not validate_aadhaar_format(cleaned_aadhaar):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Aadhaar format."
        )
    
    if len(data.otp.strip()) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP must be a 6-digit code."
        )
    
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


# ==========================================================================
# 3. Local Temple Vendor Portal Endpoints (origin/main)
# ==========================================================================
@router.post("/auth/vendor/login")
@router.post("/vendor/login")
def vendor_login(data: VendorLoginRequest):
    """
    Authenticates a local temple vendor and issues a vendor partner session.
    """
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


@router.get("/auth/session/me")
@router.get("/me")
def get_session_user(token: Optional[str] = None):
    """
    Session & Aadhaar identity check endpoint for in-memory demo sessions.
    """
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

