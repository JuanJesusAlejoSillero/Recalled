"""Places routes."""

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from marshmallow import ValidationError

from app import db
from app.models.place import Place
from app.models.review import Review
from app.middleware.auth import admin_required, get_current_user
from app.middleware.validators import validate_json
from app.schemas.place_schema import PlaceCreateSchema, PlaceUpdateSchema
from app.utils.content_details import normalize_content_details
from app.utils.content_types import (
    DEFAULT_CONTENT_TYPE,
    enabled_content_types,
    is_content_type_enabled,
    validate_content_type,
)
from app.utils.visibility import (
    can_view_place,
    place_visibility_filter,
    review_visibility_filter,
    sync_visibility_users,
)

places_bp = Blueprint("places", __name__)


def _module_not_enabled_response():
    """Return a standard response for disabled content modules."""
    return jsonify({"error": "Content module not enabled"}), 404


def _parse_requested_content_type(raw_content_type, *, required=False):
    """Normalize and validate a requested content type."""
    if raw_content_type is None and not required:
        return None, None

    try:
        return validate_content_type(
            raw_content_type,
            default=DEFAULT_CONTENT_TYPE if required else None,
        ), None
    except ValueError as err:
        return None, err


def _is_place_module_enabled(place):
    """Check whether the place content module is enabled."""
    if not place:
        return False
    return is_content_type_enabled(current_app.config, place.content_type)


def _review_visibility_user_ids(review):
    """Return the review allowlist as a list of user ids."""
    if not review:
        return []
    return [user.id for user in review.visible_users]


def _freeze_review_visibility_to_place_subset(review, allowed_user_ids):
    """Keep a private review within the place allowlist without broadening access."""
    current_review_user_ids = _review_visibility_user_ids(review)
    pruned_user_ids = [user_id for user_id in current_review_user_ids if user_id in allowed_user_ids]
    sync_visibility_users(
        review,
        requested_user_ids=pruned_user_ids,
        owner_id=review.user_id,
        is_private=bool(review.is_private),
    )


def _apply_place_visibility_transition(place, was_private, previous_place_user_ids):
    """Apply place visibility changes to child reviews without broadening review access."""
    current_place_user_ids = [user.id for user in place.visible_users]
    current_place_user_id_set = set(current_place_user_ids)
    place_became_private = not was_private and place.is_private
    place_became_public = was_private and not place.is_private
    private_allowlist_changed = (
        was_private
        and place.is_private
        and previous_place_user_ids != current_place_user_ids
    )

    if not place_became_private and not place_became_public and not private_allowlist_changed:
        return

    for review in place.reviews.all():
        if place_became_private:
            if not review.is_private:
                review.is_private = True
                review.inherits_place_visibility = True
                sync_visibility_users(
                    review,
                    requested_user_ids=current_place_user_ids,
                    owner_id=review.user_id,
                    is_private=True,
                )
                continue

            if review.inherits_place_visibility:
                sync_visibility_users(
                    review,
                    requested_user_ids=current_place_user_ids,
                    owner_id=review.user_id,
                    is_private=True,
                )
                continue

            _freeze_review_visibility_to_place_subset(review, current_place_user_id_set)
            continue

        if place_became_public:
            if review.inherits_place_visibility:
                review.inherits_place_visibility = False
            continue

        if private_allowlist_changed:
            if review.inherits_place_visibility:
                review.inherits_place_visibility = False

            if review.is_private:
                _freeze_review_visibility_to_place_subset(review, current_place_user_id_set)


def _user_context():
    """Return (current_user_id, is_admin) for the authenticated user."""
    user = get_current_user()
    if user:
        return user.id, user.is_admin
    return None, False


def _visible_reviews_subquery(current_user_id, is_admin):
    """Subquery that counts visible reviews per place for the given user."""
    return db.session.query(
        Review.place_id,
        func.count(Review.id).label("visible_count"),
        func.avg(Review.rating).label("avg_r"),
    ).filter(
        review_visibility_filter(current_user_id=current_user_id, is_admin=is_admin)
    ).group_by(Review.place_id).subquery()


