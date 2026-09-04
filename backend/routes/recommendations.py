import os
import csv
from fastapi import APIRouter, HTTPException
from database import supabase

router = APIRouter()

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "data", "alternatives.csv"))
if not os.path.exists(CSV_PATH):
    alt_path = os.path.abspath(os.path.join(CURRENT_DIR, "..", "data", "alternatives.csv"))
    if os.path.exists(alt_path):
        CSV_PATH = alt_path

def parse_crowd_percentage(val_str):
    """Extracts numeric digits from crowd comparison string to convert to integer percentage."""
    digits = "".join(c for c in val_str if c.isdigit())
    return int(digits) if digits else 100

@router.get("/sites")
def list_sites():
    return supabase.table("sites").select("*").execute().data

@router.get("/sites/{site_id}/alternatives")
def get_alternatives(site_id: str):
    # 1. Fetch main site details to verify it exists
    site_data = supabase.table("sites").select("*").eq("id", site_id).execute().data
    if not site_data:
        raise HTTPException(status_code=404, detail="Site not found")
    site = site_data[0]

    # 2. Get the site's current crowd status using existing crowd-density logic
    obs = supabase.table("crowd_observations")\
        .select("*").eq("site_id", site_id)\
        .order("id", desc=True).limit(1).execute().data

    if obs:
        people_count = obs[0]["people_count"]
        occupancy_percentage = round((people_count / site["capacity"]) * 100, 1)
    else:
        people_count = 0
        occupancy_percentage = 0.0

    # Determine status
    if occupancy_percentage < 50:
        status = "NORMAL"
    elif occupancy_percentage < 75:
        status = "MODERATE"
    elif occupancy_percentage < 90:
        status = "HIGH"
    else:
        status = "CRITICAL"

    # 3. Load and filter alternatives from CSV
    recommendations = []
    if os.path.exists(CSV_PATH):
        with open(CSV_PATH, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("main_spot_id") == site_id:
                    try:
                        dist = float(row.get("distance_km_from_main", 0))
                        travel_time = int(row.get("travel_time_mins", 0))
                        relative_crowd = parse_crowd_percentage(row.get("crowd_comparison_percentage", ""))
                        lat = float(row.get("latitude")) if row.get("latitude") else None
                        lon = float(row.get("longitude")) if row.get("longitude") else None
                    except ValueError:
                        continue

                    recommendations.append({
                        "alternative_id": row.get("alt_id"),
                        "name": row.get("alternative_spot_name"),
                        "type": row.get("alternative_type"),
                        "latitude": lat,
                        "longitude": lon,
                        "distance_km": dist,
                        "travel_time_mins": travel_time,
                        "relative_crowd_percentage": relative_crowd,
                        "why_visit": row.get("why_visit_key_attraction"),
                        "best_time_to_visit": row.get("best_time_to_visit"),
                        "road_connectivity": row.get("road_connectivity_status")
                    })

        # Rank alternatives by lower crowd comparison, then shorter travel time
        recommendations.sort(key=lambda x: (x["relative_crowd_percentage"], x["travel_time_mins"]))

    redistribution_needed = status in ["HIGH", "CRITICAL"]

    return {
        "site_id": site_id,
        "site_name": site["name"],
        "current_occupancy_percentage": occupancy_percentage,
        "current_status": status,
        "redistribution_needed": redistribution_needed,
        "recommendations": recommendations
    }