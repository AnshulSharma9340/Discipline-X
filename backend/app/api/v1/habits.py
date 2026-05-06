"""Habit tracker — recurring daily checkboxes."""

from __future__ import annotations

import uuid
from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, select
from sqlalchemy.orm import selectinload

from app.api.deps import OrgActiveUser, DBSession
from app.models.habit import Habit, HabitCheck

router = APIRouter(prefix="/habits", tags=["habits"])


class HabitCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    icon: str = "check"
    color: str = "violet"
    target_per_week: int = Field(7, ge=1, le=7)


class HabitUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=80)
    icon: str | None = None
    color: str | None = None
    target_per_week: int | None = Field(None, ge=1, le=7)
    is_active: bool | None = None


@router.get("/")
async def list_habits(user: OrgActiveUser, db: DBSession):
    """All habits + last 7 days of checks for the calling user."""
    rows = (
        await db.scalars(
            select(Habit)
            .where(Habit.user_id == user.id, Habit.is_active.is_(True))
            .options(selectinload(Habit.checks))
            .order_by(Habit.sort_order.asc(), Habit.created_at.asc())
        )
    ).all()

    today = date.today()
    week = [today - timedelta(days=i) for i in range(6, -1, -1)]
    out = []
    for h in rows:
        check_map = {c.date: c.done for c in h.checks if c.date >= week[0]}
        out.append(
            {
                "id": str(h.id),
                "name": h.name,
                "icon": h.icon,
                "color": h.color,
                "target_per_week": h.target_per_week,
                "week": [
                    {"date": d.isoformat(), "done": check_map.get(d, False)} for d in week
                ],
                "current_streak": _streak(h.checks),
            }
        )
    return out


def _streak(checks: list[HabitCheck]) -> int:
    """Walk back from today; count consecutive done days."""
    by_date = {c.date: c.done for c in checks}
    streak = 0
    cursor = date.today()
    while by_date.get(cursor):
        streak += 1
        cursor -= timedelta(days=1)
    return streak


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_habit(payload: HabitCreate, user: OrgActiveUser, db: DBSession):
    h = Habit(
        user_id=user.id,
        name=payload.name,
        icon=payload.icon,
        color=payload.color,
        target_per_week=payload.target_per_week,
    )
    db.add(h)
    await db.commit()
    await db.refresh(h)
    return {"id": str(h.id), "name": h.name}


@router.patch("/{habit_id}")
async def update_habit(
    habit_id: uuid.UUID, payload: HabitUpdate, user: OrgActiveUser, db: DBSession
):
    h = await db.get(Habit, habit_id)
    if not h or h.user_id != user.id:
        raise HTTPException(404, "Habit not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(h, k, v)
    await db.commit()
    return {"ok": True}


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_habit(habit_id: uuid.UUID, user: OrgActiveUser, db: DBSession):
    h = await db.get(Habit, habit_id)
    if not h or h.user_id != user.id:
        raise HTTPException(404, "Habit not found")
    await db.delete(h)
    await db.commit()


@router.post("/{habit_id}/toggle")
async def toggle_habit(habit_id: uuid.UUID, user: OrgActiveUser, db: DBSession, on: date | None = None):
    """Toggle today's check (or a specific date)."""
    h = await db.get(Habit, habit_id)
    if not h or h.user_id != user.id:
        raise HTTPException(404, "Habit not found")
    target = on or date.today()

    existing = await db.scalar(
        select(HabitCheck).where(
            and_(HabitCheck.habit_id == habit_id, HabitCheck.date == target)
        )
    )
    if existing:
        existing.done = not existing.done
        done = existing.done
    else:
        c = HabitCheck(habit_id=habit_id, date=target, done=True)
        db.add(c)
        done = True
    await db.commit()
    return {"date": target.isoformat(), "done": done}
