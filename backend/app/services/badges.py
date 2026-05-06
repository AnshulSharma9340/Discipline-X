"""Achievement / badge engine.

Badge definitions live here as a static catalog. When events happen
(submission approved, streak hit, etc.) we re-evaluate which badges the
user qualifies for and persist any newly-earned ones.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Callable

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.badge import UserBadge
from app.models.submission import SubmissionStatus, TaskSubmission
from app.models.user import User


@dataclass
class BadgeDef:
    code: str
    name: str
    description: str
    emoji: str
    tier: str  # bronze, silver, gold, mythic


CATALOG: list[BadgeDef] = [
    BadgeDef("first_blood", "First Blood", "Approved your first task", "🩸", "bronze"),
    BadgeDef("week_warrior", "Week Warrior", "7-day streak", "⚔️", "silver"),
    BadgeDef("iron_will", "Iron Will", "30-day streak", "🛡️", "gold"),
    BadgeDef("century", "Centurion", "100 tasks approved", "💯", "gold"),
    BadgeDef("xp_1k", "XP Hoarder", "1,000 XP earned", "💎", "silver"),
    BadgeDef("xp_5k", "XP Whale", "5,000 XP earned", "🐋", "gold"),
    BadgeDef("comeback", "Comeback Kid", "Returned from a lockout", "🔄", "silver"),
    BadgeDef("insomniac", "Insomniac", "Submitted between 12 AM and 4 AM", "🌙", "bronze"),
    BadgeDef("early_bird", "Early Bird", "Submitted before 7 AM", "🌅", "bronze"),
    BadgeDef("perfect_week", "Perfect Week", "All required tasks for 7 days", "🌟", "gold"),
    BadgeDef("level_10", "Apprentice", "Reached level 10", "🎓", "bronze"),
    BadgeDef("level_25", "Veteran", "Reached level 25", "⭐", "silver"),
    BadgeDef("level_50", "Master", "Reached level 50", "👑", "gold"),
    BadgeDef("habit_starter", "Habit Starter", "Tracked 3 habits", "🌱", "bronze"),
    BadgeDef("reflective", "Reflective", "Wrote 7 daily reflections", "📓", "silver"),
    BadgeDef("focus_2h", "Deep Worker", "2h+ focus in a single day", "🧠", "silver"),
    BadgeDef("focus_5h", "Monk Mode", "5h+ focus in a single day", "🧘", "gold"),
    BadgeDef("mythic_streak", "Unstoppable", "100-day streak", "🔥", "mythic"),
]

CATALOG_BY_CODE = {b.code: b for b in CATALOG}


def serialize_badge(b: BadgeDef) -> dict:
    return {
        "code": b.code,
        "name": b.name,
        "description": b.description,
        "emoji": b.emoji,
        "tier": b.tier,
    }


async def _has(db: AsyncSession, user_id: uuid.UUID, code: str) -> bool:
    return bool(
        await db.scalar(
            select(UserBadge).where(
                UserBadge.user_id == user_id, UserBadge.badge_code == code
            )
        )
    )


async def _award(db: AsyncSession, user_id: uuid.UUID, code: str) -> UserBadge | None:
    if await _has(db, user_id, code):
        return None
    ub = UserBadge(user_id=user_id, badge_code=code)
    db.add(ub)
    return ub


async def evaluate_user(db: AsyncSession, user: User) -> list[str]:
    """Re-evaluate every badge for a user. Returns codes newly awarded."""
    new: list[str] = []

    # XP-based
    if user.xp >= 1000 and not await _has(db, user.id, "xp_1k"):
        await _award(db, user.id, "xp_1k")
        new.append("xp_1k")
    if user.xp >= 5000 and not await _has(db, user.id, "xp_5k"):
        await _award(db, user.id, "xp_5k")
        new.append("xp_5k")

    # Streak-based
    if user.streak >= 7 and not await _has(db, user.id, "week_warrior"):
        await _award(db, user.id, "week_warrior")
        new.append("week_warrior")
    if user.streak >= 30 and not await _has(db, user.id, "iron_will"):
        await _award(db, user.id, "iron_will")
        new.append("iron_will")
    if user.streak >= 100 and not await _has(db, user.id, "mythic_streak"):
        await _award(db, user.id, "mythic_streak")
        new.append("mythic_streak")

    # Level-based
    if user.level >= 10 and not await _has(db, user.id, "level_10"):
        await _award(db, user.id, "level_10")
        new.append("level_10")
    if user.level >= 25 and not await _has(db, user.id, "level_25"):
        await _award(db, user.id, "level_25")
        new.append("level_25")
    if user.level >= 50 and not await _has(db, user.id, "level_50"):
        await _award(db, user.id, "level_50")
        new.append("level_50")

    # Approved-task counts
    approved = (
        await db.scalar(
            select(func.count())
            .select_from(TaskSubmission)
            .where(
                TaskSubmission.user_id == user.id,
                TaskSubmission.status == SubmissionStatus.APPROVED,
            )
        )
    ) or 0
    if approved >= 1 and not await _has(db, user.id, "first_blood"):
        await _award(db, user.id, "first_blood")
        new.append("first_blood")
    if approved >= 100 and not await _has(db, user.id, "century"):
        await _award(db, user.id, "century")
        new.append("century")

    if new:
        await db.commit()
    return new


async def evaluate_time_of_day(
    db: AsyncSession, user: User, hour: int
) -> list[str]:
    """Award time-window badges based on submission timestamp."""
    new: list[str] = []
    if 0 <= hour < 4 and not await _has(db, user.id, "insomniac"):
        await _award(db, user.id, "insomniac")
        new.append("insomniac")
    if 4 <= hour < 7 and not await _has(db, user.id, "early_bird"):
        await _award(db, user.id, "early_bird")
        new.append("early_bird")
    if new:
        await db.commit()
    return new


def level_from_xp(xp: int) -> int:
    """Sqrt-based progression — feels good early, slows late.
    Level 1 = 0 XP, L2 = 100, L5 = 625, L10 = 2500, L25 = 15625, L50 = 62500."""
    if xp <= 0:
        return 1
    return max(1, int((xp / 100) ** 0.5) + 1)
