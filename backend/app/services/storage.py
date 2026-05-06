"""Supabase Storage helpers.

We use the service-role key here (server-side) so we can write into the
private bucket on behalf of the user, then return a signed URL the client
can fetch directly.
"""

from __future__ import annotations

import mimetypes
import uuid
from pathlib import PurePosixPath

from supabase import Client, create_client

from app.core.config import settings

_ALLOWED_MIME = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "application/pdf",
}
_MAX_BYTES = 10 * 1024 * 1024  # 10 MB


def _client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def validate_upload(filename: str, content: bytes) -> str:
    """Return the detected MIME type, or raise ValueError."""
    if len(content) > _MAX_BYTES:
        raise ValueError(f"File too large (max {_MAX_BYTES // (1024*1024)} MB)")
    mime, _ = mimetypes.guess_type(filename)
    if mime not in _ALLOWED_MIME:
        raise ValueError(f"Unsupported file type: {mime or 'unknown'}")
    return mime


def upload_proof(
    user_id: uuid.UUID,
    submission_id: uuid.UUID,
    filename: str,
    content: bytes,
    kind: str = "proof",
) -> str:
    """Upload to Supabase Storage and return the storage path.

    Path format: {user_id}/{submission_id}/{kind}_{uuid}.{ext}
    """
    mime = validate_upload(filename, content)
    ext = PurePosixPath(filename).suffix or mimetypes.guess_extension(mime) or ".bin"
    path = f"{user_id}/{submission_id}/{kind}_{uuid.uuid4().hex}{ext}"

    client = _client()
    client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(
        path=path,
        file=content,
        file_options={"content-type": mime, "upsert": "false"},
    )
    return path


def signed_url(path: str, expires_in: int = 3600) -> str:
    """Return a temporary signed URL for a private storage object."""
    client = _client()
    res = client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).create_signed_url(
        path=path, expires_in=expires_in
    )
    return res.get("signedURL") or res.get("signed_url") or ""


def delete_object(path: str) -> None:
    client = _client()
    client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).remove([path])
