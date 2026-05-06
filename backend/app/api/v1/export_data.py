"""Self-service data export."""

from __future__ import annotations

import csv
import io

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.api.deps import OrgActiveUser, DBSession
from app.models.analytics import DailyAnalytics
from app.models.submission import TaskSubmission
from app.models.task import DailyTask

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/me/json")
async def export_me_json(user: OrgActiveUser, db: DBSession):
    subs = (
        await db.scalars(select(TaskSubmission).where(TaskSubmission.user_id == user.id))
    ).all()
    analytics = (
        await db.scalars(select(DailyAnalytics).where(DailyAnalytics.user_id == user.id))
    ).all()
    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "xp": user.xp,
            "level": user.level,
            "streak": user.streak,
            "longest_streak": user.longest_streak,
        },
        "submissions": [
            {
                "id": str(s.id),
                "task_id": str(s.task_id),
                "status": s.status.value,
                "points_awarded": s.points_awarded,
                "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
                "reviewed_at": s.reviewed_at.isoformat() if s.reviewed_at else None,
                "notes": s.notes,
                "admin_feedback": s.admin_feedback,
            }
            for s in subs
        ],
        "daily_analytics": [
            {
                "date": a.date.isoformat(),
                "tasks_assigned": a.tasks_assigned,
                "tasks_approved": a.tasks_approved,
                "tasks_rejected": a.tasks_rejected,
                "productivity_score": float(a.productivity_score),
                "discipline_score": float(a.discipline_score),
                "focus_score": float(a.focus_score),
                "points_earned": a.points_earned,
            }
            for a in analytics
        ],
    }


@router.get("/me/csv")
async def export_me_csv(user: OrgActiveUser, db: DBSession):
    """Submissions as CSV."""
    rows = (
        await db.execute(
            select(
                TaskSubmission.id,
                TaskSubmission.status,
                TaskSubmission.points_awarded,
                TaskSubmission.submitted_at,
                TaskSubmission.reviewed_at,
                TaskSubmission.notes,
                TaskSubmission.admin_feedback,
                DailyTask.title,
            )
            .join(DailyTask, DailyTask.id == TaskSubmission.task_id, isouter=True)
            .where(TaskSubmission.user_id == user.id)
            .order_by(TaskSubmission.created_at.asc())
        )
    ).all()

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id", "task_title", "status", "points", "submitted_at", "reviewed_at", "notes", "feedback"])
    for r in rows:
        w.writerow(
            [
                str(r.id),
                r.title or "",
                r.status.value,
                r.points_awarded,
                r.submitted_at.isoformat() if r.submitted_at else "",
                r.reviewed_at.isoformat() if r.reviewed_at else "",
                (r.notes or "").replace("\n", " "),
                (r.admin_feedback or "").replace("\n", " "),
            ]
        )

    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="disciplinex-{user.email}.csv"'},
    )
