"""Content type helpers shared by routes, models, and schemas."""

DEFAULT_CONTENT_TYPE = "place"
CONTENT_TYPES = (
    DEFAULT_CONTENT_TYPE,
    "movie",
    "series",
    "book",
    "videogame",
    "person",
)
NON_REVIEWABLE_CONTENT_TYPES = ("person",)

CONTENT_TYPE_ALIASES = {
    "places": DEFAULT_CONTENT_TYPE,
    "movies": "movie",
    "books": "book",
    "videogames": "videogame",
    "people": "person",
}


def normalize_content_type(value, default=DEFAULT_CONTENT_TYPE):
    """Normalize a content type or fall back to the provided default."""
    if value is None:
        return default

    normalized = str(value).strip().lower()
    if not normalized:
        return default

    return CONTENT_TYPE_ALIASES.get(normalized, normalized)


def validate_content_type(value, default=DEFAULT_CONTENT_TYPE):
    """Return a normalized content type or raise when unsupported."""
    normalized = normalize_content_type(value, default=default)
    if normalized not in CONTENT_TYPES:
        raise ValueError("Invalid content type")
    return normalized


def enabled_content_types(config):
    """Return the currently enabled content types for the given config."""
    flags = config.get("CONTENT_MODULE_FLAGS", {})
    return tuple(
        content_type
        for content_type in CONTENT_TYPES
        if flags.get(content_type, content_type == DEFAULT_CONTENT_TYPE)
    )


def content_type_supports_reviews(content_type):
    """Return whether the content type is meant to use the review flow."""
    normalized = validate_content_type(content_type)
    return normalized not in NON_REVIEWABLE_CONTENT_TYPES


def reviewable_content_types(config):
    """Return enabled content types that support reviews."""
    return tuple(
        content_type
        for content_type in enabled_content_types(config)
        if content_type_supports_reviews(content_type)
    )


def is_content_type_enabled(config, content_type):
    """Check whether a normalized content type is enabled."""
    normalized = validate_content_type(content_type)
    return normalized in enabled_content_types(config)


def is_content_type_reviewable(config, content_type):
    """Check whether a content type is enabled and reviewable."""
    normalized = validate_content_type(content_type)
    return normalized in reviewable_content_types(config)