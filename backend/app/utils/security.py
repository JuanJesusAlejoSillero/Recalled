"""Security utility helpers."""

import hashlib
from datetime import timezone
import re

from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    set_access_cookies,
    set_refresh_cookies,
    unset_jwt_cookies,
)


def sanitize_string(value: str | None) -> str | None:
    """Strip, remove HTML tags and clean a string value."""
    if value is None:
        return None
    clean = re.sub(r"<[^>]+>", "", value)
    return clean.strip()


def get_user_state_marker(user) -> str:
    """Return a stable marker for the user's current auth-relevant state."""
    totp_secret = user.totp_secret if user.totp_enabled else ""
    state_blob = "|".join([
        str(user.id),
        user.username or "",
        user.password_hash or "",
        "1" if user.is_admin else "0",
        "1" if user.totp_enabled else "0",
        totp_secret or "",
    ])
    return hashlib.sha256(state_blob.encode("utf-8")).hexdigest()


def build_token_claims(user, purpose: str | None = None) -> dict:
    """Build JWT claims tied to the user's current auth-relevant state."""
    claims = {"user_state": get_user_state_marker(user)}
    if purpose:
        claims["purpose"] = purpose
    return claims


def set_auth_cookies(response, user, include_refresh: bool = True):
    """Attach fresh JWT cookies for the given user to the response."""
    claims = build_token_claims(user)
    access_token = create_access_token(identity=str(user.id), additional_claims=claims)
    set_access_cookies(response, access_token)
    if include_refresh:
        refresh_token = create_refresh_token(identity=str(user.id), additional_claims=claims)
        set_refresh_cookies(response, refresh_token)
    return response


def clear_auth_cookies(response):
    """Clear any JWT and CSRF cookies from the response."""
    unset_jwt_cookies(response)
    return response


def _legacy_state_timestamp(user) -> int:
    """Return the legacy timestamp marker used by older deployed tokens."""
    state_dt = user.updated_at or user.created_at
    if state_dt is None:
        return 0
    if state_dt.tzinfo is None:
        state_dt = state_dt.replace(tzinfo=timezone.utc)
    else:
        state_dt = state_dt.astimezone(timezone.utc)
    return int(state_dt.timestamp())


def token_matches_user_state(jwt_payload: dict, user) -> bool:
    """Check whether a JWT still matches the current user state.

    New tokens carry a hash-based state marker. Older tokens fall back to the
    standard ``iat`` claim so pre-migration sessions are still invalidated after
    later account changes in most cases.
    """
    current_marker = get_user_state_marker(user)
    token_marker = jwt_payload.get("user_state")

    if token_marker is not None:
        return str(token_marker) == current_marker

    issued_at = jwt_payload.get("iat")
    if issued_at is None:
        return False

    try:
        return int(issued_at) >= _legacy_state_timestamp(user)
    except (TypeError, ValueError):
        return False
