"""Badge / achievement endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.deps import OrgActiveUser, DBSession
from app.models.badge import UserBadge
from app.models.user import User
from app.services.badges import CATALOG, CATALOG_BY_CODE, evaluate_user, serialize_badge

router = APIRouter(prefix="/badges", tags=["badges"])


@router.get("/catalog")
async def catalog():
    return [serialize_badge(b) for b in CATALOG]


@router.get("/me")
async def my_badges(user: OrgActiveUser, db: DBSession):
    rows = (
        await db.scalars(select(UserBadge).where(UserBadge.user_id == user.id))
    ).all()
    earned = {r.badge_code: r.earned_at.isoformat() for r in rows}
    return [
        {**serialize_badge(b), "earned": b.code in earned, "earned_at": earned.get(b.code)}
        for b in CATALOG
    ]


@router.post("/me/refresh")
async def refresh_my_badges(user: OrgActiveUser, db: DBSession):
    new_codes = await evaluate_user(db, user)
    return {"newly_earned": [serialize_badge(CATALOG_BY_CODE[c]) for c in new_codes]}


@router.get("/user/{user_id}")
async def user_badges(user_id: uuid.UUID, db: DBSession):
    """Public — for profile pages."""
    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(404, "User not found")
    rows = (
        await db.scalars(select(UserBadge).where(UserBadge.user_id == user_id))
    ).all()
    return [
        {**serialize_badge(CATALOG_BY_CODE[r.badge_code]), "earned_at": r.earned_at.isoformat()}
        for r in rows
        if r.badge_code in CATALOG_BY_CODE
    ]
