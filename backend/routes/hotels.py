import uuid
from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator
from postgrest.exceptions import APIError

from database import supabase, supabase_admin
from dependencies import AuthenticatedUser, get_current_user, require_role

router = APIRouter(tags=["hotels"])

# ============================================================================
# Pydantic Request & Response Models
# ============================================================================
class RoomCreateRequest(BaseModel):
    room_type: str = Field(..., min_length=1, description="Type of room, e.g., Deluxe, Standard, Dormitory")
    total_rooms: int = Field(..., ge=1, description="Total room inventory")
    available_rooms: Optional[int] = Field(None, ge=0, description="Available rooms (defaults to total_rooms)")
    price_per_night: float = Field(..., ge=0.0, description="Price per night in INR")


class RoomResponse(BaseModel):
    id: str
    hotel_id: str
    room_type: str
    total_rooms: int
    available_rooms: int
    price_per_night: float
    created_at: Optional[str] = None


class HotelCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Name of the hotel or lodge")
    description: Optional[str] = Field(None, description="Detailed description and amenities")
    address: str = Field(..., min_length=1, description="Physical location address")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="GPS latitude (-90 to 90)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="GPS longitude (-180 to 180)")
    contact: str = Field(..., min_length=5, description="Contact phone or email")
    rooms: Optional[List[RoomCreateRequest]] = Field(None, description="Initial room types to configure")

    @field_validator("name", "address", "contact")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Field cannot be empty or blank spaces.")
        return clean


class HotelUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    address: Optional[str] = Field(None, min_length=1)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    contact: Optional[str] = Field(None, min_length=5)


class HotelResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    description: Optional[str] = None
    address: str
    latitude: float
    longitude: float
    contact: str
    verified: bool
    created_at: Optional[str] = None
    rooms: Optional[List[RoomResponse]] = None


class BookingCreateRequest(BaseModel):
    room_id: str = Field(..., description="ID of the room to book")
    check_in: date = Field(..., description="Check-in date (YYYY-MM-DD)")
    check_out: date = Field(..., description="Check-out date (YYYY-MM-DD)")
    guests: int = Field(..., ge=1, description="Number of guests (minimum 1)")

    @field_validator("check_out")
    @classmethod
    def validate_dates(cls, v: date, values) -> date:
        check_in = values.data.get("check_in")
        if check_in:
            if v <= check_in:
                raise ValueError("Check-out date must be after check-in date.")
            if check_in < date.today():
                raise ValueError("Check-in date cannot be in the past.")
        return v


class BookingResponse(BaseModel):
    id: str
    hotel_id: str
    room_id: str
    tourist_id: str
    check_in: str
    check_out: str
    guests: int
    status: str
    created_at: Optional[str] = None
    hotel_name: Optional[str] = None
    room_type: Optional[str] = None
    total_price: Optional[float] = None


class HotelAvailabilityResponse(BaseModel):
    hotel_id: str
    hotel_name: str
    total_rooms: int
    available_rooms: int
    occupancy_percentage: float
    has_vacancy: bool
    rooms: List[RoomResponse]


class GovernmentDemandReport(BaseModel):
    total_hotels: int
    verified_hotels: int
    total_capacity_rooms: int
    total_available_rooms: int
    total_booked_rooms: int
    overall_occupancy_percentage: float
    hotels: List[HotelResponse]


def validate_uuid(val: str, entity_name: str = "Hotel") -> None:
    """Helper to validate UUID format and raise 404 instead of letting DB throw 500 syntax error."""
    try:
        uuid.UUID(str(val))
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{entity_name} with ID '{val}' not found."
        )


@router.get("/hotels", response_model=List[HotelResponse])
def list_hotels(
    search: Optional[str] = Query(None, description="Search by hotel name or location"),
    verified_only: bool = Query(False, description="Filter only verified hotels"),
    min_price: Optional[float] = Query(None, ge=0.0, description="Minimum room price"),
    max_price: Optional[float] = Query(None, ge=0.0, description="Maximum room price")
):
    """
    Public endpoint: Tourists and pilgrims can browse and search hotels with live room details from Supabase.
    """
    try:
        query = supabase_admin.table("hotels").select("*")
        if verified_only:
            query = query.eq("verified", True)
        res = query.execute()
        hotels = res.data or []
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error querying hotels: {e.message}"
        )

    if search:
        s = search.lower()
        hotels = [h for h in hotels if s in h.get("name", "").lower() or s in h.get("address", "").lower()]

    results = []
    for h in hotels:
        try:
            r_res = supabase_admin.table("hotel_rooms").select("*").eq("hotel_id", h["id"]).execute()
            rooms = r_res.data or []
        except Exception:
            rooms = []

        # Price filtering
        if min_price is not None:
            rooms = [r for r in rooms if r.get("price_per_night", 0) >= min_price]
        if max_price is not None:
            rooms = [r for r in rooms if r.get("price_per_night", 0) <= max_price]

        if (min_price is not None or max_price is not None) and not rooms:
            continue

        h_copy = dict(h)
        h_copy["rooms"] = [RoomResponse(**r) for r in rooms]
        results.append(HotelResponse(**h_copy))

    return results


