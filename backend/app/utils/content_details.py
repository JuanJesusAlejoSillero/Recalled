"""Helpers for per-content-type metadata fields."""

from marshmallow import ValidationError

from app.utils.security import sanitize_string


CONTENT_DETAILS_SPECS = {
    "place": {},
    "movie": {
        "director": {"type": "text", "max_length": 120},
        "release_year": {"type": "integer", "min": 1, "max": 2100},
        "genre": {"type": "text", "max_length": 80},
        "duration_minutes": {"type": "integer", "min": 1, "max": 1000},
        "country": {"type": "text", "max_length": 80},
    },
    "series": {
        "creator": {"type": "text", "max_length": 120},
        "start_year": {"type": "integer", "min": 1, "max": 2100},
        "end_year": {"type": "integer", "min": 1, "max": 2100},
        "seasons": {"type": "integer", "min": 1, "max": 200},
        "genre": {"type": "text", "max_length": 80},
    },
    "book": {
        "author": {"type": "text", "max_length": 120},
        "publication_year": {"type": "integer", "min": 1, "max": 2100},
        "genre": {"type": "text", "max_length": 80},
        "pages": {"type": "integer", "min": 1, "max": 200000},
        "publisher": {"type": "text", "max_length": 120},
    },
    "videogame": {
        "developer": {"type": "text", "max_length": 120},
        "release_year": {"type": "integer", "min": 1, "max": 2100},
        "platform": {"type": "text", "max_length": 80},
        "genre": {"type": "text", "max_length": 80},
        "publisher": {"type": "text", "max_length": 120},
    },
    "person": {
        "occupation": {"type": "text", "max_length": 120},
        "birth_year": {"type": "integer", "min": 1, "max": 2100},
        "death_year": {"type": "integer", "min": 1, "max": 2100},
        "nationality": {"type": "text", "max_length": 80},
        "known_for": {"type": "text", "max_length": 200},
        "notes": {"type": "text", "max_length": 2000},
    },
}


def get_content_details_spec(content_type):
    """Return the metadata spec for a content type."""
    normalized = str(content_type or "place").strip().lower()
    return CONTENT_DETAILS_SPECS.get(normalized, {})


def normalize_content_details(content_type, raw_details, *, field_name="details"):
    """Validate and normalize module-specific metadata."""
    if raw_details in (None, ""):
        return {}

    if not isinstance(raw_details, dict):
        raise ValidationError({field_name: ["Must be an object"]})

    spec = get_content_details_spec(content_type)
    normalized = {}
    field_errors = {}

    for key in raw_details:
        if key not in spec:
            field_errors[key] = ["Unsupported field for this content type"]

    for key, rule in spec.items():
        if key not in raw_details:
            continue

        value = raw_details.get(key)
        if value in (None, ""):
            continue

        if rule["type"] == "text":
            if not isinstance(value, str):
                field_errors[key] = ["Must be a string"]
                continue

            sanitized = sanitize_string(value)
            if not sanitized:
                continue

            if len(sanitized) > rule["max_length"]:
                field_errors[key] = [f"Must be at most {rule['max_length']} characters"]
                continue

            normalized[key] = sanitized
            continue

        try:
            parsed = int(value)
        except (TypeError, ValueError):
            field_errors[key] = ["Must be an integer"]
            continue

        if parsed < rule["min"] or parsed > rule["max"]:
            field_errors[key] = [f"Must be between {rule['min']} and {rule['max']}"]
            continue

        normalized[key] = parsed

    if field_errors:
        raise ValidationError({field_name: field_errors})

    return normalized