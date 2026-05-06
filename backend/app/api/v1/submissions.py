"""Submission endpoints.

User: create / submit-with-proof / list mine.
Admin: list pending, get one with signed proof URL, approve/reject.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import and_, select
from sqlalchemy.orm import selectinload

from app.api.deps import DBSession, OrgActiveUser, OrgModerator
from app.models.submission import ProofType, SubmissionStatus, TaskSubmission
from app.models.task import DailyTask
from app.models.user import User
from app.schemas.submission import SubmissionPublic, SubmissionReview
from app.services import storage
from app.services.analytics import upsert_daily_for_user
from app.services.badges import evaluate_time_of_day, evaluate_user, level_from_xp
from app.services.duplicate_detect import find_duplicate, perceptual_hash
from app.services.realtime import emit_admins, emit_global, emit_to_user
from app.services.scoring import award_points_on_approve, recompute_streak

router = APIRouter(prefix="/submissions", tags=["submissions"])


async def _get_or_create_submission(
    db: DBSession, user: User, task_id: uuid.UUID
) -> TaskSubmission:
    task = await db.get(DailyTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    existing = await db.scalar(
        select(TaskSubmission).where(
            and_(TaskSubmission.user_id == user.id, TaskSubmission.task_id == task_id)
        )
    )
    if existing:
        return existing

    sub = TaskSubmission(user_id=user.id, task_id=task_id, status=SubmissionStatus.ASSIGNED)
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return sub


# ---------- User ----------


@router.post("/", response_model=SubmissionPublic, status_code=status.HTTP_201_CREATED)
async def submit_proof(
    user: OrgActiveUser,
    db: DBSession,
    task_id: Annotated[uuid.UUID, Form()],
    proof_type: Annotated[ProofType | None, Form()] = None,
    notes: Annotated[str, Form()] = "",
    proof_url: Annotated[str | None, Form()] = None,
    file: UploadFile | None = File(default=None),
) -> SubmissionPublic:
    """Submit proof for a task. Accepts file upload (image/pdf) and/or URL (e.g. GitHub link)."""
    sub = await _get_or_create_submission(db, user, task_id)

    if sub.status in (SubmissionStatus.APPROVED,):
        raise HTTPException(status_code=409, detail="Submission already approved")

    if file is not None:
        content = await file.read()
        try:
            path = storage.upload_proof(user.id, sub.id, file.filename or "upload", content)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

        if (proof_type or ProofType.IMAGE) == ProofType.PDF:
            sub.proof_pdf_path = path
        elif (proof_type or ProofType.IMAGE) == ProofType.STOPWATCH:
            sub.stopwatch_image_path = path
        else:
            sub.proof_image_path = path

        # Anti-cheat: perceptual hash + duplicate scan against user's past proofs
        try:
            phash = perceptual_hash(content)
            sub.proof_hash = phash
            existing = (
                await db.scalars(
                    select(TaskSubmission.proof_hash).where(
                        TaskSubmission.user_id == user.id,
                        TaskSubmission.id != sub.id,
                        TaskSubmission.proof_hash.is_not(None),
                    )
                )
            ).all()
            dup = find_duplicate(phash, existing)
            sub.is_duplicate_proof = bool(dup)
        except Exception:
            pass

    if proof_url:
        sub.proof_url = proof_url
    if proof_type:
        sub.proof_type = proof_type
    sub.notes = notes
    sub.status = SubmissionStatus.SUBMITTED
    sub.submitted_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(sub)

    await emit_admins(
        "submission:new",
        {"submission_id": str(sub.id), "user_id": str(user.id), "task_id": str(task_id)},
    )
    return SubmissionPublic.model_validate(sub)


@router.get("/mine", response_model=list[SubmissionPublic])
async def my_submissions(
    user: OrgActiveUser,
    db: DBSession,
    limit: int = Query(50, ge=1, le=200),
) -> list[SubmissionPublic]:
    rows = (
        await db.scalars(
            select(TaskSubmission)
            .where(TaskSubmission.user_id == user.id)
            .order_by(TaskSubmission.created_at.desc())
            .limit(limit)
        )
    ).all()
    return [SubmissionPublic.model_validate(r) for r in rows]


# ---------- Admin ----------


@router.get("/", response_model=list[dict])
async def list_submissions(
    mod: OrgModerator,
    db: DBSession,
    status_filter: SubmissionStatus | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> list[dict]:
    """Org-scoped review queue: only submissions for tasks in the moderator's org."""
    stmt = (
        select(TaskSubmission)
        .join(DailyTask, DailyTask.id == TaskSubmission.task_id)
        .where(DailyTask.org_id == mod.org_id)
        .options(selectinload(TaskSubmission.task), selectinload(TaskSubmission.user))
        .order_by(TaskSubmission.submitted_at.desc().nullslast(), TaskSubmission.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if status_filter:
        stmt = stmt.where(TaskSubmission.status == status_filter)
    rows = (await db.scalars(stmt)).all()

    out: list[dict] = []
    for s in rows:
        proof_url = None
        path = s.proof_image_path or s.proof_pdf_path or s.stopwatch_image_path
        if path:
            try:
                proof_url = storage.signed_url(path, expires_in=600)
            except Exception:
                proof_url = None
        out.append(
            {
                "submission": SubmissionPublic.model_validate(s).model_dump(mode="json"),
                "task_title": s.task.title if s.task else None,
                "user_name": s.user.name if s.user else None,
                "user_email": s.user.email if s.user else None,
                "proof_signed_url": proof_url,
                "external_url": s.proof_url,
            }
        )
    return out


@router.post("/{submission_id}/review", response_model=SubmissionPublic)
async def review_submission(
    submission_id: uuid.UUID,
    payload: SubmissionReview,
    mod: OrgModerator,
    db: DBSession,
) -> SubmissionPublic:
    sub = await db.scalar(
        select(TaskSubmission)
        .where(TaskSubmission.id == submission_id)
        .options(selectinload(TaskSubmission.task), selectinload(TaskSubmission.user))
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub.task and sub.task.org_id != mod.org_id:
        raise HTTPException(status_code=404, detail="Submission not in your organization")

    sub.admin_feedback = payload.feedback
    sub.reviewed_at = datetime.now(timezone.utc)
    sub.reviewed_by = mod.id

    new_badges: list[str] = []
    if payload.approve:
        sub.status = SubmissionStatus.APPROVED
        if sub.task and sub.user:
            await award_points_on_approve(db, sub.user, sub, sub.task)
            await recompute_streak(db, sub.user)
            sub.user.level = level_from_xp(sub.user.xp)
            # Refresh today's analytics rollup so charts update immediately
            await upsert_daily_for_user(db, sub.user.id, datetime.now(timezone.utc).date())
            # Re-evaluate badges
            new_badges = await evaluate_user(db, sub.user)
            if sub.submitted_at:
                tod_badges = await evaluate_time_of_day(db, sub.user, sub.submitted_at.hour)
                new_badges.extend(tod_badges)
    else:
        sub.status = SubmissionStatus.REJECTED

    await db.commit()
    await db.refresh(sub)

    await emit_to_user(
        str(sub.user_id),
        "submission:reviewed",
        {
            "submission_id": str(sub.id),
            "status": sub.status.value,
            "feedback": sub.admin_feedback,
            "points": sub.points_awarded,
            "new_badges": new_badges,
        },
    )
    if payload.approve:
        await emit_global("leaderboard:dirty", {"user_id": str(sub.user_id)})
    return SubmissionPublic.model_validate(sub)
