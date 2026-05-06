"""Public + private profile endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.api.deps import OrgActiveUser, CurrentUser, DBSession
from app.models.badge import UserBadge
from app.models.submission import SubmissionStatus, TaskSubmission
from app.models.user import User
from app.services.badges import CATALOG_BY_CODE, serialize_badge

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileUpdate(BaseModel):
    bio: str | None = Field(None, max_length=280)
    theme: str | None = None


@router.patch("/me")
async def update_profile(payload: ProfileUpdate, user: CurrentUser, db: DBSession):
    if payload.bio is not None:
        user.bio = payload.bio
    if payload.theme is not None:
        unlocked = set(user.unlocked_themes.split(","))
        if payload.theme in unlocked:
            user.theme = payload.theme
    await db.commit()
    return {"bio": user.bio, "theme": user.theme}


@router.get("/{user_id}")
async def public_profile(user_id: uuid.UUID, viewer: OrgActiveUser, db: DBSession):
    """Anyone authenticated can view another user's profile."""
    _ = viewer
    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(404, "User not found")

    badge_rows = (
        await db.scalars(select(UserBadge).where(UserBadge.user_id == user_id))
    ).all()
    badges = [
        {**serialize_badge(CATALOG_BY_CODE[r.badge_code]), "earned_at": r.earned_at.isoformat()}
        for r in badge_rows
        if r.badge_code in CATALOG_BY_CODE
    ]

    approved = (
        await db.scalar(
            select(func.count())
            .select_from(TaskSubmission)
            .where(
                TaskSubmission.user_id == user_id,
                TaskSubmission.status == SubmissionStatus.APPROVED,
            )
        )
    ) or 0

    return {
        "user_id": str(target.id),
        "name": target.name or target.email.split("@")[0],
        "avatar_url": target.avatar_url,
        "bio": target.bio,
        "level": target.level,
        "xp": target.xp,
        "streak": target.streak,
        "longest_streak": target.longest_streak,
        "discipline_score": target.discipline_score,
        "tasks_approved": int(approved),
        "badges": badges,
        "joined": target.created_at.isoformat(),
    }