@router.get("/hotels/{hotel_id}", response_model=HotelResponse)
def get_hotel(hotel_id: str):
    """
    Public endpoint: Get detailed hotel profile including all room categories and real-time inventory from Supabase.
    """
    validate_uuid(hotel_id, "Hotel")
    try:
        res = supabase_admin.table("hotels").select("*").eq("id", hotel_id).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Hotel with ID '{hotel_id}' not found."
            )
        hotel = res.data[0]
    except HTTPException:
        raise
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error fetching hotel: {e.message}"
        )

    try:
        r_res = supabase_admin.table("hotel_rooms").select("*").eq("hotel_id", hotel_id).execute()
        rooms = r_res.data or []
    except Exception:
        rooms = []

    h_copy = dict(hotel)
    h_copy["rooms"] = [RoomResponse(**r) for r in rooms]
    return HotelResponse(**h_copy)


@router.post("/hotels", response_model=HotelResponse, status_code=status.HTTP_201_CREATED)
def create_hotel(
    data: HotelCreateRequest,
    current_user: AuthenticatedUser = Depends(require_role("hotel"))
):
    """
    Hotel Owner Endpoint: Register a new hotel directly in Supabase.
    - Protected: Only users with role 'hotel' can register hotels.
    - Security: owner_id is strictly derived from the authenticated user token (NEVER trusted from body).
    """
    hotel_id = str(uuid.uuid4())
    now_iso = datetime.utcnow().isoformat() + "Z"

    hotel_record = {
        "id": hotel_id,
        "owner_id": current_user.id,  # Authenticated owner ID derived from token
        "name": data.name,
        "description": data.description,
        "address": data.address,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "contact": data.contact,
        "verified": False,
        "created_at": now_iso
    }

    try:
        res = supabase_admin.table("hotels").insert(hotel_record).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to insert hotel record into database."
            )
        created_hotel = res.data[0]
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error inserting hotel (check RLS policies): {e.message}"
        )

    # Insert rooms if provided
    created_rooms = []
    if data.rooms:
        for r_req in data.rooms:
            room_id = str(uuid.uuid4())
            avail = r_req.available_rooms if r_req.available_rooms is not None else r_req.total_rooms
            avail = min(avail, r_req.total_rooms)

            room_record = {
                "id": room_id,
                "hotel_id": hotel_id,
                "room_type": r_req.room_type,
                "total_rooms": r_req.total_rooms,
                "available_rooms": avail,
                "price_per_night": r_req.price_per_night,
                "created_at": now_iso
            }
            try:
                r_res = supabase_admin.table("hotel_rooms").insert(room_record).execute()
                if r_res.data and len(r_res.data) > 0:
                    created_rooms.append(RoomResponse(**r_res.data[0]))
            except APIError as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error inserting hotel room (check RLS policies): {e.message}"
                )

    h_copy = dict(created_hotel)
    h_copy["rooms"] = created_rooms
    return HotelResponse(**h_copy)


@router.put("/hotels/{hotel_id}", response_model=HotelResponse)
def update_hotel(
    hotel_id: str,
    data: HotelUpdateRequest,
    current_user: AuthenticatedUser = Depends(require_role("hotel"))
):
    """
    Hotel Owner Endpoint: Update existing hotel details in Supabase.
    - Protected: Only the hotel's registered owner can edit it.
    - Returns 403 if another hotel owner attempts to modify a hotel they do not own.
    """
    validate_uuid(hotel_id, "Hotel")
    try:
        res = supabase_admin.table("hotels").select("*").eq("id", hotel_id).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Hotel with ID '{hotel_id}' not found."
            )
        hotel = res.data[0]
    except HTTPException:
        raise
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error fetching hotel: {e.message}"
        )

    # Ownership check: strictly enforce that owner_id matches current_user.id
    if hotel["owner_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You do not own this hotel and cannot modify its details."
        )

    # Prepare update fields
    updates = {}
    if data.name is not None:
        updates["name"] = data.name
    if data.description is not None:
        updates["description"] = data.description
    if data.address is not None:
        updates["address"] = data.address
    if data.latitude is not None:
        updates["latitude"] = data.latitude
    if data.longitude is not None:
        updates["longitude"] = data.longitude
    if data.contact is not None:
        updates["contact"] = data.contact

    if not updates:
        r_res = supabase_admin.table("hotel_rooms").select("*").eq("hotel_id", hotel_id).execute()
        h_copy = dict(hotel)
        h_copy["rooms"] = [RoomResponse(**r) for r in (r_res.data or [])]
        return HotelResponse(**h_copy)

    try:
        up_res = supabase_admin.table("hotels").update(updates).eq("id", hotel_id).execute()
        updated_hotel = up_res.data[0] if up_res.data else hotel
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error updating hotel (check RLS policies): {e.message}"
        )

    r_res = supabase_admin.table("hotel_rooms").select("*").eq("hotel_id", hotel_id).execute()
    h_copy = dict(updated_hotel)
    h_copy["rooms"] = [RoomResponse(**r) for r in (r_res.data or [])]
    return HotelResponse(**h_copy)


