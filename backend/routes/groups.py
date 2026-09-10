import os
import json
import random
import string
from datetime import datetime, timezone
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from database import supabase_admin
from dependencies import AuthenticatedUser, get_current_user, require_tourist

router = APIRouter(tags=["Yatra Groups"])

DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "yatra_groups_store.json")

def _init_local_store():
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    if not os.path.exists(DATA_FILE):
        initial = {
            "groups": [],
            "members": [],
            "locations": [],
            "alerts": []
        }
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(initial, f, indent=2)

def _load_local_store():
    _init_local_store()
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"groups": [], "members": [], "locations": [], "alerts": []}

def _save_local_store(data):
    _init_local_store()
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Warning: Failed to save local groups store: {e}")

def _generate_join_code(length: int = 6) -> str:
    chars = string.ascii_uppercase + string.digits
    chars = chars.replace("O", "").replace("0", "").replace("I", "").replace("1", "")
    return "".join(random.choices(chars, k=length))

# ----------------------------------------------------------------------------
# Pydantic Request & Response Schemas
# ----------------------------------------------------------------------------

class CreateGroupPayload(BaseModel):
    group_name: str = Field(..., min_length=2, max_length=100)
    site_id: Optional[str] = None
    site_name: str = Field(..., min_length=2)
    yatra_date: str

class JoinGroupPayload(BaseModel):
    join_code: str = Field(..., min_length=4, max_length=12)

