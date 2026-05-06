"""GitHub commit / PR verification — public API only, no OAuth."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.api.deps import OrgActiveUser
from app.services import github_verify

router = APIRouter(prefix="/github", tags=["github"])


class VerifyRequest(BaseModel):
    url: str = Field(..., min_length=10, max_length=500)


@router.post("/verify")
async def verify(payload: VerifyRequest, user: OrgActiveUser):
    _ = user
    return await github_verify.verify_commit(payload.url)
