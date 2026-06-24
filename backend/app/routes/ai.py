from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.database import supabase_admin
from app.models.schemas import ChatRequest
from app.services import gemini_service
import uuid

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.get("/daily-brief")
def daily_brief(user=Depends(get_current_user)):
    user_row = supabase_admin.table("users").select("*").eq("id", user["user_id"]).single().execute().data
    name = (user_row or {}).get("full_name") or (user["email"] or "Student").split("@")[0]
    tasks = supabase_admin.table("tasks").select("*").eq("user_id", user["user_id"]).execute().data or []
    brief = gemini_service.generate_daily_brief(name, tasks)
    supabase_admin.table("ai_recommendations").insert({
        "user_id": user["user_id"],
        "recommendation_type": "daily_brief",
        "content": brief.get("raw", ""),
        "metadata": brief,
    }).execute()
    return brief


@router.post("/chat")
def chat(req: ChatRequest, user=Depends(get_current_user)):
    session_id = req.session_id or str(uuid.uuid4())
    history = supabase_admin.table("chat_history").select("*").eq("user_id", user["user_id"]).eq("session_id", session_id).order("created_at").execute().data or []
    tasks = supabase_admin.table("tasks").select("*").eq("user_id", user["user_id"]).execute().data or []
    reply = gemini_service.chat_with_coach(req.message, history, tasks)
    # Save both messages
    supabase_admin.table("chat_history").insert([
        {"user_id": user["user_id"], "role": "user", "message": req.message, "session_id": session_id},
        {"user_id": user["user_id"], "role": "assistant", "message": reply, "session_id": session_id},
    ]).execute()
    return {"reply": reply, "session_id": session_id}


@router.get("/chat/history")
def get_history(session_id: str = None, user=Depends(get_current_user)):
    q = supabase_admin.table("chat_history").select("*").eq("user_id", user["user_id"])
    if session_id:
        q = q.eq("session_id", session_id)
    res = q.order("created_at").execute()
    return res.data or []


@router.delete("/chat/history")
def clear_history(user=Depends(get_current_user)):
    supabase_admin.table("chat_history").delete().eq("user_id", user["user_id"]).execute()
    return {"ok": True}
