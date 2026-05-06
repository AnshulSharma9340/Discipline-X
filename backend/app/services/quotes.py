"""Daily motivational quote.

Cached per-day so all users see the same quote and we don't hammer Groq.
"""

from __future__ import annotations

import random
from datetime import date

from app.services import groq_client

_LOCAL_QUOTES = [
    ("Discipline equals freedom.", "Jocko Willink"),
    ("Don't count the days. Make the days count.", "Muhammad Ali"),
    ("The body achieves what the mind believes.", "Napoleon Hill"),
    ("You don't rise to the level of your goals. You fall to the level of your systems.", "James Clear"),
    ("Hard work beats talent when talent doesn't work hard.", "Tim Notke"),
    ("The pain you feel today will be the strength you feel tomorrow.", "Anonymous"),
    ("If you're going through hell, keep going.", "Winston Churchill"),
    ("Success is the sum of small efforts repeated day in and day out.", "Robert Collier"),
    ("Don't wish it were easier. Wish you were better.", "Jim Rohn"),
    ("Discipline is the bridge between goals and accomplishment.", "Jim Rohn"),
    ("Action is the foundational key to all success.", "Pablo Picasso"),
    ("Small daily improvements over time lead to stunning results.", "Robin Sharma"),
    ("You're never going to feel like it. Do it anyway.", "Anonymous"),
    ("The successful warrior is the average man, with laser-like focus.", "Bruce Lee"),
    ("Do something today that your future self will thank you for.", "Sean Patrick Flanery"),
]

_cache: dict[date, dict] = {}


async def daily_quote() -> dict:
    today = date.today()
    if today in _cache:
        return _cache[today]

    quote = await _groq_quote()
    if not quote:
        text, author = random.choice(_LOCAL_QUOTES)
        quote = {"text": text, "author": author, "source": "local"}

    _cache[today] = quote
    # Simple eviction: keep last 7 days
    if len(_cache) > 7:
        oldest = min(_cache.keys())
        del _cache[oldest]
    return quote


async def _groq_quote() -> dict | None:
    res = await groq_client.chat_json(
        [
            {
                "role": "system",
                "content": "You generate one motivational quote about discipline, focus, or daily action. Always return strict JSON.",
            },
            {
                "role": "user",
                "content": (
                    "Give me one short, punchy motivational quote (under 200 chars) about discipline "
                    "or daily action. Original or attributed. Return JSON: "
                    '{"text": "<quote>", "author": "<author or Anonymous>"}'
                ),
            },
        ],
        max_tokens=200,
    )
    if not res or not isinstance(res, dict):
        return None
    return {
        "text": str(res.get("text", "")).strip(),
        "author": str(res.get("author", "Anonymous")).strip(),
        "source": "groq",
    }
