"""Daily 3 AM IST cleanup job.

Goals:
  1. Free Supabase Storage by deleting proof files (images, PDFs, stopwatch
     screenshots) attached to submissions of tasks from previous days.
  2. Archive previous days' DailyTask rows so the active task list resets
     for the new day.

We treat "previous day" as anything with `task_date < (today midnight in IST)`.
That keeps today's submissions and proof files intact even if the job
runs slightly late.
"""

from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from loguru import logger
from sqlalchemy import or_, select, update

from app.core.database import AsyncSessionLocal
from app.models.submission import TaskSubmission
from app.models.task import DailyTask
from app.services.storage import delete_object

IST = ZoneInfo("Asia/Kolkata")


def _today_midnight_utc() -> datetime:
    """Return UTC datetime that corresponds to today's 00:00 in IST."""
    now_ist = datetime.now(IST)
    midnight_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    return midnight_ist.astimezone(timezone.utc)


async def run_daily_reset() -> None:
    cutoff = _today_midnight_utc()
    logger.info("Daily reset starting (cutoff < {} UTC)", cutoff.isoformat())

    async with AsyncSessionLocal() as db:
        # 1. Find non-archived tasks from previous IST days.
        old_task_ids = (
            await db.scalars(
                select(DailyTask.id).where(
                    DailyTask.task_date < cutoff,
                    DailyTask.is_archived.is_(False),
                )
            )
        ).all()

        if not old_task_ids:
            logger.info("Daily reset: nothing to do")
            return

        # 2. Pull all submissions on those tasks that have any proof file path.
        subs = (
            await db.scalars(
                select(TaskSubmission).where(
                    TaskSubmission.task_id.in_(old_task_ids),
                    or_(
                        TaskSubmission.proof_image_path.is_not(None),
                        TaskSubmission.proof_pdf_path.is_not(None),
                        TaskSubmission.stopwatch_image_path.is_not(None),
                    ),
                )
            )
        ).all()

        deleted_files = 0
        for sub in subs:
            for attr in ("proof_image_path", "proof_pdf_path", "stopwatch_image_path"):
                path = getattr(sub, attr)
                if not path:
                    continue
                try:
                    delete_object(path)
                    deleted_files += 1
                except Exception as exc:
                    # A failed delete shouldn't abort the whole reset; just log.
                    logger.warning("Could not delete proof {}: {}", path, exc)
                setattr(sub, attr, None)

        # 3. Archive the old DailyTask rows.
        await db.execute(
            update(DailyTask)
            .where(DailyTask.id.in_(old_task_ids))
            .values(is_archived=True)
        )

        await db.commit()
        logger.info(
            "Daily reset done: archived {} task(s), deleted {} proof file(s)",
            len(old_task_ids),
            deleted_files,
        )
