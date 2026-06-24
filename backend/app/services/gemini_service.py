import json
import re
from typing import List, Dict, Any
from datetime import datetime, timezone
from app.config import settings
from groq import Groq

client = Groq(api_key=settings.GROQ_API_KEY)

MODEL_NAME = "llama-3.3-70b-versatile"


def _groq_generate(prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
    """Reusable helper to call Groq's chat completion endpoint and return raw text."""
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a helpful, precise productivity AI assistant."},
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        print("Groq generate error:", e)
        return ""


def _extract_json(text: str) -> Any:
    """Extract JSON object/array from raw model output."""
    try:
        return json.loads(text)
    except Exception:
        pass
    match = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
    match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
    return None


# ============================================
# 1. PRIORITY ENGINE
# ============================================
def prioritize_tasks(tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not tasks:
        return []
    now = datetime.now(timezone.utc).isoformat()
    task_summary = [
        {
            "id": t["id"],
            "title": t["title"],
            "description": t.get("description") or "",
            "deadline": str(t["deadline"]),
            "priority": t.get("priority", "medium"),
            "estimated_hours": float(t.get("estimated_hours", 1)),
            "status": t.get("status", "pending"),
        }
        for t in tasks
    ]
    prompt = f"""You are an AI productivity coach. Current UTC time: {now}.
Analyze the following tasks and assign each a priority score from 0 to 100
(100 = do first). Consider: deadline proximity, estimated workload,
user-set priority, and status.

Tasks:
{json.dumps(task_summary, indent=2)}

Respond ONLY with valid JSON array of objects:
[{{"id": "<task_id>", "score": <0-100>, "reasoning": "<1-2 sentence why>"}}]
"""
    try:
        text = _groq_generate(prompt)
        data = _extract_json(text) or []
        return data if isinstance(data, list) else []
    except Exception as e:
        print("Groq prioritize error:", e)
        return []


# ============================================
# 2. STUDY PLAN GENERATOR
# ============================================
def generate_study_plan(tasks: List[Dict[str, Any]], available_hours: float, plan_type: str = "daily") -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    task_summary = [
        {
            "title": t["title"],
            "deadline": str(t["deadline"]),
            "priority": t.get("priority"),
            "estimated_hours": float(t.get("estimated_hours", 1)),
            "status": t.get("status"),
        }
        for t in tasks
        if t.get("status") != "completed"
    ]
    prompt = f"""You are an academic planning AI. Current UTC time: {now}.
Build a {plan_type} study schedule.

User has {available_hours} productive hours per day.

Tasks:
{json.dumps(task_summary, indent=2)}

Return ONLY valid JSON:
{{
  "summary": "short overview",
  "schedule": [
    {{"day": "Monday" or "2026-06-23", "blocks": [
        {{"start": "09:00", "end": "10:30", "task": "...", "notes": "..."}}
    ]}}
  ],
  "completion_timeline": "when each task will likely finish",
  "tips": ["tip1", "tip2", "tip3"]
}}
"""
    try:
        text = _groq_generate(prompt)
        data = _extract_json(text)
        if not data:
            return {"summary": text, "schedule": [], "completion_timeline": "", "tips": []}
        return data
    except Exception as e:
        print("Groq plan error:", e)
        return {"summary": "Failed to generate plan", "schedule": [], "completion_timeline": "", "tips": []}


# ============================================
# 3. SMART RESCHEDULER
# ============================================
def reschedule_tasks(tasks: List[Dict[str, Any]], available_hours: float) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    task_summary = [
        {
            "title": t["title"],
            "deadline": str(t["deadline"]),
            "status": t.get("status"),
            "estimated_hours": float(t.get("estimated_hours", 1)),
        }
        for t in tasks
    ]
    prompt = f"""Current UTC: {now}. The user has missed some tasks.
Redistribute pending and missed work over remaining days.
Available hours/day: {available_hours}.

Tasks:
{json.dumps(task_summary, indent=2)}

Return ONLY valid JSON:
{{
  "explanation": "what changed and why",
  "new_schedule": [
    {{"day": "...", "blocks": [{{"start": "...", "end": "...", "task": "..."}}]}}
  ],
  "warnings": ["..."]
}}
"""
    try:
        text = _groq_generate(prompt)
        data = _extract_json(text)
        return data or {"explanation": text, "new_schedule": [], "warnings": []}
    except Exception as e:
        print("Groq reschedule error:", e)
        return {"explanation": "Failed", "new_schedule": [], "warnings": []}


# ============================================
# 4. DAILY BRIEF
# ============================================
def generate_daily_brief(user_name: str, tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    task_summary = [
        {
            "title": t["title"],
            "deadline": str(t["deadline"]),
            "priority": t.get("priority"),
            "status": t.get("status"),
            "estimated_hours": float(t.get("estimated_hours", 1)),
        }
        for t in tasks if t.get("status") != "completed"
    ][:15]
    prompt = f"""You are a friendly productivity coach. Current UTC: {now}.
Write a daily brief for user "{user_name}".

Pending tasks:
{json.dumps(task_summary, indent=2)}

Return ONLY valid JSON:
{{
  "greeting": "Good Morning {user_name}",
  "priorities": ["task1", "task2", "task3"],
  "focus_time": "e.g. 3 hours of deep work",
  "expected_completion": "e.g. 65%",
  "tips": ["tip1", "tip2", "tip3"]
}}
"""
    try:
        text = _groq_generate(prompt)
        data = _extract_json(text)
        if not data:
            return {
                "greeting": f"Good Morning {user_name}",
                "priorities": [],
                "focus_time": "—",
                "expected_completion": "—",
                "tips": [],
                "raw": text,
            }
        data["raw"] = text
        return data
    except Exception as e:
        print("Groq brief error:", e)
        return {
            "greeting": f"Good Morning {user_name}",
            "priorities": [],
            "focus_time": "—",
            "expected_completion": "—",
            "tips": ["Stay focused!"],
            "raw": str(e),
        }


# ============================================
# 5. AI COACH CHAT
# ============================================
def chat_with_coach(user_message: str, history: list, tasks_context: list) -> str:
    try:
        task_summary = [
            {
                "title": t["title"],
                "deadline": str(t["deadline"]),
                "priority": t.get("priority"),
                "status": t.get("status"),
            }
            for t in tasks_context[:20]
        ]

        prompt = f"""
You are SmartStudy AI, an expert productivity coach.

Current tasks:
{task_summary}

User message:
{user_message}

Give practical study advice.
"""

        text = _groq_generate(prompt, temperature=0.7, max_tokens=500)
        return text or "AI Coach is temporarily unavailable."

    except Exception as e:
        print("Groq error:", e)
        return "AI Coach is temporarily unavailable."


# ============================================
# 6. VOICE → TASK PARSER
# ============================================
def parse_voice_to_task(transcript: str) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    prompt = f"""Current UTC: {now}.
Convert this spoken sentence into a structured task.

Sentence: "{transcript}"

Return ONLY valid JSON:
{{
  "title": "short clean title",
  "description": "optional details or empty string",
  "deadline": "ISO 8601 datetime in UTC (best guess)",
  "priority": "low|medium|high|urgent",
  "estimated_hours": <number>
}}
"""
    try:
        text = _groq_generate(prompt)
        data = _extract_json(text)
        if not data:
            return {
                "title": transcript[:80],
                "description": "",
                "deadline": now,
                "priority": "medium",
                "estimated_hours": 1.0,
            }
        return data
    except Exception as e:
        print("Groq voice error:", e)
        return {
            "title": transcript[:80],
            "description": "",
            "deadline": now,
            "priority": "medium",
            "estimated_hours": 1.0,
        }