class LocationUpdatePayload(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    accuracy: Optional[float] = None

class CreateAlertPayload(BaseModel):
    alert_type: str = "EMERGENCY"
    message: Optional[str] = "Devotee requires immediate assistance."

class GroupMemberInfo(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: Optional[str] = None
    role: str
    joined_at: str
    last_seen_at: Optional[str] = None
    is_sharing_location: bool = False

class GroupAlertInfo(BaseModel):
    id: str
    group_id: str
    user_id: str
    user_name: str
    alert_type: str
    message: Optional[str] = None
    status: str
    created_at: str
    resolved_at: Optional[str] = None
    resolved_by: Optional[str] = None

class GroupDetailResponse(BaseModel):
    id: str
    group_name: str
    site_id: Optional[str] = None
    site_name: str
    yatra_date: str
    join_code: str
    created_by: str
    status: str
    created_at: str
    member_count: int
    user_role: str
    members: List[GroupMemberInfo] = []
    active_alert: Optional[GroupAlertInfo] = None

class MyGroupOverviewResponse(BaseModel):
    has_group: bool
    group: Optional[GroupDetailResponse] = None

class MemberLocationResponse(BaseModel):
    user_id: str
    user_name: str
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    is_sharing: bool
    updated_at: str
    is_live: bool
    time_ago_str: str

# ----------------------------------------------------------------------------
# Helper Functions with Supabase Priority & Consistent Fallback
# ----------------------------------------------------------------------------

def _now_iso():
    return datetime.now(timezone.utc).isoformat()

def _get_group_from_db(group_id: str):
    try:
        res = supabase_admin.table("yatra_groups").select("*").eq("id", group_id).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception:
        pass
    store = _load_local_store()
    return next((g for g in store["groups"] if g["id"] == group_id and g.get("status") != "ARCHIVED"), None)

def _get_group_by_code_from_db(code: str):
    clean_code = code.strip().upper()
    try:
        res = supabase_admin.table("yatra_groups").select("*").eq("join_code", clean_code).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception:
        pass
    store = _load_local_store()
    return next((g for g in store["groups"] if g["join_code"] == clean_code and g.get("status") != "ARCHIVED"), None)

def _get_user_membership(user_id: str):
    try:
        res = supabase_admin.table("yatra_group_members").select("*").eq("user_id", user_id).execute()
        if res.data and len(res.data) > 0:
            # Check if group is active
            for m in res.data:
                grp = _get_group_from_db(m["group_id"])
                if grp and grp.get("status") != "ARCHIVED":
                    return m
    except Exception:
        pass
    store = _load_local_store()
    for m in store["members"]:
        if m["user_id"] == user_id:
            grp = next((g for g in store["groups"] if g["id"] == m["group_id"] and g.get("status") != "ARCHIVED"), None)
            if grp:
                return m
    return None

def _get_group_members_list(group_id: str):
    members = []
    try:
        res = supabase_admin.table("yatra_group_members").select("*").eq("group_id", group_id).execute()
        if res.data:
            members = res.data
    except Exception:
        pass
    if not members:
        store = _load_local_store()
        members = [m for m in store["members"] if m["group_id"] == group_id]
    return members

def _get_active_group_alert(group_id: str):
    try:
        res = supabase_admin.table("yatra_group_alerts").select("*").eq("group_id", group_id).eq("status", "ACTIVE").order("created_at", desc=True).limit(1).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception:
        pass
    store = _load_local_store()
    alerts = [a for a in store["alerts"] if a["group_id"] == group_id and a.get("status") == "ACTIVE"]
    if alerts:
        alerts.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return alerts[0]
    return None

def _get_all_group_alerts(group_id: str):
    alerts = []
    try:
        res = supabase_admin.table("yatra_group_alerts").select("*").eq("group_id", group_id).order("created_at", desc=True).execute()
        if res.data:
            alerts = res.data
    except Exception:
        pass
    if not alerts:
        store = _load_local_store()
        alerts = [a for a in store["alerts"] if a["group_id"] == group_id]
        alerts.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return alerts

def _build_full_group_response(group_data: dict, current_user_id: str) -> GroupDetailResponse:
    group_id = group_data["id"]
    members_raw = _get_group_members_list(group_id)
    
    # Check locations for is_sharing flag
    locations = []
    try:
        l_res = supabase_admin.table("yatra_group_locations").select("*").eq("group_id", group_id).execute()
        if l_res.data:
            locations = l_res.data
    except Exception:
        pass
    if not locations:
        store = _load_local_store()
        locations = [l for l in store["locations"] if l["group_id"] == group_id]

    sharing_user_ids = {l["user_id"] for l in locations if l.get("is_sharing", True)}

    members_dto = []
    user_role = "MEMBER"
    for m in members_raw:
        if m["user_id"] == current_user_id:
            user_role = m.get("role", "MEMBER")
        members_dto.append(GroupMemberInfo(
            id=m["id"],
            user_id=m["user_id"],
            user_name=m.get("user_name") or m.get("user_email") or "Pilgrim Member",
            user_email=m.get("user_email"),
            role=m.get("role", "MEMBER"),
            joined_at=m.get("joined_at", _now_iso()),
            last_seen_at=m.get("last_seen_at"),
            is_sharing_location=m["user_id"] in sharing_user_ids
        ))

    # Sort members: ADMIN first, then alphabetical
    members_dto.sort(key=lambda x: (0 if x.role == "ADMIN" else 1, x.user_name))

    active_alert_raw = _get_active_group_alert(group_id)
    active_alert_dto = None
    if active_alert_raw:
        active_alert_dto = GroupAlertInfo(
            id=active_alert_raw["id"],
            group_id=active_alert_raw["group_id"],
            user_id=active_alert_raw["user_id"],
            user_name=active_alert_raw.get("user_name", "Devotee"),
            alert_type=active_alert_raw.get("alert_type", "EMERGENCY"),
            message=active_alert_raw.get("message"),
            status=active_alert_raw.get("status", "ACTIVE"),
            created_at=active_alert_raw.get("created_at", _now_iso()),
            resolved_at=active_alert_raw.get("resolved_at"),
            resolved_by=active_alert_raw.get("resolved_by")
        )

    return GroupDetailResponse(
        id=group_data["id"],
        group_name=group_data["group_name"],
        site_id=group_data.get("site_id"),
        site_name=group_data.get("site_name", "Sacred Pilgrimage"),
        yatra_date=str(group_data.get("yatra_date")),
        join_code=group_data["join_code"],
        created_by=group_data["created_by"],
        status=group_data.get("status", "ACTIVE"),
        created_at=group_data.get("created_at", _now_iso()),
        member_count=len(members_dto),
        user_role=user_role,
        members=members_dto,
        active_alert=active_alert_dto
    )

# ----------------------------------------------------------------------------
# 1. CREATE YATRA GROUP
# ----------------------------------------------------------------------------
@router.post("/yatra-groups", response_model=GroupDetailResponse)
def create_yatra_group(
    payload: CreateGroupPayload,
    current_user: AuthenticatedUser = Depends(require_tourist)
):
    existing = _get_user_membership(current_user.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already in an active Yatra group. Leave your current group to create a new one."
        )

    # Unique join code loop
    join_code = _generate_join_code()
    for _ in range(10):
        if not _get_group_by_code_from_db(join_code):
            break
        join_code = _generate_join_code()

    group_id = str(uuid.uuid4())
    now = _now_iso()
    user_display = current_user.full_name or (current_user.email.split("@")[0] if current_user.email else "Group Admin")

    group_record = {
        "id": group_id,
        "group_name": payload.group_name.strip(),
        "site_id": payload.site_id,
        "site_name": payload.site_name.strip(),
        "yatra_date": payload.yatra_date,
        "join_code": join_code,
        "created_by": current_user.id,
        "status": "ACTIVE",
        "created_at": now,
        "updated_at": now
    }

    member_id = str(uuid.uuid4())
    member_record = {
        "id": member_id,
        "group_id": group_id,
        "user_id": current_user.id,
        "user_name": user_display,
        "user_email": current_user.email,
        "role": "ADMIN",
        "joined_at": now,
        "last_seen_at": now
    }

    # 1. Write to Supabase
    try:
        supabase_admin.table("yatra_groups").insert(group_record).execute()
        supabase_admin.table("yatra_group_members").insert(member_record).execute()
    except Exception as e:
        print(f"[Supabase sync notice] yatra_groups insert: {e}")

    # 2. Write to local persistent store for resilience
    store = _load_local_store()
    store["groups"].append(group_record)
    store["members"].append(member_record)
    _save_local_store(store)

    return _build_full_group_response(group_record, current_user.id)

# ----------------------------------------------------------------------------
# 2. GET CURRENT USER'S GROUP OVERVIEW
# ----------------------------------------------------------------------------
@router.get("/yatra-groups/my", response_model=MyGroupOverviewResponse)
def get_my_yatra_group(
    current_user: AuthenticatedUser = Depends(require_tourist)
):
    membership = _get_user_membership(current_user.id)
    if not membership:
        return MyGroupOverviewResponse(has_group=False, group=None)

    group_data = _get_group_from_db(membership["group_id"])
    if not group_data or group_data.get("status") == "ARCHIVED":
        return MyGroupOverviewResponse(has_group=False, group=None)

    # Update last seen timestamp
    now = _now_iso()
    try:
        supabase_admin.table("yatra_group_members").update({"last_seen_at": now}).eq("id", membership["id"]).execute()
    except Exception:
        pass
    store = _load_local_store()
    for m in store["members"]:
        if m["id"] == membership["id"]:
            m["last_seen_at"] = now
    _save_local_store(store)

    group_dto = _build_full_group_response(group_data, current_user.id)
    return MyGroupOverviewResponse(has_group=True, group=group_dto)

# ----------------------------------------------------------------------------
# 3. GET GROUP BY ID
# ----------------------------------------------------------------------------
@router.get("/yatra-groups/{group_id}", response_model=GroupDetailResponse)
def get_yatra_group_by_id(
    group_id: str,
    current_user: AuthenticatedUser = Depends(require_tourist)
):
    group_data = _get_group_from_db(group_id)
    if not group_data or group_data.get("status") == "ARCHIVED":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Yatra group not found.")

    members = _get_group_members_list(group_id)
    if not any(m["user_id"] == current_user.id for m in members):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You are not a member of this Yatra group."
        )

    return _build_full_group_response(group_data, current_user.id)

# ----------------------------------------------------------------------------
# 4. JOIN GROUP VIA CODE
# ----------------------------------------------------------------------------
@router.post("/yatra-groups/join", response_model=GroupDetailResponse)
def join_yatra_group(
    payload: JoinGroupPayload,
    current_user: AuthenticatedUser = Depends(require_tourist)
):
    target_group = _get_group_by_code_from_db(payload.join_code)
    if not target_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group code is invalid or expired."
        )

    group_id = target_group["id"]
    existing_members = _get_group_members_list(group_id)
    if any(m["user_id"] == current_user.id for m in existing_members):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this group."
        )

    # Check if user already has another group
    other_group_m = _get_user_membership(current_user.id)
    if other_group_m:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already in another active group. Please leave that group before joining a new one."
        )

    user_display = current_user.full_name or (current_user.email.split("@")[0] if current_user.email else "Pilgrim Member")
    now = _now_iso()
    new_member = {
        "id": str(uuid.uuid4()),
        "group_id": group_id,
        "user_id": current_user.id,
        "user_name": user_display,
        "user_email": current_user.email,
        "role": "MEMBER",
        "joined_at": now,
        "last_seen_at": now
    }

    # 1. Supabase
    try:
        supabase_admin.table("yatra_group_members").insert(new_member).execute()
    except Exception as e:
        print(f"[Supabase sync notice] yatra_group_members insert: {e}")

    # 2. Local store
    store = _load_local_store()
    store["members"].append(new_member)
    _save_local_store(store)

    return _build_full_group_response(target_group, current_user.id)

