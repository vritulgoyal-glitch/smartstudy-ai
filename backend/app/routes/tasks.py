from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user
from app.database import supabase_admin
from app.models.schemas import TaskCreate, TaskUpdate, VoiceTaskRequest
from app.services import gemini_service
from datetime import datetime

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("")
def list_tasks(user=Depends(get_current_user)):
    res = supabase_admin.table("tasks").select("*").eq("user_id", user["user_id"]).order("deadline").execute()
    return res.data or []


@router.post("")
def create_task(task: TaskCreate, user=Depends(get_current_user)):
    payload = {
        "user_id": user["user_id"],
        "title": task.title,
        "description": task.description,
        "deadline": task.deadline.isoformat(),
        "priority": task.priority.value,
        "estimated_hours": task.estimated_hours,
        "status": "pending",
    }
    res = supabase_admin.table("tasks").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to create task")
    # Recompute priorities asynchronously (best-effort)
    try:
        all_tasks = supabase_admin.table("tasks").select("*").eq("user_id", user["user_id"]).neq("status", "completed").execute().data or []
        scores = gemini_service.prioritize_tasks(all_tasks)
        for s in scores:
            supabase_admin.table("tasks").update({
                "ai_priority_score": s.get("score", 0),
                "ai_reasoning": s.get("reasoning", ""),
            }).eq("id", s["id"]).execute()
    except Exception as e:
        print("AI rescore failed:", e)
    return res.data[0]


@router.put("/{task_id}")
def update_task(task_id: str, task: TaskUpdate, user=Depends(get_current_user)):
    payload = {k: v for k, v in task.dict(exclude_unset=True).items() if v is not None}
    if "deadline" in payload and isinstance(payload["deadline"], datetime):
        payload["deadline"] = payload["deadline"].isoformat()
    if "priority" in payload and hasattr(payload["priority"], "value"):
        payload["priority"] = payload["priority"].value
    if "status" in payload and hasattr(payload["status"], "value"):
        payload["status"] = payload["status"].value
    if payload.get("status") == "completed":
        payload["completed_at"] = datetime.utcnow().isoformat()
    res = supabase_admin.table("tasks").update(payload).eq("id", task_id).eq("user_id", user["user_id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return res.data[0]


@router.delete("/{task_id}")
def delete_task(task_id: str, user=Depends(get_current_user)):
    supabase_admin.table("tasks").delete().eq("id", task_id).eq("user_id", user["user_id"]).execute()
    return {"ok": True}


@router.post("/{task_id}/complete")
def complete_task(task_id: str, user=Depends(get_current_user)):
    res = supabase_admin.table("tasks").update({
        "status": "completed",
        "completed_at": datetime.utcnow().isoformat(),
    }).eq("id", task_id).eq("user_id", user["user_id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return res.data[0]


@router.post("/prioritize")
def prioritize(user=Depends(get_current_user)):
    tasks = supabase_admin.table("tasks").select("*").eq("user_id", user["user_id"]).neq("status", "completed").execute().data or []
    scores = gemini_service.prioritize_tasks(tasks)
    for s in scores:
        supabase_admin.table("tasks").update({
            "ai_priority_score": s.get("score", 0),
            "ai_reasoning": s.get("reasoning", ""),
        }).eq("id", s["id"]).execute()
    return {"scored": scores}


@router.post("/voice")
def create_task_from_voice(req: VoiceTaskRequest, user=Depends(get_current_user)):
    parsed = gemini_service.parse_voice_to_task(req.transcript)
    payload = {
        "user_id": user["user_id"],
        "title": parsed.get("title", req.transcript[:80]),
        "description": parsed.get("description", ""),
        "deadline": parsed.get("deadline"),
        "priority": parsed.get("priority", "medium"),
        "estimated_hours": float(parsed.get("estimated_hours", 1)),
        "status": "pending",
    }
    res = supabase_admin.table("tasks").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed")
    return res.data[0]
