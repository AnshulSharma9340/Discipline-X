"""End-of-day discipline enforcement.

Run by APScheduler at the configured cutoff (default 23:59 UTC).

For each user:
  - count today's required tasks
  - count their approved required submissions for today
  - if approved < required → lock the account
  - if all required approved → keep streak alive
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from loguru import logger
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.submission import SubmissionStatus, TaskSubmission
from app.models.task import DailyTask
from app.models.user import AccessStatus, User, UserRole


async def _required_today(db: AsyncSession, day: datetime, org_id: uuid.UUID | None) -> int:
    end = day + timedelta(days=1)
    stmt = (
        select(func.count())
        .select_from(DailyTask)
        .where(
            DailyTask.is_required.is_(True),
            DailyTask.is_archived.is_(False),
            DailyTask.task_date >= day,
            DailyTask.task_date < end,
        )
    )
    if org_id:
        stmt = stmt.where(DailyTask.org_id == org_id)
    return (await db.scalar(stmt)) or 0


async def _approved_required_for_user(db: AsyncSession, user_id, day: datetime) -> int:
    end = day + timedelta(days=1)
    return (
        await db.scalar(
            select(func.count())
            .select_from(TaskSubmission)
            .join(DailyTask, DailyTask.id == TaskSubmission.task_id)
            .where(
                and_(
                    TaskSubmission.user_id == user_id,
                    TaskSubmission.status == SubmissionStatus.APPROVED,
                    DailyTask.is_required.is_(True),
                    DailyTask.task_date >= day,
                    DailyTask.task_date < end,
                )
            )
        )
    ) or 0


async def run_daily_discipline_check(
    now: datetime | None = None, org_id: uuid.UUID | None = None
) -> dict:
    """Lock users who haven't completed all required tasks for today.

    If org_id is provided, only that org's users are checked. Otherwise,
    iterates per-org so each org's required-task count is correct.

    Returns a summary dict for logging/audit.
    """
    now = now or datetime.now(timezone.utc)
    day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

    summary = {"checked": 0, "locked": 0, "passed": 0, "no_required": 0}

    async with AsyncSessionLocal() as db:
        if org_id is None:
            org_ids = list(
                (
                    await db.scalars(select(User.org_id).where(User.org_id.is_not(None)).distinct())
                ).all()
            )
        else:
            org_ids = [org_id]

        for current_org_id in org_ids:
            required_count = await _required_today(db, day, current_org_id)

            users_stmt = select(User).where(
                User.is_active.is_(True),
                User.role != UserRole.ADMIN,
                User.org_id == current_org_id,
            )
            users = (await db.scalars(users_stmt)).all()

            for u in users:
                summary["checked"] += 1
                if required_count == 0:
                    summary["no_required"] += 1
                    continue

                approved = await _approved_required_for_user(db, u.id, day)
                if approved < required_count:
                    if u.access_status != AccessStatus.LOCKED:
                        u.access_status = AccessStatus.LOCKED
                        u.locked_at = now
                        summary["locked"] += 1
                    u.streak = 0
                else:
                    summary["passed"] += 1
                    u.last_active_date = now

        await db.commit()

    logger.info("Discipline check: {}", summary)
    return summary
