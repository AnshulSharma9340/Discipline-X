"""Additional AI endpoints: nudges, daily quote, admin task generator."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.deps import OrgActiveUser, OrgModerator, DBSession
from app.services import quotes
from app.services.ai_nudges import generate_nudge
from app.services.ai_task_gen import PROFILES, generate, generate_with_groq
from app.core.config import settings

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/me/nudge")
async def my_nudge(user: OrgActiveUser, db: DBSession):
    return await generate_nudge(db, user.id, user.name or user.email.split("@")[0])


@router.get("/quote")
async def daily_quote(user: OrgActiveUser):
    _ = user
    return await quotes.daily_quote()


class TaskGenRequest(BaseModel):
    profile: str = "general"
    count: int = 5
    use_ai: bool = True
    custom_prompt: str = ""


@router.post("/admin/generate-tasks")
async def admin_generate_tasks(payload: TaskGenRequest, admin: OrgModerator):
    """Generate a task pack for the admin to review and publish.

    Uses Groq when GROQ_API_KEY is set and use_ai=True; otherwise local templates.
    """
    _ = admin

    if payload.use_ai and settings.groq_enabled:
        ai = await generate_with_groq(payload.profile, payload.count, payload.custom_prompt)
        if ai:
            return {"tasks": ai, "source": "groq"}

    return {"tasks": generate(payload.profile, payload.count), "source": "local"}


@router.get("/admin/profiles")
async def list_profiles(admin: OrgModerator):
    _ = admin
    return [
        {"code": code, "label": code.replace("_", " ").title(), "task_count": len(tasks)}
        for code, tasks in PROFILES.items()
    ]


@router.get("/status")
async def ai_status(user: OrgActiveUser):
    _ = user
    return {
        "groq_enabled": settings.groq_enabled,
        "model": settings.GROQ_MODEL if settings.groq_enabled else None,
    }
