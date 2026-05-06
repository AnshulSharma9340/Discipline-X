"""Personalized behavioral nudges.

Uses Groq when GROQ_API_KEY is set, falls back to local templates otherwise.
"""

from __future__ import annotations

import random
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.services import groq_client
from app.services.ai.insights import burnout_risk, procrastination_index


async def generate_nudge(db: AsyncSession, user_id: uuid.UUID, name: str) -> dict:
    burn = await burnout_risk(db, user_id)
    proc = await procrastination_index(db, user_id)

    groq_msg = await _groq_nudge(name, burn, proc)
    if groq_msg:
        tone = (
            "warning"
            if burn["signal"] in ("high", "elevated")
            or proc["signal"] in ("chronic", "frequent")
            else "positive"
        )
        return {
            "tone": tone,
            "headline": groq_msg.get("headline", "Stay locked in."),
            "body": groq_msg.get("body", ""),
            "burnout": burn,
            "procrastination": proc,
            "source": "groq",
        }

    return _local_nudge(name, burn, proc)


async def _groq_nudge(name: str, burn: dict, proc: dict) -> dict | None:
    prompt = f"""You are a brutally honest productivity coach for an app called DisciplineX.
The user "{name}" has these signals:
- Burnout risk: {burn['score']}/100 ({burn['signal']})
- Procrastination index: {proc['score']}/100 ({proc['signal']})
- Burnout factors: {burn.get('factors', {})}
- Procrastination factors: {proc.get('factors', {})}

Write a direct, motivating message (2 sentences max). Be specific about what to do today.
Skip generic advice. No emojis in the body.

Return strict JSON:
{{"headline": "<short bold headline, under 60 chars>", "body": "<2 sentences, under 280 chars>"}}"""

    res = await groq_client.chat_json(
        [
            {
                "role": "system",
                "content": "You are a no-nonsense productivity coach. Always reply in valid JSON.",
            },
            {"role": "user", "content": prompt},
        ],
        max_tokens=300,
    )
    return res if isinstance(res, dict) else None


def _local_nudge(name: str, burn: dict, proc: dict) -> dict:
    msgs: list[tuple[str, str, str]] = []

    if burn["signal"] in ("high", "elevated"):
        msgs.append(
            (
                "warning",
                "You're showing burnout signals.",
                "Output is grinding without quality — focus dropping, rejection rate climbing. "
                "Sleep, eat, walk. Ship one easy task and call it.",
            )
        )

    if proc["signal"] in ("chronic", "frequent"):
        f = proc["factors"]
        msgs.append(
            (
                "warning",
                f"You're submitting at {f.get('avg_submit_hour', 0):.0f}:00 on average.",
                "That's late. Try shipping your first task before noon tomorrow — early wins compound.",
            )
        )

    if burn["signal"] == "calm" and proc["signal"] == "on_track":
        msgs.append(
            (
                "positive",
                f"{name}, you're locked in.",
                "Burnout calm, procrastination on track. This is the rhythm — protect it.",
            )
        )

    if not msgs:
        msgs.append(
            (
                "neutral",
                "Build a baseline.",
                "Ship daily for a full week and the AI coach will start tailoring to you.",
            )
        )

    tone, headline, body = random.choice(msgs)
    return {
        "tone": tone,
        "headline": headline,
        "body": body,
        "burnout": burn,
        "procrastination": proc,
        "source": "local",
    }
