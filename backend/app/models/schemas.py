from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    MISSED = "missed"


# ---------- TASK ----------
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: datetime
    priority: Priority = Priority.MEDIUM
    estimated_hours: float = 1.0


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[Priority] = None
    estimated_hours: Optional[float] = None
    status: Optional[TaskStatus] = None


class TaskOut(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str]
    deadline: datetime
    priority: str
    estimated_hours: float
    status: str
    ai_priority_score: Optional[float] = 0
    ai_reasoning: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# ---------- USER ----------
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    available_hours_per_day: Optional[int] = None
    timezone: Optional[str] = None


# ---------- STUDY PLAN ----------
class StudyPlanRequest(BaseModel):
    available_hours: float = Field(..., gt=0, le=24)
    plan_type: str = "daily"  # daily or weekly


class StudyPlanOut(BaseModel):
    id: str
    plan_type: str
    available_hours: float
    plan_data: Dict[str, Any]
    start_date: str
    end_date: Optional[str]
    is_active: bool
    created_at: datetime


# ---------- CHAT ----------
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str


# ---------- VOICE ----------
class VoiceTaskRequest(BaseModel):
    transcript: str


# ---------- AI BRIEF ----------
class DailyBriefResponse(BaseModel):
    greeting: str
    priorities: List[str]
    focus_time: str
    expected_completion: str
    tips: List[str]
    raw: str
