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


@reviews_bp.route("", methods=["GET"])
@jwt_required()
def list_reviews():
    """List all reviews with optional filters."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 100)

    user_id = request.args.get("user_id", type=int)
    place_id = request.args.get("place_id", type=int)

    current_user = get_current_user()
    query = Review.query

    if user_id:
        query = query.filter(Review.user_id == user_id)
    if place_id:
        query = query.filter(Review.place_id == place_id)

    # Hide private reviews from other users (owner and admin can see them)
    if current_user:
        if not current_user.is_admin:
            query = query.filter(
                db.or_(Review.is_private == False, Review.user_id == current_user.id)
            )
    else:
        query = query.filter(Review.is_private == False)

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
    review = Review.query.get_or_404(review_id, description="Review not found")

    # Private reviews only visible to owner or admin
    if review.is_private:
        current_user = get_current_user()
        if not current_user or (review.user_id != current_user.id and not current_user.is_admin):
            return jsonify({"error": "Review not found"}), 404

    return jsonify(review.to_dict()), 200


@reviews_bp.route("", methods=["POST"])
@jwt_required()
@validate_json(ReviewCreateSchema)
def create_review(validated_data):
    """Create a new review.

    Accepts either place_id (existing place) or place_name (creates a new place
    in the same transaction).
    """
    user_id = int(get_jwt_identity())

    place_id = validated_data.get("place_id")
    place_name = validated_data.get("place_name")

    if not place_id and not place_name:
        return jsonify({"error": "Provide place_id or place_name"}), 400

    if place_name:
        # Create a new place in the same transaction
        place = Place(name=place_name)
        db.session.add(place)
        db.session.flush()  # get the id without committing
        place_id = place.id
    else:
        place = Place.query.get(place_id)
        if not place:
            return jsonify({"error": "Place not found"}), 404

    review = Review(
        user_id=user_id,
        place_id=place_id,
        rating=validated_data["rating"],
        title=validated_data.get("title"),
        comment=validated_data.get("comment"),
        visit_date=validated_data.get("visit_date"),
        is_private=validated_data.get("is_private", False),
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

    review = Review.query.get_or_404(review_id, description="Review not found")

    if review.user_id != current_user.id and not current_user.is_admin:
        return jsonify({"error": "Permission denied"}), 403

    for key, value in validated_data.items():
        setattr(review, key, value)

    db.session.commit()

    return jsonify(review.to_dict()), 200


@reviews_bp.route("/<int:review_id>", methods=["DELETE"])
@jwt_required()
def delete_review(review_id):
    """Delete a review (owner or admin)."""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Authentication required"}), 401

    review = Review.query.get_or_404(review_id, description="Review not found")

    if review.user_id != current_user.id and not current_user.is_admin:
        return jsonify({"error": "Permission denied"}), 403

    # Delete associated photo files from disk
    for photo in review.photos:
        delete_photo(photo.filename)

    db.session.delete(review)
    db.session.commit()

    return jsonify({"message": "Review deleted"}), 200


@reviews_bp.route("/<int:review_id>/photos", methods=["POST"])
@jwt_required()
def upload_photos(review_id):
    """Upload photos to a review (owner only)."""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Authentication required"}), 401

    review = Review.query.get_or_404(review_id, description="Review not found")

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

    review = Review.query.get_or_404(review_id, description="Review not found")

    if review.user_id != current_user.id and not current_user.is_admin:
        return jsonify({"error": "Permission denied"}), 403

    photo = ReviewPhoto.query.filter_by(id=photo_id, review_id=review_id).first()
    if not photo:
        return jsonify({"error": "Photo not found"}), 404

    delete_photo(photo.filename)
    db.session.delete(photo)
    db.session.commit()

    return jsonify({"message": "Photo deleted"}), 200
