from pydantic import BaseModel

from app.schemas.user import UserPublic


class MeResponse(BaseModel):
    user: UserPublic
