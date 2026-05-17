"""Reviews routes."""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models.review import Review
from app.models.place import Place
from app.models.photo import ReviewPhoto
from app.middleware.auth import get_current_user
from app.middleware.validators import validate_json
from app.schemas.review_schema import ReviewCreateSchema, ReviewUpdateSchema
from app.utils.file_handler import save_photo, delete_photo
from app.utils.visibility import (
    can_view_place,
    normalize_visibility_user_ids,
    can_view_review,
    review_visibility_filter,
    sync_visibility_users,
)

reviews_bp = Blueprint("reviews", __name__)
MAX_REVIEW_PHOTOS = 5


def _visible_reviews_query(current_user):
    """Build a query that only returns reviews visible to the current user."""
    return Review.query.filter(review_visibility_filter(current_user=current_user))


def _get_accessible_place(place_id, current_user):
    """Return a place only when the current user is allowed to attach reviews to it."""
    place = db.session.get(Place, place_id)
    if not place or not can_view_place(place, current_user):
        return None
    return place


def _place_visibility_user_ids(place):
    """Return the place allowlist as a list of user ids."""
    if not place:
        return []
    return [user.id for user in place.visible_users]


def _place_visibility_users(place):
    """Return serialized place allowlist users."""
    if not place:
        return []
    return [{"id": user.id, "username": user.username} for user in place.visible_users]


def _review_visibility_user_ids(review):
    """Return the review allowlist as a list of user ids."""
    if not review:
        return []
    return [user.id for user in review.visible_users]


def _normalize_review_visibility_user_ids(user_ids, owner_id):
    """Normalize review allowlist ids while ignoring the review owner."""
    return [
        user_id
        for user_id in normalize_visibility_user_ids(user_ids)
        if user_id != owner_id
    ]


def _prune_review_visibility_user_ids_to_place(target_place, user_ids, owner_id):
    """Keep only users that can also access the private place."""
    normalized_ids = _normalize_review_visibility_user_ids(user_ids, owner_id)
    if not target_place or not target_place.is_private:
        return normalized_ids

    allowed_user_ids = set(_place_visibility_user_ids(target_place))
    return [user_id for user_id in normalized_ids if user_id in allowed_user_ids]


def _validate_review_visibility_user_ids_for_place(target_place, user_ids, owner_id):
    """Reject review allowlists that are broader than the private place allowlist."""
    normalized_ids = _normalize_review_visibility_user_ids(user_ids, owner_id)
    if not target_place or not target_place.is_private:
        return normalized_ids

    allowed_user_ids = set(_place_visibility_user_ids(target_place))
    if any(user_id not in allowed_user_ids for user_id in normalized_ids):
        raise ValueError("Review visibility users must already be allowed on the private place")

    return normalized_ids


def _resolve_review_visibility_defaults(
    raw_payload,
    target_place,
    owner_id,
    final_is_private,
    review=None,
    place_changed=False,
):
    """Resolve review allowlist ids and whether they inherit place defaults."""
    if "visibility_user_ids" in raw_payload:
        explicit_user_ids = _validate_review_visibility_user_ids_for_place(
            target_place,
            raw_payload.get("visibility_user_ids") or [],
            owner_id,
        )
        return explicit_user_ids, False

    if not final_is_private:
        return [], False

    if review is None:
        if target_place and target_place.is_private:
            return _place_visibility_user_ids(target_place), True
        return [], False

    current_review_user_ids = _review_visibility_user_ids(review)

    if target_place and target_place.is_private:
        if not review.is_private:
            return _place_visibility_user_ids(target_place), True

        if place_changed and review.inherits_place_visibility:
            return _place_visibility_user_ids(target_place), True

    if review.inherits_place_visibility:
        if target_place and target_place.is_private:
            return _prune_review_visibility_user_ids_to_place(
                target_place,
                current_review_user_ids,
                owner_id,
            ), True
        return current_review_user_ids, False

    return _prune_review_visibility_user_ids_to_place(
        target_place,
        current_review_user_ids,
        owner_id,
    ), False


def _serialize_review(review, current_user):
    """Serialize a review with edit-oriented place visibility metadata when allowed."""
    current_user_id = current_user.id if current_user else None
    is_admin = current_user.is_admin if current_user else False
    data = review.to_dict(current_user_id=current_user_id, is_admin=is_admin)
    place = review.place
    data["place_is_private"] = bool(place.is_private) if place else False

    can_edit_review = bool(current_user and (current_user.is_admin or review.user_id == current_user.id))
    if can_edit_review and place:
        data["inherits_place_visibility"] = bool(review.inherits_place_visibility)

    if can_edit_review and place and place.is_private:
        data["place_visibility_user_ids"] = _place_visibility_user_ids(place)
        data["place_visibility_users"] = _place_visibility_users(place)
        data["place_visibility_mismatch"] = (
            review.is_private
            and not review.inherits_place_visibility
            and len(review.visible_users) == 0
            and len(place.visible_users) > 0
        )

    return data