@router.get("/hotels/{hotel_id}/availability", response_model=HotelAvailabilityResponse)
def get_hotel_availability(hotel_id: str):
    """
    Public / Pilgrim Endpoint: Live room availability check for a specific hotel from Supabase.
    Displays room counts, pricing, and overall occupancy rate.
    """
    validate_uuid(hotel_id, "Hotel")
    try:
        res = supabase_admin.table("hotels").select("*").eq("id", hotel_id).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Hotel with ID '{hotel_id}' not found."
            )
        hotel = res.data[0]
    except HTTPException:
        raise
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error fetching hotel: {e.message}"
        )

    try:
        r_res = supabase_admin.table("hotel_rooms").select("*").eq("hotel_id", hotel_id).execute()
        rooms = r_res.data or []
    except Exception:
        rooms = []

    total_rooms = sum(r.get("total_rooms", 0) for r in rooms)
    available_rooms = sum(r.get("available_rooms", 0) for r in rooms)

    if total_rooms > 0:
        booked = total_rooms - available_rooms
        occupancy = round((booked / total_rooms) * 100.0, 1)
    else:
        occupancy = 0.0

    return HotelAvailabilityResponse(
        hotel_id=hotel_id,
        hotel_name=hotel["name"],
        total_rooms=total_rooms,
        available_rooms=available_rooms,
        occupancy_percentage=occupancy,
        has_vacancy=available_rooms > 0,
        rooms=[RoomResponse(**r) for r in rooms]
    )


@router.post("/hotels/{hotel_id}/book", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def book_hotel_room(
    hotel_id: str,
    data: BookingCreateRequest,
    current_user: AuthenticatedUser = Depends(require_role("tourist"))
):
    """
    Tourist Endpoint: Book a hotel room in Supabase.
    - Protected: Requires authenticated user with 'tourist' role.
    - Security: tourist_id is strictly derived from the authenticated token.
    - Prevents Overbooking: Validates that available_rooms > 0, decrements availability.
    - Validates check-in and check-out dates.
    """
    validate_uuid(hotel_id, "Hotel")
    validate_uuid(data.room_id, "Room")
    # 1. Verify hotel exists in Supabase
    try:
        h_res = supabase_admin.table("hotels").select("*").eq("id", hotel_id).execute()
        if not h_res.data or len(h_res.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Hotel with ID '{hotel_id}' not found."
            )
        hotel = h_res.data[0]
    except HTTPException:
        raise
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error checking hotel: {e.message}"
        )

    # 2. Verify room exists and belongs to this hotel
    try:
        r_res = supabase_admin.table("hotel_rooms").select("*").eq("id", data.room_id).execute()
        if not r_res.data or len(r_res.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Room with ID '{data.room_id}' not found."
            )
        room = r_res.data[0]
    except HTTPException:
        raise
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error checking room: {e.message}"
        )

    if room.get("hotel_id") != hotel_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Specified room does not belong to this hotel."
        )

    # 3. Prevent Overbooking: check available inventory
    available = room.get("available_rooms", 0)
    if available <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No rooms available for room type '{room['room_type']}'. Overbooking prevented."
        )

    # 4. Calculate total price
    nights = max(1, (data.check_out - data.check_in).days)
    total_price = nights * room.get("price_per_night", 0.0)

    # 5. Decrement available room count in database
    try:
        up_room = supabase_admin.table("hotel_rooms").update({
            "available_rooms": available - 1
        }).eq("id", data.room_id).execute()
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error updating room availability: {e.message}"
        )

    # 6. Create booking record in hotel_bookings table
    booking_id = str(uuid.uuid4())
    now_iso = datetime.utcnow().isoformat() + "Z"

    booking_record = {
        "id": booking_id,
        "hotel_id": hotel_id,
        "room_id": data.room_id,
        "tourist_id": current_user.id,  # Derived from authenticated token
        "check_in": data.check_in.isoformat(),
        "check_out": data.check_out.isoformat(),
        "guests": data.guests,
        "status": "confirmed",
        "created_at": now_iso
    }

    try:
        b_res = supabase_admin.table("hotel_bookings").insert(booking_record).execute()
        created_booking = b_res.data[0] if b_res.data else booking_record
    except APIError as e:
        # Rollback room inventory if booking insert fails
        supabase_admin.table("hotel_rooms").update({"available_rooms": available}).eq("id", data.room_id).execute()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error creating booking (check RLS policies): {e.message}"
        )

    return BookingResponse(
        id=created_booking["id"],
        hotel_id=hotel_id,
        room_id=data.room_id,
        tourist_id=current_user.id,
        check_in=str(data.check_in),
        check_out=str(data.check_out),
        guests=data.guests,
        status="confirmed",
        created_at=now_iso,
        hotel_name=hotel["name"],
        room_type=room["room_type"],
        total_price=total_price
    )


