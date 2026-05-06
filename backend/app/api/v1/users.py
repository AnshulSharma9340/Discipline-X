from fastapi import APIRouter

from app.api.deps import CurrentUser, DBSession
from app.schemas.user import UserPublic, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.patch("/me", response_model=UserPublic)
async def update_me(
    payload: UserUpdate,
    user: CurrentUser,
    db: DBSession,
) -> UserPublic:
    if payload.name is not None:
        user.name = payload.name
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url
    await db.commit()
    await db.refresh(user)
    return UserPublic.model_validate(user)
