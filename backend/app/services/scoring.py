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
    submission.points_awarded = task.points
    user.xp += task.points
    user.productivity_score += task.points
    # Discipline tracks consistency; +1 for any approved required task
    if task.is_required:
        user.discipline_score += 2


async def recompute_streak(db: AsyncSession, user: User) -> None:
    """Walk back day by day; streak is the run of days with ≥1 approved task."""
    today = datetime.now(timezone.utc).date()
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
        if count and count > 0:
            streak += 1
            from datetime import timedelta

            cursor = cursor - timedelta(days=1)
        else:
            break

    user.streak = streak
    if streak > user.longest_streak:
        user.longest_streak = streak
