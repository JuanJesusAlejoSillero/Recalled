"""Security utility helpers."""

import re


def sanitize_string(value: str | None) -> str | None:
    """Strip, remove HTML tags and clean a string value."""
    if value is None:
        return None
    # Remove HTML tags
    clean = re.sub(r"<[^>]+>", "", value)
    return clean.strip()
