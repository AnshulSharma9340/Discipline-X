"""APScheduler — runs the daily discipline check.

Started on FastAPI startup, shut down cleanly on exit.
"""

from __future__ import annotations

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from loguru import logger

from app.core.config import settings
from app.services.discipline import run_daily_discipline_check

_scheduler: AsyncIOScheduler | None = None


def start_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler:
        return _scheduler

    _scheduler = AsyncIOScheduler(timezone="UTC")
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
    _scheduler.start()
    logger.info(
        "Scheduler started — daily discipline check at {:02d}:{:02d} UTC",
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
