"""Developer / admin utility endpoints — seed data, recompute analytics."""

from __future__ import annotations

import random
import uuid
from datetime import date, timedelta

from fastapi import APIRouter
from sqlalchemy import and_, select

from app.api.deps import OrgModerator, DBSession
from app.models.analytics import DailyAnalytics
from app.models.user import User, UserRole
from app.services.analytics import upsert_daily_for_user
from app.services.badges import evaluate_user, level_from_xp

router = APIRouter(prefix="/dev", tags=["dev"])


@router.post("/seed-analytics")
async def seed_analytics(admin: OrgModerator, db: DBSession, days: int = 30):
    """Backfill realistic-looking analytics for all non-admin users so charts show data."""
    _ = admin
    users = (
        await db.scalars(select(User).where(User.role != UserRole.ADMIN))
    ).all()

    random.seed(42)
    summary: dict[str, int] = {}
    for u in users:
        baseline = random.uniform(40, 85)
        for d in range(days):
            day = date.today() - timedelta(days=days - 1 - d)
            existing = await db.scalar(
                select(DailyAnalytics).where(
                    and_(DailyAnalytics.user_id == u.id, DailyAnalytics.date == day)
                )
            )
            if existing:
                continue
            wobble = random.gauss(0, 12)
            disc = max(0, min(100, baseline + wobble))
            assigned = random.randint(2, 5)
            approved = max(0, min(assigned, int(round(assigned * disc / 100))))
            rec = DailyAnalytics(
                user_id=u.id,
                date=day,
                tasks_assigned=assigned,
                tasks_submitted=approved + random.randint(0, 2),
                tasks_approved=approved,
                tasks_rejected=random.randint(0, 1),
                productivity_score=round(disc + random.gauss(0, 5), 2),
                discipline_score=round(disc, 2),
                focus_score=round(max(0, min(100, baseline + random.gauss(0, 8))), 2),
                study_minutes=random.randint(30, 240),
                points_earned=approved * 15,
            )
            db.add(rec)
        u.xp = max(u.xp, random.randint(200, 4500))
        u.discipline_score = int(baseline)
        u.productivity_score = int(baseline + 5)
        u.streak = random.randint(0, 25)
        u.longest_streak = max(u.streak, random.randint(5, 40))
        u.level = level_from_xp(u.xp)
        summary[u.email] = u.xp

    await db.commit()
    for u in users:
        await evaluate_user(db, u)

    return {"seeded_users": len(users), "days": days, "xp_set": summary}


@router.post("/recompute-analytics-today")
async def recompute_today(admin: OrgModerator, db: DBSession):
    """Re-run analytics rollup for every non-admin user for today."""
    _ = admin
    users = (
        await db.scalars(select(User).where(User.role != UserRole.ADMIN))
    ).all()
    for u in users:
        await upsert_daily_for_user(db, u.id, date.today())
    return {"users": len(users)}
