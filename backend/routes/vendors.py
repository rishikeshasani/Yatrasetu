from fastapi import APIRouter
from database import supabase

router = APIRouter()

@router.get("/vendors")
def list_vendors():
    return supabase.table("vendors").select("*").execute().data

@router.get("/vendors/{site_id}")
def get_vendors_by_site(site_id: str):
    return supabase.table("vendors").select("*").eq("site_id", site_id).execute().data