def _place_visible_to_user(place, current_user_id, is_admin):
    """Check if a place is visible to the given user."""
    current_user = get_current_user()
    return _is_place_module_enabled(place) and can_view_place(place, current_user)


@places_bp.route("", methods=["GET"])
@jwt_required()
def list_places():
    """List places visible to the current user.

    A place is visible if it is public, or the user is its creator, or user is admin.
    The review stats only reflect reviews visible to the user.
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 100)

    category = request.args.get("category")
    search = request.args.get("search")
    sort = request.args.get("sort", "name")  # name, rating, recent
    requested_content_type, content_type_error = _parse_requested_content_type(
        request.args.get("content_type")
    )

    if content_type_error:
        return jsonify({"error": str(content_type_error)}), 400

    if requested_content_type and not is_content_type_enabled(
        current_app.config,
        requested_content_type,
    ):
        return _module_not_enabled_response()

    current_user_id, is_admin = _user_context()
    vis_sub = _visible_reviews_subquery(current_user_id, is_admin)

    # Left join: include places even if they have no visible reviews
    query = Place.query.outerjoin(vis_sub, Place.id == vis_sub.c.place_id)

    query = query.filter(
        place_visibility_filter(current_user_id=current_user_id, is_admin=is_admin)
    )

    if requested_content_type:
        query = query.filter(Place.content_type == requested_content_type)
    else:
        query = query.filter(Place.content_type.in_(enabled_content_types(current_app.config)))

    if category:
        query = query.filter(Place.category == category)

    if search:
        query = query.filter(Place.name.ilike(f"%{search}%"))

    if sort == "rating":
        query = query.order_by(vis_sub.c.avg_r.desc().nulls_last())
    elif sort == "recent":
        query = query.order_by(Place.created_at.desc())
    else:
        query = query.order_by(Place.name.asc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    places = [
        p.to_dict(current_user_id=current_user_id, is_admin=is_admin)
        for p in pagination.items
    ]

    return jsonify({
        "places": places,
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "per_page": per_page,
    }), 200


@places_bp.route("/<int:place_id>", methods=["GET"])
@jwt_required()
def get_place(place_id):
    """Get a specific place with its reviews."""
    place = Place.query.get_or_404(place_id, description="Place not found")
    if not _is_place_module_enabled(place):
        return _module_not_enabled_response()

    current_user_id, is_admin = _user_context()

    if not _place_visible_to_user(place, current_user_id, is_admin):
        return jsonify({"error": "Place not found"}), 404

    data = place.to_dict(
        include_reviews=True,
        current_user_id=current_user_id,
        is_admin=is_admin,
    )

    return jsonify(data), 200


@places_bp.route("", methods=["POST"])
@jwt_required()
@validate_json(PlaceCreateSchema)
def create_place(validated_data):
    """Create a new place. The creator is recorded."""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Authentication required"}), 401

    user_id = int(get_jwt_identity())
    # Ignore any created_by from input; always use the authenticated user
    validated_data.pop("created_by", None)
    visibility_user_ids = validated_data.pop("visibility_user_ids", [])
    content_type = validate_content_type(
        validated_data.get("content_type"),
        default=DEFAULT_CONTENT_TYPE,
    )
    if not is_content_type_enabled(current_app.config, content_type):
        return _module_not_enabled_response()

    validated_data["content_type"] = content_type

    place = Place(created_by=user_id, **validated_data)
    db.session.add(place)

    try:
        sync_visibility_users(
            place,
            requested_user_ids=visibility_user_ids,
            owner_id=user_id,
            is_private=place.is_private,
        )
    except ValueError as err:
        db.session.rollback()
        return jsonify({"error": str(err)}), 400

    db.session.commit()

    return jsonify(place.to_dict(current_user_id=current_user.id, is_admin=current_user.is_admin)), 201


@places_bp.route("/<int:place_id>", methods=["PUT"])
@jwt_required()
@validate_json(PlaceUpdateSchema)
def update_place(place_id, validated_data):
    """Update a place (creator or admin)."""
    place = Place.query.get_or_404(place_id, description="Place not found")
    if not _is_place_module_enabled(place):
        return _module_not_enabled_response()

    current_user = get_current_user()

    if not current_user:
        return jsonify({"error": "Authentication required"}), 401

    if place.created_by != current_user.id and not current_user.is_admin:
        return jsonify({"error": "Permission denied"}), 403

    # Only admin can change the owner; non-admin: strip it; None: keep current
    if not current_user.is_admin or validated_data.get("created_by") is None:
        validated_data.pop("created_by", None)

    was_private = bool(place.is_private)
    previous_place_user_ids = [user.id for user in place.visible_users]
    visibility_user_ids = validated_data.pop(
        "visibility_user_ids",
        [user.id for user in place.visible_users],
    )
    final_owner_id = validated_data.get("created_by", place.created_by)
    final_is_private = validated_data.get("is_private", place.is_private)
    final_content_type = validate_content_type(
        validated_data.get("content_type"),
        default=place.content_type,
    )
    if not is_content_type_enabled(current_app.config, final_content_type):
        return _module_not_enabled_response()

    validated_data["content_type"] = final_content_type

    if "details" in validated_data:
        try:
            validated_data["details"] = normalize_content_details(
                final_content_type,
                validated_data.get("details"),
            )
        except ValidationError as err:
            return jsonify({"error": "Validation error", "details": err.messages}), 400

    for key, value in validated_data.items():
        setattr(place, key, value)

    try:
        sync_visibility_users(
            place,
            requested_user_ids=visibility_user_ids,
            owner_id=final_owner_id,
            is_private=final_is_private,
        )
        _apply_place_visibility_transition(place, was_private, previous_place_user_ids)
    except ValueError as err:
        db.session.rollback()
        return jsonify({"error": str(err)}), 400

    db.session.commit()

    return jsonify(place.to_dict(current_user_id=current_user.id, is_admin=current_user.is_admin)), 200


@places_bp.route("/<int:place_id>", methods=["DELETE"])
@jwt_required()
def delete_place(place_id):
    """Delete a place.

    Admin can always delete.
    Creator can delete only if the place has no reviews from other users.
    """
    place = Place.query.get_or_404(place_id, description="Place not found")
    if not _is_place_module_enabled(place):
        return _module_not_enabled_response()

    current_user = get_current_user()

    if not current_user:
        return jsonify({"error": "Authentication required"}), 401

    if current_user.is_admin:
        db.session.delete(place)
        db.session.commit()
        return jsonify({"message": f"Place '{place.name}' deleted"}), 200

    if place.created_by != current_user.id:
        return jsonify({"error": "Permission denied"}), 403

    # Creator can only delete if no other users have reviews on this place
    other_reviews = Review.query.filter(
        Review.place_id == place_id,
        Review.user_id != current_user.id,
    ).count()

    if other_reviews > 0:
        return jsonify({"error": "Cannot delete: other users have reviews on this place"}), 403

    db.session.delete(place)
    db.session.commit()

    return jsonify({"message": f"Place '{place.name}' deleted"}), 200


@places_bp.route("/<int:place_id>/reviews", methods=["GET"])
@jwt_required()
def get_place_reviews(place_id):
    """Get all reviews for a specific place (privacy-aware)."""
    place = Place.query.get_or_404(place_id, description="Place not found")
    if not _is_place_module_enabled(place):
        return _module_not_enabled_response()

    current_user_id, is_admin = _user_context()

    if not _place_visible_to_user(place, current_user_id, is_admin):
        return jsonify({"error": "Place not found"}), 404

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 100)

    query = Review.query.filter(Review.place_id == place_id)
    query = query.filter(
        review_visibility_filter(current_user_id=current_user_id, is_admin=is_admin)
    )

    pagination = query.order_by(
        Review.created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "reviews": [
            r.to_dict(current_user_id=current_user_id, is_admin=is_admin)
            for r in pagination.items
        ],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "place": place.to_dict(current_user_id=current_user_id, is_admin=is_admin),
    }), 200
