"""Visibility helpers for places and reviews."""

from sqlalchemy import true

from app import db


def _viewer_id(current_user=None, current_user_id=None):
    if current_user is not None:
        return current_user.id
    return current_user_id


def _is_admin(current_user=None, is_admin: bool = False) -> bool:
    if current_user is not None:
        return bool(current_user.is_admin)
    return bool(is_admin)


def normalize_visibility_user_ids(user_ids) -> list[int]:
    """Normalize, deduplicate and validate a list of user ids."""
    normalized = []
    seen = set()

    for value in user_ids or []:
        try:
            user_id = int(value)
        except (TypeError, ValueError):
            continue

        if user_id <= 0 or user_id in seen:
            continue

        normalized.append(user_id)
        seen.add(user_id)

    return normalized


def resolve_visibility_users(user_ids, owner_id: int | None = None):
    """Resolve selected user ids into User objects or raise ValueError."""
    from app.models.user import User

    normalized_ids = [
        user_id
        for user_id in normalize_visibility_user_ids(user_ids)
        if user_id != owner_id
    ]

    if not normalized_ids:
        return []

    users = (
        User.query.filter(User.id.in_(normalized_ids))
        .order_by(User.username.asc())
        .all()
    )
    found_ids = {user.id for user in users}
    missing_ids = [user_id for user_id in normalized_ids if user_id not in found_ids]
    if missing_ids:
        raise ValueError("One or more selected users do not exist")

    return users


def sync_visibility_users(resource, requested_user_ids, owner_id: int | None, is_private: bool):
    """Synchronize selected-user visibility for a place or review."""
    normalized_ids = normalize_visibility_user_ids(requested_user_ids)
    if normalized_ids and not is_private:
        raise ValueError("Selected-user visibility requires the resource to be private")

    if not is_private:
        resource.visible_users = []
        return

    resource.visible_users = resolve_visibility_users(normalized_ids, owner_id=owner_id)


def place_visibility_filter(current_user=None, current_user_id=None, is_admin: bool = False):
    """Return a SQLAlchemy filter for places visible to the viewer."""
    from app.models.place import Place
    from app.models.user import User

    if _is_admin(current_user=current_user, is_admin=is_admin):
        return true()

    viewer_id = _viewer_id(current_user=current_user, current_user_id=current_user_id)
    filters = [Place.is_private == False]
    if viewer_id is not None:
        filters.extend([
            Place.created_by == viewer_id,
            Place.visible_users.any(User.id == viewer_id),
        ])
    return db.or_(*filters)


def review_visibility_filter(current_user=None, current_user_id=None, is_admin: bool = False):
    """Return a SQLAlchemy filter for reviews visible to the viewer."""
    from app.models.review import Review
    from app.models.user import User

    if _is_admin(current_user=current_user, is_admin=is_admin):
        return true()

    viewer_id = _viewer_id(current_user=current_user, current_user_id=current_user_id)
    review_filters = [Review.is_private == False]
    if viewer_id is not None:
        review_filters.extend([
            Review.user_id == viewer_id,
            Review.visible_users.any(User.id == viewer_id),
        ])

    return db.and_(
        Review.place.has(place_visibility_filter(current_user=current_user, current_user_id=current_user_id, is_admin=is_admin)),
        db.or_(*review_filters),
    )


def can_view_place(place, current_user) -> bool:
    """Return whether the current user can view the given place."""
    if not place:
        return False
    if current_user and current_user.is_admin:
        return True
    if not place.is_private:
        return True
    if not current_user:
        return False
    if place.created_by == current_user.id:
        return True
    return any(user.id == current_user.id for user in place.visible_users)


def can_view_review(review, current_user) -> bool:
    """Return whether the current user can view the given review."""
    if not review or not review.place:
        return False
    if current_user and current_user.is_admin:
        return True
    if not can_view_place(review.place, current_user):
        return False
    if not review.is_private:
        return True
    if not current_user:
        return False
    if review.user_id == current_user.id:
        return True
    return any(user.id == current_user.id for user in review.visible_users)


def visibility_mode(is_private: bool, shared_with_count: int) -> str:
    """Return the effective visibility mode string."""
    if not is_private:
        return "public"
    return "shared" if shared_with_count else "private"


def build_visibility_metadata(visible_users, is_private: bool,
                              owner_id: int | None,
                              current_user_id: int | None = None,
                              is_admin: bool = False) -> dict:
    """Serialize visibility metadata for places and reviews."""
    serialized_users = [
        {"id": user.id, "username": user.username}
        for user in sorted(visible_users or [], key=lambda user: user.username.lower())
    ]
    shared_with_count = len(serialized_users)
    data = {
        "visibility_mode": visibility_mode(is_private, shared_with_count),
        "shared_with_count": shared_with_count if is_private else 0,
    }

    if is_admin or (current_user_id is not None and current_user_id == owner_id):
        data["visibility_user_ids"] = [user["id"] for user in serialized_users]
        data["visibility_users"] = serialized_users

    return data
