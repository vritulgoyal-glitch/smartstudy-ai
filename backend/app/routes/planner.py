from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user
from app.database import supabase_admin
from app.models.schemas import StudyPlanRequest
from app.services import gemini_service
from datetime import date, timedelta

router = APIRouter(prefix="/api/planner", tags=["planner"])


@router.post("/generate")
def generate_plan(req: StudyPlanRequest, user=Depends(get_current_user)):
    tasks = supabase_admin.table("tasks").select("*").eq("user_id", user["user_id"]).neq("status", "completed").execute().data or []
    plan = gemini_service.generate_study_plan(tasks, req.available_hours, req.plan_type)
    start = date.today()
    end = start + timedelta(days=1 if req.plan_type == "daily" else 7)
    # Deactivate previous plans
    supabase_admin.table("study_plans").update({"is_active": False}).eq("user_id", user["user_id"]).eq("is_active", True).execute()
    saved = supabase_admin.table("study_plans").insert({
        "user_id": user["user_id"],
        "plan_type": req.plan_type,
        "available_hours": req.available_hours,
        "plan_data": plan,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "is_active": True,
    }).execute()
    return saved.data[0] if saved.data else {"plan": plan}


@router.get("/current")
def get_current_plan(user=Depends(get_current_user)):
    res = supabase_admin.table("study_plans").select("*").eq("user_id", user["user_id"]).eq("is_active", True).order("created_at", desc=True).limit(1).execute()
    if not res.data:
        return None
    return res.data[0]


@router.post("/reschedule")
def reschedule(user=Depends(get_current_user)):
    user_row = supabase_admin.table("users").select("*").eq("id", user["user_id"]).single().execute().data
    available = (user_row or {}).get("available_hours_per_day", 4)
    tasks = supabase_admin.table("tasks").select("*").eq("user_id", user["user_id"]).neq("status", "completed").execute().data or []
    result = gemini_service.reschedule_tasks(tasks, available)
    supabase_admin.table("ai_recommendations").insert({
        "user_id": user["user_id"],
        "recommendation_type": "reschedule",
        "content": result.get("explanation", ""),
        "metadata": result,
    }).execute()
    return result
