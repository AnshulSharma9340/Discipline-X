"""Reactions on submissions."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import and_, func, select

from app.api.deps import OrgActiveUser, DBSession
from app.models.reaction import SubmissionReaction
from app.models.submission import TaskSubmission

router = APIRouter(prefix="/reactions", tags=["reactions"])

ALLOWED_EMOJI = {"🔥", "👏", "💪", "🚀", "🧠", "💎"}


class ReactPayload(BaseModel):
    emoji: str


@router.post("/submission/{submission_id}")
async def react(submission_id: uuid.UUID, payload: ReactPayload, user: OrgActiveUser, db: DBSession):
    if payload.emoji not in ALLOWED_EMOJI:
        raise HTTPException(400, f"Allowed: {' '.join(ALLOWED_EMOJI)}")
    sub = await db.get(TaskSubmission, submission_id)
    if not sub:
        raise HTTPException(404, "Submission not found")

    existing = await db.scalar(
        select(SubmissionReaction).where(
            and_(
                SubmissionReaction.submission_id == submission_id,
                SubmissionReaction.user_id == user.id,
                SubmissionReaction.emoji == payload.emoji,
            )
        )
    )
    if existing:
        await db.delete(existing)
        await db.commit()
        return {"toggled": "off"}

    db.add(
        SubmissionReaction(
            submission_id=submission_id, user_id=user.id, emoji=payload.emoji
        )
    )
    await db.commit()
    return {"toggled": "on"}


@router.get("/submission/{submission_id}")
async def list_reactions(submission_id: uuid.UUID, db: DBSession):
    rows = (
        await db.execute(
            select(SubmissionReaction.emoji, func.count())
            .where(SubmissionReaction.submission_id == submission_id)
            .group_by(SubmissionReaction.emoji)
        )
    ).all()
    return [{"emoji": r[0], "count": int(r[1])} for r in rows]


@router.get("/feed")
async def feed(user: OrgActiveUser, db: DBSession, limit: int = 20):
    """Recent wins — most-reacted approved submissions."""
    _ = user
    from app.models.submission import SubmissionStatus

    rows = (
        await db.execute(
            select(
                TaskSubmission.id,
                TaskSubmission.user_id,
                TaskSubmission.task_id,
                TaskSubmission.points_awarded,
                TaskSubmission.reviewed_at,
                func.count(SubmissionReaction.id).label("reaction_count"),
            )
            .join(SubmissionReaction, SubmissionReaction.submission_id == TaskSubmission.id, isouter=True)
            .where(TaskSubmission.status == SubmissionStatus.APPROVED)
            .group_by(TaskSubmission.id)
            .order_by(TaskSubmission.reviewed_at.desc().nullslast())
            .limit(limit)
        )
    ).all()
    return [
        {
            "submission_id": str(r.id),
            "user_id": str(r.user_id),
            "task_id": str(r.task_id),
            "points": int(r.points_awarded),
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "reaction_count": int(r.reaction_count or 0),
        }
        for r in rows
    ]
