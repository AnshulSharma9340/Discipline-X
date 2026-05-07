from fastapi import APIRouter

from app.api.v1 import (
    ai,
    ai_extra,
    analytics,
    auth,
    badges,
    buddy,
    chat,
    dev,
    emergency,
    export_data,
    github,
    habits,
    leaderboard,
    organizations,
    profile,
    reactions,
    reflections,
    shop,
    squads,
    submissions,
    tasks,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(organizations.router)
api_router.include_router(users.router)
api_router.include_router(tasks.router)
api_router.include_router(submissions.router)
api_router.include_router(emergency.router)
api_router.include_router(analytics.router)
api_router.include_router(leaderboard.router)
api_router.include_router(ai.router)
api_router.include_router(habits.router)
api_router.include_router(badges.router)
api_router.include_router(reflections.router)
api_router.include_router(reactions.router)
api_router.include_router(profile.router)
api_router.include_router(shop.router)
api_router.include_router(ai_extra.router)
api_router.include_router(export_data.router)
api_router.include_router(dev.router)
api_router.include_router(squads.router)
api_router.include_router(buddy.router)
api_router.include_router(github.router)
api_router.include_router(chat.router)
