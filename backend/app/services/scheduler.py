"""APScheduler — runs the daily discipline check + daily 3 AM IST reset.

Started on FastAPI startup, shut down cleanly on exit.
"""

from __future__ import annotations

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from loguru import logger

from app.core.config import settings
from app.services.daily_reset import run_daily_reset
from app.services.discipline import run_daily_discipline_check

_scheduler: AsyncIOScheduler | None = None


def start_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler:
        return _scheduler

    _scheduler = AsyncIOScheduler(timezone="UTC")

    # End-of-day discipline check (locks accounts that missed required tasks).
    _scheduler.add_job(
        run_daily_discipline_check,
        CronTrigger(
            hour=settings.DAILY_CUTOFF_HOUR,
            minute=settings.DAILY_CUTOFF_MINUTE,
            timezone="UTC",
        ),
        id="daily_discipline_check",
        replace_existing=True,
        misfire_grace_time=600,
    )

    # Daily reset at 03:00 IST — archives previous days' tasks and frees
    # Supabase Storage by deleting their proof files. Runs after the daily
    # discipline check has already locked anyone who missed yesterday.
    _scheduler.add_job(
        run_daily_reset,
        CronTrigger(hour=3, minute=0, timezone="Asia/Kolkata"),
        id="daily_reset",
        replace_existing=True,
        misfire_grace_time=1800,
    )

    _scheduler.start()
    logger.info(
        "Scheduler started — discipline check at {:02d}:{:02d} UTC, "
        "daily reset at 03:00 IST",
        settings.DAILY_CUTOFF_HOUR,
        settings.DAILY_CUTOFF_MINUTE,
    )
    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Scheduler stopped")
