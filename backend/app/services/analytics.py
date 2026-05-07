"""Analytics — pandas-powered rollups + ranking queries."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any

import pandas as pd
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import DailyAnalytics
from app.models.submission import SubmissionStatus, TaskSubmission
from app.models.task import DailyTask
from app.models.user import User


async def upsert_daily_for_user(db: AsyncSession, user_id: uuid.UUID, day: date) -> DailyAnalytics:
    """Compute and upsert one user's daily analytics row."""
    day_start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    stmt = (
        select(
            func.count(TaskSubmission.id).label("total"),
            func.sum(
                (TaskSubmission.status == SubmissionStatus.SUBMITTED).cast(__import__("sqlalchemy").Integer)
            ).label("submitted"),
            func.sum(
                (TaskSubmission.status == SubmissionStatus.APPROVED).cast(__import__("sqlalchemy").Integer)
            ).label("approved"),
            func.sum(
                (TaskSubmission.status == SubmissionStatus.REJECTED).cast(__import__("sqlalchemy").Integer)
            ).label("rejected"),
            func.coalesce(func.sum(TaskSubmission.points_awarded), 0).label("points"),
        )
        .select_from(TaskSubmission)
        .join(DailyTask, DailyTask.id == TaskSubmission.task_id)
        .where(
            and_(
                TaskSubmission.user_id == user_id,
                DailyTask.task_date >= day_start,
                DailyTask.task_date < day_end,
            )
        )
    )
    row = (await db.execute(stmt)).one()

    assigned_total = (
        await db.scalar(
            select(func.count())
            .select_from(DailyTask)
            .where(
                DailyTask.is_archived.is_(False),
                DailyTask.task_date >= day_start,
                DailyTask.task_date < day_end,
            )
        )
    ) or 0

    completion = (row.approved or 0) / assigned_total if assigned_total else 0
    discipline = round(completion * 100, 2)
    productivity = float(row.points or 0)
    rejection_rate = (row.rejected or 0) / max(1, (row.submitted or 0) + (row.approved or 0))
    focus = max(0.0, round(100 * (1 - rejection_rate), 2)) if (row.submitted or row.approved) else 0.0

    existing = await db.scalar(
        select(DailyAnalytics).where(
            and_(DailyAnalytics.user_id == user_id, DailyAnalytics.date == day)
        )
    )
    if existing:
        existing.tasks_assigned = assigned_total
        existing.tasks_submitted = int(row.submitted or 0)
        existing.tasks_approved = int(row.approved or 0)
        existing.tasks_rejected = int(row.rejected or 0)
        existing.productivity_score = productivity
        existing.discipline_score = discipline
        existing.focus_score = focus
        existing.points_earned = int(row.points or 0)
        await db.commit()
        await db.refresh(existing)
        return existing

    rec = DailyAnalytics(
        user_id=user_id,
        date=day,
        tasks_assigned=assigned_total,
        tasks_submitted=int(row.submitted or 0),
        tasks_approved=int(row.approved or 0),
        tasks_rejected=int(row.rejected or 0),
        productivity_score=productivity,
        discipline_score=discipline,
        focus_score=focus,
        points_earned=int(row.points or 0),
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return rec


async def user_history(
    db: AsyncSession, user_id: uuid.UUID, days: int = 30
) -> list[dict[str, Any]]:
    """Return last N days of analytics, padded with zeros for missing days."""
    since = date.today() - timedelta(days=days - 1)
    rows = (
        await db.scalars(
            select(DailyAnalytics)
            .where(DailyAnalytics.user_id == user_id, DailyAnalytics.date >= since)
            .order_by(DailyAnalytics.date.asc())
        )
    ).all()

    df = pd.DataFrame(
        [
            {
                "date": r.date,
                "productivity": float(r.productivity_score),
                "discipline": float(r.discipline_score),
                "focus": float(r.focus_score),
                "approved": r.tasks_approved,
                "submitted": r.tasks_submitted,
                "rejected": r.tasks_rejected,
                "points": r.points_earned,
            }
            for r in rows
        ]
    )

    full_index = pd.date_range(since, date.today(), freq="D")
    if df.empty:
        df = pd.DataFrame(index=full_index, columns=[
            "productivity", "discipline", "focus", "approved", "submitted", "rejected", "points"
        ]).fillna(0)
    else:
        df["date"] = pd.to_datetime(df["date"])
        df = df.set_index("date").reindex(full_index, fill_value=0)
    df.index.name = "date"
    df = df.reset_index()
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")
    return df.to_dict(orient="records")


async def heatmap(db: AsyncSession, user_id: uuid.UUID, days: int = 84) -> list[dict[str, Any]]:
    """Days × intensity, suitable for a calendar heatmap."""
    since = date.today() - timedelta(days=days - 1)
    rows = (
        await db.scalars(
            select(DailyAnalytics)
            .where(DailyAnalytics.user_id == user_id, DailyAnalytics.date >= since)
        )
    ).all()
    by_date = {r.date.isoformat(): float(r.discipline_score) for r in rows}
    out: list[dict] = []
    for i in range(days):
        d = (since + timedelta(days=i)).isoformat()
        out.append({"date": d, "value": by_date.get(d, 0.0)})
    return out


async def leaderboard(
    db: AsyncSession,
    period: str = "all",
    limit: int = 50,
    org_id: uuid.UUID | None = None,
) -> list[dict[str, Any]]:
    """Rank users by composite score, optionally scoped to an org."""
    def _row_from_user(i: int, u: User) -> dict:
        return {
            "rank": i + 1,
            "user_id": str(u.id),
            "name": u.name or u.email.split("@")[0],
            "avatar_url": u.avatar_url,
            "discipline_score": u.discipline_score,
            "productivity_score": u.productivity_score,
            "xp": u.xp,
            "streak": u.streak,
            "level": u.level,
            "active_title": u.active_title,
            "active_frame": u.active_frame,
            "theme": u.theme,
        }

    if period == "streak":
        stmt = (
            select(User)
            .where(User.is_active.is_(True))
            .order_by(User.streak.desc(), User.longest_streak.desc(), User.xp.desc())
            .limit(limit)
        )
        if org_id:
            stmt = stmt.where(User.org_id == org_id)
        rows = (await db.scalars(stmt)).all()
        return [_row_from_user(i, u) for i, u in enumerate(rows)]

    if period == "all":
        stmt = (
            select(User)
            .where(User.is_active.is_(True))
            .order_by(User.xp.desc(), User.discipline_score.desc(), User.streak.desc())
            .limit(limit)
        )
        if org_id:
            stmt = stmt.where(User.org_id == org_id)
        rows = (await db.scalars(stmt)).all()
        return [_row_from_user(i, u) for i, u in enumerate(rows)]

    # period-bucketed by points
    days_map = {"daily": 1, "weekly": 7, "monthly": 30}
    days = days_map.get(period, 1)
    since = date.today() - timedelta(days=days - 1)

    stmt = (
        select(
            User.id,
            User.name,
            User.email,
            User.avatar_url,
            User.streak,
            User.discipline_score,
            User.productivity_score,
            User.xp,
            User.level,
            User.active_title,
            User.active_frame,
            User.theme,
            func.coalesce(func.sum(DailyAnalytics.points_earned), 0).label("period_points"),
        )
        .join(DailyAnalytics, DailyAnalytics.user_id == User.id, isouter=True)
        .where(User.is_active.is_(True))
        .where((DailyAnalytics.date >= since) | (DailyAnalytics.date.is_(None)))
        .group_by(User.id)
        .order_by(func.coalesce(func.sum(DailyAnalytics.points_earned), 0).desc(), User.xp.desc())
        .limit(limit)
    )
    if org_id:
        stmt = stmt.where(User.org_id == org_id)
    rows = (await db.execute(stmt)).all()
    return [
        {
            "rank": i + 1,
            "user_id": str(r.id),
            "name": r.name or r.email.split("@")[0],
            "avatar_url": r.avatar_url,
            "discipline_score": int(r.discipline_score),
            "productivity_score": int(r.productivity_score),
            "xp": int(r.xp),
            "streak": int(r.streak),
            "level": int(r.level or 1),
            "active_title": r.active_title or "",
            "active_frame": r.active_frame or "",
            "theme": r.theme or "violet",
            "period_points": int(r.period_points),
        }
        for i, r in enumerate(rows)
    ]


async def admin_overview(db: AsyncSession, org_id: uuid.UUID | None = None) -> dict[str, Any]:
    user_filter = [User.org_id == org_id] if org_id else []
    total_users = await db.scalar(
        select(func.count()).select_from(User).where(*user_filter)
    ) or 0
    locked = await db.scalar(
        select(func.count())
        .select_from(User)
        .where(User.access_status == "locked", *user_filter)
    ) or 0

    from app.models.task import DailyTask  # local import to avoid circular
    sub_filter = []
    if org_id:
        sub_filter.append(DailyTask.org_id == org_id)
    pending_stmt = (
        select(func.count())
        .select_from(TaskSubmission)
        .join(DailyTask, DailyTask.id == TaskSubmission.task_id)
        .where(TaskSubmission.status == SubmissionStatus.SUBMITTED, *sub_filter)
    )
    pending = await db.scalar(pending_stmt) or 0

    avg_disc = await db.scalar(
        select(func.avg(User.discipline_score)).where(*user_filter)
    ) or 0

    today = date.today()
    today_start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
    submissions_today = await db.scalar(
        select(func.count())
        .select_from(TaskSubmission)
        .join(DailyTask, DailyTask.id == TaskSubmission.task_id)
        .where(TaskSubmission.created_at >= today_start, *sub_filter)
    ) or 0

    return {
        "total_users": int(total_users),
        "locked_users": int(locked),
        "pending_submissions": int(pending),
        "avg_discipline": float(round(avg_disc, 2)),
        "submissions_today": int(submissions_today),
    }