# ----------------------------------------------------------------------------
# 5. LEAVE GROUP (Safe Admin Handover)
# ----------------------------------------------------------------------------
@router.post("/yatra-groups/{group_id}/leave")
def leave_yatra_group(
    group_id: str,
    current_user: AuthenticatedUser = Depends(require_tourist)
):
    group_data = _get_group_from_db(group_id)
    if not group_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")

    members = _get_group_members_list(group_id)
    my_membership = next((m for m in members if m["user_id"] == current_user.id), None)
    if not my_membership:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are not a member of this group.")

    is_admin = my_membership.get("role") == "ADMIN"
    remaining_members = [m for m in members if m["user_id"] != current_user.id]

    if is_admin and remaining_members:
        # Automatically promote the next oldest member to ADMIN
        remaining_members.sort(key=lambda m: m.get("joined_at", ""))
        new_admin = remaining_members[0]
        try:
            supabase_admin.table("yatra_group_members").update({"role": "ADMIN"}).eq("id", new_admin["id"]).execute()
        except Exception:
            pass
        store = _load_local_store()
        for m in store["members"]:
            if m["id"] == new_admin["id"]:
                m["role"] = "ADMIN"
        _save_local_store(store)
    elif is_admin and not remaining_members:
        # Group is empty, archive it
        try:
            supabase_admin.table("yatra_groups").update({"status": "ARCHIVED"}).eq("id", group_id).execute()
        except Exception:
            pass
        store = _load_local_store()
        for g in store["groups"]:
            if g["id"] == group_id:
                g["status"] = "ARCHIVED"
        _save_local_store(store)

    # Delete membership and location
    try:
        supabase_admin.table("yatra_group_members").delete().eq("id", my_membership["id"]).execute()
        supabase_admin.table("yatra_group_locations").delete().eq("group_id", group_id).eq("user_id", current_user.id).execute()
    except Exception:
        pass

    store = _load_local_store()
    store["members"] = [m for m in store["members"] if m["id"] != my_membership["id"]]
    store["locations"] = [l for l in store["locations"] if not (l["group_id"] == group_id and l["user_id"] == current_user.id)]
    _save_local_store(store)

    return {"message": "You have successfully left the Yatra group."}

