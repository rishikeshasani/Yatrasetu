from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import supabase
from dependencies import require_role, AuthenticatedUser

router = APIRouter()

class RewardRequest(BaseModel):
    user_id: str
    points: int
    reason: str

@router.post("/wallet/reward")
def reward_user(
    data: RewardRequest,
    current_user: AuthenticatedUser = Depends(require_role(["government", "hotel", "travel_company"]))
):
    supabase.table("wallet_transactions").insert({
        "user_id": data.user_id,
        "points": data.points,
        "reason": data.reason
    }).execute()
    return {"message": f"{data.points} points added", "status": "success"}

@router.get("/wallet/{user_id}")
def get_wallet(user_id: str):
    txns = supabase.table("wallet_transactions").select("*").eq("user_id", user_id).execute().data
    total = sum(t["points"] for t in txns)
    return {"user_id": user_id, "total_points": total, "history": txns}
