from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user
from app.database import supabase_admin
from app.models.schemas import UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me")
def get_me(user=Depends(get_current_user)):
    res = supabase_admin.table("users").select("*").eq("id", user["user_id"]).single().execute()
    if not res.data:
        # Auto-create profile if missing
        new_row = supabase_admin.table("users").insert({
            "id": user["user_id"],
            "email": user["email"],
            "full_name": (user["email"] or "Student").split("@")[0],
        }).execute()
        return new_row.data[0] if new_row.data else {}
    return res.data


@router.put("/me")
def update_me(payload: UserUpdate, user=Depends(get_current_user)):
    data = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
    res = supabase_admin.table("users").update(data).eq("id", user["user_id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return res.data[0]


@router.get("/stats")
def get_stats(user=Depends(get_current_user)):
    tasks = supabase_admin.table("tasks").select("*").eq("user_id", user["user_id"]).execute().data or []
    total = len(tasks)
    completed = len([t for t in tasks if t["status"] == "completed"])
    pending = len([t for t in tasks if t["status"] == "pending"])
    in_progress = len([t for t in tasks if t["status"] == "in_progress"])
    missed = len([t for t in tasks if t["status"] == "missed"])
    completion_pct = round((completed / total) * 100, 1) if total else 0
    # Upcoming = pending with future deadline within 7d
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    week = now + timedelta(days=7)
    upcoming = [
        t for t in tasks
        if t["status"] != "completed"
        and datetime.fromisoformat(t["deadline"].replace("Z", "+00:00")) <= week
        and datetime.fromisoformat(t["deadline"].replace("Z", "+00:00")) >= now
    ]
    return {
        "total": total,
        "completed": completed,
        "pending": pending,
        "in_progress": in_progress,
        "missed": missed,
        "completion_percentage": completion_pct,
        "upcoming_count": len(upcoming),
        "by_priority": {
            "urgent": len([t for t in tasks if t["priority"] == "urgent"]),
            "high": len([t for t in tasks if t["priority"] == "high"]),
            "medium": len([t for t in tasks if t["priority"] == "medium"]),
            "low": len([t for t in tasks if t["priority"] == "low"]),
        },
    }