# ----------------------------------------------------------------------------
# 6. GET GROUP MEMBERS
# ----------------------------------------------------------------------------
@router.get("/yatra-groups/{group_id}/members", response_model=List[GroupMemberInfo])
def get_group_members(
    group_id: str,
    current_user: AuthenticatedUser = Depends(require_tourist)
):
    members = _get_group_members_list(group_id)
    if not any(m["user_id"] == current_user.id for m in members):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this group's members.")

    locations = []
    try:
        l_res = supabase_admin.table("yatra_group_locations").select("*").eq("group_id", group_id).execute()
        if l_res.data:
            locations = l_res.data
    except Exception:
        pass
    if not locations:
        store = _load_local_store()
        locations = [l for l in store["locations"] if l["group_id"] == group_id]
    sharing_ids = {l["user_id"] for l in locations if l.get("is_sharing", True)}

    result = []
    for m in members:
        result.append(GroupMemberInfo(
            id=m["id"],
            user_id=m["user_id"],
            user_name=m.get("user_name") or m.get("user_email") or "Pilgrim Member",
            user_email=m.get("user_email"),
            role=m.get("role", "MEMBER"),
            joined_at=m.get("joined_at", _now_iso()),
            last_seen_at=m.get("last_seen_at"),
            is_sharing_location=m["user_id"] in sharing_ids
        ))
    result.sort(key=lambda x: (0 if x.role == "ADMIN" else 1, x.user_name))
    return result

