"""GitHub commit / PR verification using the public REST API.

No OAuth required. We accept a public commit URL or "owner/repo@sha" and
return verified metadata. Anonymous rate limit is 60 req/hour per IP —
fine for our scale.
"""

from __future__ import annotations

import re
from typing import Any

import httpx
from loguru import logger

# Matches:
#   https://github.com/{owner}/{repo}/commit/{sha}
#   https://github.com/{owner}/{repo}/pull/{n}/commits/{sha}
#   https://github.com/{owner}/{repo}/pull/{n}
COMMIT_RE = re.compile(
    r"github\.com/(?P<owner>[\w.-]+)/(?P<repo>[\w.-]+)/(?:commit|pull/\d+/commits)/(?P<sha>[0-9a-f]{6,40})",
    re.IGNORECASE,
)
PR_RE = re.compile(
    r"github\.com/(?P<owner>[\w.-]+)/(?P<repo>[\w.-]+)/pull/(?P<num>\d+)",
    re.IGNORECASE,
)


def parse_commit_url(url: str) -> tuple[str, str, str] | None:
    m = COMMIT_RE.search(url)
    if m:
        return m.group("owner"), m.group("repo"), m.group("sha")
    return None


def parse_pr_url(url: str) -> tuple[str, str, int] | None:
    m = PR_RE.search(url)
    if m:
        return m.group("owner"), m.group("repo"), int(m.group("num"))
    return None


async def verify_commit(url: str) -> dict[str, Any]:
    """Hit GitHub's public commit endpoint and return summary.

    Returns dict with verified bool + metadata. Never raises.
    """
    parsed = parse_commit_url(url)
    if parsed:
        owner, repo, sha = parsed
        return await _fetch_commit(owner, repo, sha, source_url=url)

    pr = parse_pr_url(url)
    if pr:
        owner, repo, num = pr
        return await _fetch_pr(owner, repo, num, source_url=url)

    return {
        "verified": False,
        "error": "Not a recognized GitHub URL. Paste a /commit/<sha> or /pull/<n> link.",
        "source_url": url,
    }


async def _fetch_commit(owner: str, repo: str, sha: str, *, source_url: str) -> dict[str, Any]:
    api = f"https://api.github.com/repos/{owner}/{repo}/commits/{sha}"
    try:
        async with httpx.AsyncClient(timeout=15, headers={"Accept": "application/vnd.github+json"}) as c:
            r = await c.get(api)
            if r.status_code == 404:
                return {"verified": False, "error": "Commit not found (private repo or wrong SHA)", "source_url": source_url}
            if r.status_code == 403:
                return {"verified": False, "error": "GitHub rate-limited. Try again in a minute.", "source_url": source_url}
            if r.status_code >= 400:
                return {"verified": False, "error": f"GitHub returned {r.status_code}", "source_url": source_url}
            data = r.json()
    except Exception as e:
        logger.warning("GitHub fetch failed: {}", e)
        return {"verified": False, "error": "Network error reaching GitHub", "source_url": source_url}

    commit = data.get("commit", {})
    stats = data.get("stats", {})
    author = commit.get("author", {})
    files = data.get("files", []) or []

    return {
        "verified": True,
        "kind": "commit",
        "owner": owner,
        "repo": repo,
        "sha": data.get("sha", sha)[:12],
        "message": (commit.get("message") or "").split("\n")[0][:200],
        "author_name": author.get("name", ""),
        "author_email": author.get("email", ""),
        "author_date": author.get("date"),
        "additions": int(stats.get("additions") or 0),
        "deletions": int(stats.get("deletions") or 0),
        "files_changed": len(files),
        "source_url": source_url,
        "html_url": data.get("html_url", source_url),
    }


async def _fetch_pr(owner: str, repo: str, num: int, *, source_url: str) -> dict[str, Any]:
    api = f"https://api.github.com/repos/{owner}/{repo}/pulls/{num}"
    try:
        async with httpx.AsyncClient(timeout=15, headers={"Accept": "application/vnd.github+json"}) as c:
            r = await c.get(api)
            if r.status_code >= 400:
                return {"verified": False, "error": f"GitHub returned {r.status_code}", "source_url": source_url}
            data = r.json()
    except Exception as e:
        logger.warning("GitHub fetch failed: {}", e)
        return {"verified": False, "error": "Network error reaching GitHub", "source_url": source_url}

    return {
        "verified": True,
        "kind": "pull_request",
        "owner": owner,
        "repo": repo,
        "number": num,
        "title": data.get("title", "")[:200],
        "state": data.get("state"),
        "merged": bool(data.get("merged")),
        "author_name": (data.get("user") or {}).get("login", ""),
        "additions": int(data.get("additions") or 0),
        "deletions": int(data.get("deletions") or 0),
        "files_changed": int(data.get("changed_files") or 0),
        "source_url": source_url,
        "html_url": data.get("html_url", source_url),
    }