@router.get("/hotels/owner/bookings", response_model=List[BookingResponse])
def get_owner_bookings(
    current_user: AuthenticatedUser = Depends(require_role("hotel"))
):
    """
    Hotel Owner Endpoint: View all bookings across hotels owned by the authenticated hotel partner.
    - Security: Only returns bookings for hotels where owner_id == current_user.id.
    - Strictly prevents hotel owners from viewing competitor hotel bookings.
    """
    try:
        h_res = supabase_admin.table("hotels").select("id, name").eq("owner_id", current_user.id).execute()
        my_hotels = h_res.data or []
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error fetching owner hotels: {e.message}"
        )

    if not my_hotels:
        return []

    my_hotel_map = {h["id"]: h["name"] for h in my_hotels}
    my_hotel_ids = list(my_hotel_map.keys())

    try:
        b_res = supabase_admin.table("hotel_bookings").select("*").in_("hotel_id", my_hotel_ids).execute()
        bookings = b_res.data or []
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error fetching hotel bookings: {e.message}"
        )

    results = []
    for b in bookings:
        try:
            r_res = supabase_admin.table("hotel_rooms").select("room_type, price_per_night").eq("id", b.get("room_id")).execute()
            room = r_res.data[0] if (r_res.data and len(r_res.data) > 0) else None
        except Exception:
            room = None

        room_type = room["room_type"] if room else "Standard"

        price = 0.0
        try:
            d_in = date.fromisoformat(b["check_in"])
            d_out = date.fromisoformat(b["check_out"])
            nights = max(1, (d_out - d_in).days)
            if room:
                price = nights * room.get("price_per_night", 0.0)
        except Exception:
            pass

        results.append(BookingResponse(
            id=b["id"],
            hotel_id=b["hotel_id"],
            room_id=b["room_id"],
            tourist_id=b["tourist_id"],
            check_in=b["check_in"],
            check_out=b["check_out"],
            guests=b.get("guests", 1),
            status=b.get("status", "confirmed"),
            created_at=b.get("created_at"),
            hotel_name=my_hotel_map.get(b["hotel_id"], "Unknown Hotel"),
            room_type=room_type,
            total_price=price
        ))

    return results


@router.get("/hotels/government/occupancy-report", response_model=GovernmentDemandReport)
def get_government_occupancy_report(
    current_user: AuthenticatedUser = Depends(require_role("government"))
):
    """
    Government Endpoint: Demand and capacity monitoring across all pilgrimage hospitality providers from Supabase.
    - Protected: Restricted to users with role 'government'.
    - Returns city-wide hotel capacity, booked rooms, vacancies, and aggregate occupancy telemetry.
    """
    try:
        h_res = supabase_admin.table("hotels").select("*").execute()
        all_hotels = h_res.data or []
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error querying hotels: {e.message}"
        )

    all_hotel_responses = []
    total_capacity = 0
    total_available = 0

    for h in all_hotels:
        try:
            r_res = supabase_admin.table("hotel_rooms").select("*").eq("hotel_id", h["id"]).execute()
            rooms = r_res.data or []
        except Exception:
            rooms = []

        h_copy = dict(h)
        h_copy["rooms"] = [RoomResponse(**r) for r in rooms]
        all_hotel_responses.append(HotelResponse(**h_copy))

        total_capacity += sum(r.get("total_rooms", 0) for r in rooms)
        total_available += sum(r.get("available_rooms", 0) for r in rooms)

    total_booked = total_capacity - total_available
    if total_capacity > 0:
        overall_occ = round((total_booked / total_capacity) * 100.0, 1)
    else:
        overall_occ = 0.0

    return GovernmentDemandReport(
        total_hotels=len(all_hotels),
        verified_hotels=len([h for h in all_hotels if h.get("verified") is True]),
        total_capacity_rooms=total_capacity,
        total_available_rooms=total_available,
        total_booked_rooms=total_booked,
        overall_occupancy_percentage=overall_occ,
        hotels=all_hotel_responses
    )