# ----------------------------------------------------------------------------
# 7. ADMIN REMOVE MEMBER (403 for non-admins)
# ----------------------------------------------------------------------------
@router.delete("/yatra-groups/{group_id}/members/{member_id}")
def remove_group_member(
    group_id: str,
    member_id: str,
    current_user: AuthenticatedUser = Depends(require_tourist)
):
    members = _get_group_members_list(group_id)
    caller_m = next((m for m in members if m["user_id"] == current_user.id), None)
    if not caller_m or caller_m.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins are authorized to remove members."
        )

    target_m = next((m for m in members if m["id"] == member_id or m["user_id"] == member_id), None)
    if not target_m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")

    if target_m["user_id"] == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admins cannot remove themselves. Use Leave Group instead.")

    # Remove from Supabase
    try:
        supabase_admin.table("yatra_group_members").delete().eq("id", target_m["id"]).execute()
        supabase_admin.table("yatra_group_locations").delete().eq("group_id", group_id).eq("user_id", target_m["user_id"]).execute()
    except Exception:
        pass

    # Remove from local store
    store = _load_local_store()
    store["members"] = [m for m in store["members"] if m["id"] != target_m["id"]]
    store["locations"] = [l for l in store["locations"] if not (l["group_id"] == group_id and l["user_id"] == target_m["user_id"])]
    _save_local_store(store)

    return {"message": f"Member {target_m.get('user_name', '')} removed successfully."}

# ----------------------------------------------------------------------------
# 8. LOCATION UPDATE (Strict Opt-in, Never Fabricated)
# ----------------------------------------------------------------------------
@router.post("/yatra-groups/{group_id}/location")
def update_group_location(
    group_id: str,
    payload: LocationUpdatePayload,
    current_user: AuthenticatedUser = Depends(require_tourist)
):
    members = _get_group_members_list(group_id)
    caller_m = next((m for m in members if m["user_id"] == current_user.id), None)
    if not caller_m:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this group.")

    now = _now_iso()
    user_display = caller_m.get("user_name") or current_user.full_name or "Devotee"

    loc_record = {
        "id": str(uuid.uuid4()),
        "group_id": group_id,
        "user_id": current_user.id,
        "user_name": user_display,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "accuracy": payload.accuracy,
        "is_sharing": True,
        "updated_at": now
    }

    # 1. Supabase upsert
    try:
        supabase_admin.table("yatra_group_locations").upsert(loc_record, on_conflict="group_id,user_id").execute()
    except Exception as e:
        print(f"[Supabase sync notice] location upsert: {e}")

    # 2. Local store upsert
    store = _load_local_store()
    store["locations"] = [l for l in store["locations"] if not (l["group_id"] == group_id and l["user_id"] == current_user.id)]
    store["locations"].append(loc_record)
    _save_local_store(store)

    return {"message": "Location updated successfully", "is_sharing": True, "updated_at": now}

# ----------------------------------------------------------------------------
# 9. DISABLE LOCATION SHARING
# ----------------------------------------------------------------------------
@router.delete("/yatra-groups/{group_id}/location-sharing")
def disable_location_sharing(
    group_id: str,
    current_user: AuthenticatedUser = Depends(require_tourist)
):
    try:
        supabase_admin.table("yatra_group_locations").update({
            "is_sharing": False,
            "updated_at": _now_iso()
        }).eq("group_id", group_id).eq("user_id", current_user.id).execute()
    except Exception:
        pass

    store = _load_local_store()
    for l in store["locations"]:
        if l["group_id"] == group_id and l["user_id"] == current_user.id:
            l["is_sharing"] = False
            l["updated_at"] = _now_iso()
    _save_local_store(store)

    return {"message": "Location sharing is off."}

# ----------------------------------------------------------------------------
# 10. GET GROUP LOCATIONS (Only Consented Members)
# ----------------------------------------------------------------------------
@router.get("/yatra-groups/{group_id}/locations", response_model=List[MemberLocationResponse])
def get_group_locations(
    group_id: str,
    current_user: AuthenticatedUser = Depends(require_tourist)
):
    members = _get_group_members_list(group_id)
    if not any(m["user_id"] == current_user.id for m in members):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view group locations.")

    locations = []
    try:
        res = supabase_admin.table("yatra_group_locations").select("*").eq("group_id", group_id).eq("is_sharing", True).execute()
        if res.data:
            locations = res.data
    except Exception:
        pass
    if not locations:
        store = _load_local_store()
        locations = [l for l in store["locations"] if l["group_id"] == group_id and l.get("is_sharing", True)]

    # Compute freshness labels
    now_dt = datetime.now(timezone.utc)
    result = []
    for loc in locations:
        up_str = loc.get("updated_at", "")
        mins_ago = 0
        try:
            up_dt = datetime.fromisoformat(up_str)
            if up_dt.tzinfo is None:
                up_dt = up_dt.replace(tzinfo=timezone.utc)
            mins_ago = int((now_dt - up_dt).total_seconds() / 60)
        except Exception:
            pass

        is_live = mins_ago <= 10
        time_str = "Location updated just now" if mins_ago < 1 else f"Location updated {mins_ago} minute{'s' if mins_ago > 1 else ''} ago"
        if not is_live:
            time_str = f"Last known location ({mins_ago}m ago)"

        result.append(MemberLocationResponse(
            user_id=loc["user_id"],
            user_name=loc.get("user_name", "Devotee"),
            latitude=loc["latitude"],
            longitude=loc["longitude"],
            accuracy=loc.get("accuracy"),
            is_sharing=loc.get("is_sharing", True),
            updated_at=up_str,
            is_live=is_live,
            time_ago_str=time_str
        ))

    return result

