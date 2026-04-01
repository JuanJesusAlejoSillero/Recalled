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

reviews_bp = Blueprint("reviews", __name__)


def _place_visible_to_user(place, current_user) -> bool:
    """Return whether a place is visible to the current user."""
    if not place:
        return False
    if current_user and current_user.is_admin:
        return True
    if not place.is_private:
        return True
    return bool(current_user and place.created_by == current_user.id)


def _review_visible_to_user(review, current_user) -> bool:
    """Return whether a review is visible to the current user."""
    if not review or not review.place:
        return False
    if current_user and current_user.is_admin:
        return True
    if not _place_visible_to_user(review.place, current_user):
        return False
    if not review.is_private:
        return True
    return bool(current_user and review.user_id == current_user.id)


def _visible_reviews_query(current_user):
    """Build a query that only returns reviews visible to the current user."""
    query = Review.query.join(Place, Review.place_id == Place.id)

    if current_user and current_user.is_admin:
        return query

    place_filters = [Place.is_private == False]
    review_filters = [Review.is_private == False]

    if current_user:
        place_filters.append(Place.created_by == current_user.id)
        review_filters.append(Review.user_id == current_user.id)

    return query.filter(db.or_(*place_filters)).filter(db.or_(*review_filters))


def _get_accessible_place(place_id, current_user):
    """Return a place only when the current user is allowed to attach reviews to it."""
    place = db.session.get(Place, place_id)
    if not place or not _place_visible_to_user(place, current_user):
        return None
    return place


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
    if not _review_visible_to_user(review, current_user):
        return jsonify({"error": "Review not found"}), 404

    return jsonify(review.to_dict()), 200


def _extract_place_fields(validated_data):
    """Pop inline place_* fields from validated_data and return a dict for Place creation."""
    place_fields = {}
    for suffix in ("name", "address", "category", "latitude", "longitude", "is_private"):
        key = f"place_{suffix}"
        val = validated_data.pop(key, None)
        if val is not None:
            place_fields[suffix if suffix != "name" else "name"] = val
    return place_fields


def _create_inline_place(place_fields, user_id):
    """Create a Place from inline fields and return its id."""
    place = Place(created_by=user_id, **place_fields)
    db.session.add(place)
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

    place_id = validated_data.pop("place_id", None)
    place_fields = _extract_place_fields(validated_data)
    target_place = None

    if not place_id and not place_fields.get("name"):
        return jsonify({"error": "Provide place_id or place_name"}), 400

    if place_fields.get("name"):
        place_id = _create_inline_place(place_fields, user_id)
        target_place = db.session.get(Place, place_id)
    else:
        target_place = _get_accessible_place(place_id, current_user)
        if not target_place:
            return jsonify({"error": "Place not found"}), 404

    review_is_private = validated_data.get("is_private", False)
    if target_place and target_place.is_private:
        review_is_private = True

    review = Review(
        user_id=user_id,
        place_id=place_id,
        rating=validated_data["rating"],
        title=validated_data.get("title"),
        comment=validated_data.get("comment"),
        visit_date=validated_data.get("visit_date"),
        is_private=review_is_private,
    )

    db.session.add(review)
    db.session.commit()

    return jsonify(review.to_dict()), 201


@reviews_bp.route("/<int:review_id>", methods=["PUT"])
@jwt_required()
@validate_json(ReviewUpdateSchema)
def update_review(review_id, validated_data):
    """Update a review (owner only)."""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Authentication required"}), 401

    review = db.get_or_404(Review, review_id, description="Review not found")

    if review.user_id != current_user.id and not current_user.is_admin:
        return jsonify({"error": "Permission denied"}), 403

    # Handle new place creation inline
    target_place = review.place
    place_fields = _extract_place_fields(validated_data)
    if place_fields.get("name"):
        validated_data["place_id"] = _create_inline_place(place_fields, current_user.id)
        target_place = db.session.get(Place, validated_data["place_id"])
    elif "place_id" in validated_data:
        target_place = _get_accessible_place(validated_data["place_id"], current_user)
        if not target_place:
            return jsonify({"error": "Place not found"}), 404

    if target_place and target_place.is_private:
        validated_data["is_private"] = True

    for key, value in validated_data.items():
        setattr(review, key, value)

    db.session.commit()

    return jsonify(review.to_dict()), 200


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
