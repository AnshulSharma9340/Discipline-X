"""Scoring + streak logic.

Kept deliberately simple and pure so AI features later can call into it.
Discipline = % of required tasks completed, scaled to 100.
Productivity = points earned today.
Streak = consecutive days where ≥1 required task was approved.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.submission import SubmissionStatus, TaskSubmission
from app.models.task import DailyTask
from app.models.user import User


async def award_points_on_approve(
    db: AsyncSession, user: User, submission: TaskSubmission, task: DailyTask
) -> None:
    """Bump user XP + scores when a submission is approved."""
    base = task.points
    multiplier = 1.0
    now = datetime.now(timezone.utc)
    if user.xp_boost_until and user.xp_boost_until > now and user.xp_boost_multiplier > 1.0:
        multiplier = float(user.xp_boost_multiplier)
    awarded = int(round(base * multiplier))

    submission.points_awarded = awarded
    user.xp += awarded
    user.productivity_score += awarded
    # Discipline tracks consistency; +1 for any approved required task
    if task.is_required:
        user.discipline_score += 2


async def recompute_streak(db: AsyncSession, user: User) -> None:
    """Walk back day by day; streak is the run of days with ≥1 approved task.

    A missed past day is automatically protected if the user has freeze tokens.
    Each protected date is recorded in ``user.shielded_dates`` so the same
    consumption doesn't repeat on subsequent recomputes.
    """
    from datetime import timedelta

    today = datetime.now(timezone.utc).date()
    shielded = {d for d in (user.shielded_dates or "").split(",") if d}
    streak = 0
    cursor = today

    while True:
        day_start = datetime.combine(cursor, datetime.min.time(), tzinfo=timezone.utc)
        day_end = datetime.combine(cursor, datetime.max.time(), tzinfo=timezone.utc)
        count = await db.scalar(
            select(func.count())
            .select_from(TaskSubmission)
            .join(DailyTask, DailyTask.id == TaskSubmission.task_id)
            .where(
                and_(
                    TaskSubmission.user_id == user.id,
                    TaskSubmission.status == SubmissionStatus.APPROVED,
                    DailyTask.task_date >= day_start,
                    DailyTask.task_date <= day_end,
                )
            )
        )
        day_iso = cursor.isoformat()
        if count and count > 0:
            streak += 1
            cursor -= timedelta(days=1)
        elif day_iso in shielded:
            # Already protected by a previously spent shield — no new cost.
            streak += 1
            cursor -= timedelta(days=1)
        elif cursor < today and user.freeze_tokens > 0:
            # Spend a shield to protect this past day; today is excluded so
            # users still have until the cutoff to ship.
            user.freeze_tokens -= 1
            shielded.add(day_iso)
            streak += 1
            cursor -= timedelta(days=1)
        else:
            break

    user.shielded_dates = ",".join(sorted(shielded))
    user.streak = streak
    if streak > user.longest_streak:
        user.longest_streak = streak