# ----------------------------------------------------------------------------
# 11. TRIGGER GROUP DISTRESS ALERT
# ----------------------------------------------------------------------------
@router.post("/yatra-groups/{group_id}/alerts", response_model=GroupAlertInfo)
def trigger_group_distress_alert(
    group_id: str,
    payload: CreateAlertPayload,
    current_user: AuthenticatedUser = Depends(require_tourist)
):
    members = _get_group_members_list(group_id)
    caller_m = next((m for m in members if m["user_id"] == current_user.id), None)
    if not caller_m:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this group.")

    user_display = caller_m.get("user_name") or current_user.full_name or "Devotee"
    now = _now_iso()
    alert_record = {
        "id": str(uuid.uuid4()),
        "group_id": group_id,
        "user_id": current_user.id,
        "user_name": user_display,
        "alert_type": payload.alert_type,
        "message": payload.message,
        "status": "ACTIVE",
        "created_at": now,
        "resolved_at": None,
        "resolved_by": None
    }

    # 1. Supabase
    try:
        supabase_admin.table("yatra_group_alerts").insert(alert_record).execute()
    except Exception as e:
        print(f"[Supabase sync notice] alert insert: {e}")

    # 2. Local store
    store = _load_local_store()
    store["alerts"].append(alert_record)
    _save_local_store(store)

    return GroupAlertInfo(**alert_record)

# ----------------------------------------------------------------------------
# 12. GET GROUP ALERTS
# ----------------------------------------------------------------------------
@router.get("/yatra-groups/{group_id}/alerts", response_model=List[GroupAlertInfo])
def get_group_alerts(
    group_id: str,
    current_user: AuthenticatedUser = Depends(require_tourist)
):
    members = _get_group_members_list(group_id)
    if not any(m["user_id"] == current_user.id for m in members):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view group alerts.")

    alerts_raw = _get_all_group_alerts(group_id)
    return [GroupAlertInfo(**a) for a in alerts_raw]

# ----------------------------------------------------------------------------
# 13. RESOLVE GROUP DISTRESS ALERT (Admin or Creator)
# ----------------------------------------------------------------------------
@router.post("/yatra-groups/{group_id}/alerts/{alert_id}/resolve", response_model=GroupAlertInfo)
def resolve_group_alert(
    group_id: str,
    alert_id: str,
    current_user: AuthenticatedUser = Depends(require_tourist)
):
    members = _get_group_members_list(group_id)
    caller_m = next((m for m in members if m["user_id"] == current_user.id), None)
    if not caller_m:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this group.")

    alerts = _get_all_group_alerts(group_id)
    target = next((a for a in alerts if a["id"] == alert_id), None)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group alert not found.")

    is_admin = caller_m.get("role") == "ADMIN"
    is_author = target["user_id"] == current_user.id
    if not (is_admin or is_author):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins or the devotee who triggered the alert can resolve it."
        )

    now = _now_iso()
    target["status"] = "RESOLVED"
    target["resolved_at"] = now
    target["resolved_by"] = current_user.id

    try:
        supabase_admin.table("yatra_group_alerts").update({
            "status": "RESOLVED",
            "resolved_at": now,
            "resolved_by": current_user.id
        }).eq("id", alert_id).execute()
    except Exception:
        pass

    store = _load_local_store()
    for a in store["alerts"]:
        if a["id"] == alert_id:
            a["status"] = "RESOLVED"
            a["resolved_at"] = now
            a["resolved_by"] = current_user.id
    _save_local_store(store)

    return GroupAlertInfo(**target)