@reviews_bp.route("", methods=["GET"])
@jwt_required()
def list_reviews():
    """List only the reviews visible to the current user."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 100)

    user_id = request.args.get("user_id", type=int)
    place_id = request.args.get("place_id", type=int)

    current_user = get_current_user()
    query = _visible_reviews_query(current_user)

    if user_id:
        query = query.filter(Review.user_id == user_id)
    if place_id:
        query = query.filter(Review.place_id == place_id)

    pagination = query.order_by(Review.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "reviews": [r.to_dict() for r in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "per_page": per_page,
    }), 200


@reviews_bp.route("/<int:review_id>", methods=["GET"])
@jwt_required()
def get_review(review_id):
    """Get a specific review."""
    review = db.get_or_404(Review, review_id, description="Review not found")

    current_user = get_current_user()
    if not can_view_review(review, current_user):
        return jsonify({"error": "Review not found"}), 404

    return jsonify(_serialize_review(review, current_user)), 200


def _extract_place_fields(validated_data):
    """Pop inline place_* fields from validated_data and return a dict for Place creation."""
    place_fields = {}
    for suffix in (
        "name",
        "address",
        "category",
        "latitude",
        "longitude",
        "is_private",
        "visibility_user_ids",
    ):
        key = f"place_{suffix}"
        val = validated_data.pop(key, None)
        if val is not None:
            place_fields[suffix if suffix != "name" else "name"] = val
    return place_fields


def _create_inline_place(place_fields, user_id):
    """Create a Place from inline fields and return its id."""
    visibility_user_ids = place_fields.pop("visibility_user_ids", [])
    place = Place(created_by=user_id, **place_fields)
    db.session.add(place)

    sync_visibility_users(
        place,
        requested_user_ids=visibility_user_ids,
        owner_id=user_id,
        is_private=place.is_private,
    )

    db.session.flush()
    return place.id


@reviews_bp.route("", methods=["POST"])
@jwt_required()
@validate_json(ReviewCreateSchema)
def create_review(validated_data):
    """Create a new review.

    Accepts either place_id (existing place) or place_name (creates a new place
    in the same transaction) with optional place details.
    """
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Authentication required"}), 401

    user_id = current_user.id
    raw_payload = request.get_json(silent=True) or {}

    place_id = validated_data.pop("place_id", None)
    validated_data.pop("visibility_user_ids", None)
    place_fields = _extract_place_fields(validated_data)
    target_place = None

    if not place_id and not place_fields.get("name"):
        return jsonify({"error": "Provide place_id or place_name"}), 400

    if place_fields.get("name"):
        try:
            place_id = _create_inline_place(place_fields, user_id)
        except ValueError as err:
            db.session.rollback()
            return jsonify({"error": str(err)}), 400
        target_place = db.session.get(Place, place_id)
    else:
        target_place = _get_accessible_place(place_id, current_user)
        if not target_place:
            return jsonify({"error": "Place not found"}), 404

    review_is_private = validated_data.get("is_private", False)
    if target_place and target_place.is_private:
        review_is_private = True

    try:
        visibility_user_ids, inherits_place_visibility = _resolve_review_visibility_defaults(
            raw_payload,
            target_place,
            owner_id=user_id,
            final_is_private=review_is_private,
        )
    except ValueError as err:
        return jsonify({"error": str(err)}), 400

    review = Review(
        user_id=user_id,
        place_id=place_id,
        rating=validated_data["rating"],
        title=validated_data.get("title"),
        comment=validated_data.get("comment"),
        visit_date=validated_data.get("visit_date"),
        is_private=review_is_private,
        inherits_place_visibility=inherits_place_visibility,
    )

    db.session.add(review)

    try:
        sync_visibility_users(
            review,
            requested_user_ids=visibility_user_ids,
            owner_id=user_id,
            is_private=review_is_private,
        )
    except ValueError as err:
        db.session.rollback()
        return jsonify({"error": str(err)}), 400

    db.session.commit()

    return jsonify(_serialize_review(review, current_user)), 201


@reviews_bp.route("/<int:review_id>", methods=["PUT"])
@jwt_required()
@validate_json(ReviewUpdateSchema)
def update_review(review_id, validated_data):
    """Update a review (owner only)."""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Authentication required"}), 401

    review = db.get_or_404(Review, review_id, description="Review not found")
    raw_payload = request.get_json(silent=True) or {}

    if review.user_id != current_user.id and not current_user.is_admin:
        return jsonify({"error": "Permission denied"}), 403
    validated_data.pop("visibility_user_ids", None)

    # Handle new place creation inline
    target_place = review.place
    place_changed = False
    place_fields = _extract_place_fields(validated_data)
    if place_fields.get("name"):
        try:
            validated_data["place_id"] = _create_inline_place(place_fields, current_user.id)
        except ValueError as err:
            db.session.rollback()
            return jsonify({"error": str(err)}), 400
        target_place = db.session.get(Place, validated_data["place_id"])
        place_changed = True
    elif "place_id" in validated_data:
        target_place = _get_accessible_place(validated_data["place_id"], current_user)
        if not target_place:
            return jsonify({"error": "Place not found"}), 404
        place_changed = validated_data["place_id"] != review.place_id

    final_is_private = validated_data.get("is_private", review.is_private)
    if target_place and target_place.is_private:
        validated_data["is_private"] = True
        final_is_private = True

    try:
        visibility_user_ids, inherits_place_visibility = _resolve_review_visibility_defaults(
            raw_payload,
            target_place,
            owner_id=review.user_id,
            final_is_private=final_is_private,
            review=review,
            place_changed=place_changed,
        )
    except ValueError as err:
        return jsonify({"error": str(err)}), 400

    for key, value in validated_data.items():
        setattr(review, key, value)
    review.inherits_place_visibility = inherits_place_visibility

    try:
        sync_visibility_users(
            review,
            requested_user_ids=visibility_user_ids,
            owner_id=review.user_id,
            is_private=final_is_private,
        )
    except ValueError as err:
        db.session.rollback()
        return jsonify({"error": str(err)}), 400

    db.session.commit()

    return jsonify(_serialize_review(review, current_user)), 200


@reviews_bp.route("/<int:review_id>", methods=["DELETE"])
@jwt_required()
def delete_review(review_id):
    """Delete a review (owner or admin).

    If this was the last review on a place owned by the user, include
    orphaned_place info in the response so the frontend can offer deletion.
    """
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Authentication required"}), 401

    review = db.get_or_404(Review, review_id, description="Review not found")

    if review.user_id != current_user.id and not current_user.is_admin:
        return jsonify({"error": "Permission denied"}), 403

    place_id = review.place_id
    place = review.place

    # Delete associated photo files from disk
    for photo in review.photos:
        delete_photo(photo.filename)

    db.session.delete(review)
    db.session.commit()

    result = {"message": "Review deleted"}

    # Check if the place is now orphaned (no reviews left)
    remaining = Review.query.filter(Review.place_id == place_id).count()
    if remaining == 0:
        can_delete = (
            current_user.is_admin
            or place.created_by == current_user.id
        )
        result["orphaned_place"] = {
            "id": place.id,
            "name": place.name,
            "can_delete": can_delete,
        }

    return jsonify(result), 200


@reviews_bp.route("/<int:review_id>/photos", methods=["POST"])
@jwt_required()
def upload_photos(review_id):
    """Upload photos to a review (owner only)."""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Authentication required"}), 401

    review = db.get_or_404(Review, review_id, description="Review not found")

    if review.user_id != current_user.id:
        return jsonify({"error": "Permission denied"}), 403

    if "photos" not in request.files:
        return jsonify({"error": "No photos provided"}), 400

    files = request.files.getlist("photos")
    if not files:
        return jsonify({"error": "No photos provided"}), 400

    existing_photos = review.photos.count()
    remaining_slots = MAX_REVIEW_PHOTOS - existing_photos

    if remaining_slots <= 0:
        return jsonify({"error": "Photo limit reached for this review"}), 400

    if len(files) > remaining_slots:
        return jsonify({
            "error": (
                f"You can upload up to {MAX_REVIEW_PHOTOS} photos per review. "
                f"Remaining slots: {remaining_slots}"
            )
        }), 400

    uploaded = []
    errors = []

    for file in files:
        try:
            photo_data = save_photo(file)
            photo = ReviewPhoto(
                review_id=review.id,
                filename=photo_data["filename"],
                original_filename=photo_data["original_filename"],
                file_size=photo_data["file_size"],
            )
            db.session.add(photo)
            uploaded.append(photo)
        except ValueError as e:
            errors.append({"file": file.filename, "error": str(e)})

    db.session.commit()

    result = {
        "uploaded": [p.to_dict() for p in uploaded],
        "count": len(uploaded),
    }
    if errors:
        result["errors"] = errors

    status = 201 if uploaded else 400
    return jsonify(result), status


@reviews_bp.route("/<int:review_id>/photos/<int:photo_id>", methods=["DELETE"])
@jwt_required()
def delete_review_photo(review_id, photo_id):
    """Delete a photo from a review (owner or admin)."""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Authentication required"}), 401

    review = db.get_or_404(Review, review_id, description="Review not found")

    if review.user_id != current_user.id and not current_user.is_admin:
        return jsonify({"error": "Permission denied"}), 403

    photo = ReviewPhoto.query.filter_by(id=photo_id, review_id=review_id).first()
    if not photo:
        return jsonify({"error": "Photo not found"}), 404

    delete_photo(photo.filename)
    db.session.delete(photo)
    db.session.commit()

    return jsonify({"message": "Photo deleted"}), 200
