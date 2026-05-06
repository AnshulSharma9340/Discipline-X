"""Daily reflection journal + morning mood/sleep check-in."""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, select

from app.api.deps import OrgActiveUser, DBSession
from app.models.reflection import Reflection

router = APIRouter(prefix="/reflections", tags=["reflections"])


class MorningCheckin(BaseModel):
    sleep_hours: float | None = Field(None, ge=0, le=16)
    mood: int | None = Field(None, ge=1, le=5)
    energy: int | None = Field(None, ge=1, le=5)


class EveningReflection(BaseModel):
    shipped: str = ""
    blocked: str = ""
    tomorrow: str = ""
    rating: int | None = Field(None, ge=1, le=10)


def _serialize(r: Reflection) -> dict:
    return {
        "date": r.date.isoformat(),
        "sleep_hours": r.sleep_hours,
        "mood": r.mood,
        "energy": r.energy,
        "shipped": r.shipped,
        "blocked": r.blocked,
        "tomorrow": r.tomorrow,
        "rating": r.rating,
    }


async def _get_or_create_today(db, user_id) -> Reflection:
    today = date.today()
    r = await db.scalar(
        select(Reflection).where(
            and_(Reflection.user_id == user_id, Reflection.date == today)
        )
    )
    if not r:
        r = Reflection(user_id=user_id, date=today)
        db.add(r)
        await db.commit()
        await db.refresh(r)
    return r


@router.get("/today")
async def today(user: OrgActiveUser, db: DBSession):
    r = await _get_or_create_today(db, user.id)
    return _serialize(r)


@router.post("/morning")
async def morning_checkin(payload: MorningCheckin, user: OrgActiveUser, db: DBSession):
    r = await _get_or_create_today(db, user.id)
    if payload.sleep_hours is not None:
        r.sleep_hours = payload.sleep_hours
    if payload.mood is not None:
        r.mood = payload.mood
    if payload.energy is not None:
        r.energy = payload.energy
    await db.commit()
    await db.refresh(r)
    return _serialize(r)


@router.post("/evening")
async def evening_reflection(payload: EveningReflection, user: OrgActiveUser, db: DBSession):
    r = await _get_or_create_today(db, user.id)
    r.shipped = payload.shipped
    r.blocked = payload.blocked
    r.tomorrow = payload.tomorrow
    if payload.rating is not None:
        r.rating = payload.rating
    await db.commit()
    await db.refresh(r)
    return _serialize(r)


@router.get("/history")
async def history(user: OrgActiveUser, db: DBSession, days: int = Query(30, ge=1, le=365)):
    since = date.today() - timedelta(days=days - 1)
    rows = (
        await db.scalars(
            select(Reflection)
            .where(Reflection.user_id == user.id, Reflection.date >= since)
            .order_by(Reflection.date.desc())
        )
    ).all()
    return [_serialize(r) for r in rows]
