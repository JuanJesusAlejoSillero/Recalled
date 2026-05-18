"""Statistics routes."""

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from app import db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.review import Review
from app.models.place import Place
from app.models.photo import ReviewPhoto
from app.utils.content_types import enabled_content_types, is_content_type_enabled, validate_content_type
from app.utils.visibility import review_visibility_filter

stats_bp = Blueprint("stats", __name__)


@stats_bp.route("/user/<int:user_id>", methods=["GET"])
@jwt_required()
def user_stats(user_id):
    """Get statistics for a specific user."""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Authentication required"}), 401
    if current_user.id != user_id and not current_user.is_admin:
        return jsonify({"error": "Permission denied"}), 403

    user = db.get_or_404(User, user_id, description="User not found")
    enabled_types = enabled_content_types(current_app.config)

    total_reviews = (
        Review.query.join(Place, Review.place_id == Place.id)
        .filter(Review.user_id == user_id, Place.content_type.in_(enabled_types))
        .count()
    )
    total_photos = (
        db.session.query(func.count(ReviewPhoto.id))
        .join(Review, ReviewPhoto.review_id == Review.id)
        .join(Place, Review.place_id == Place.id)
        .filter(Review.user_id == user_id, Place.content_type.in_(enabled_types))
        .scalar()
    )
    avg_rating = (
        db.session.query(func.avg(Review.rating))
        .join(Place, Review.place_id == Place.id)
        .filter(Review.user_id == user_id, Place.content_type.in_(enabled_types))
        .scalar()
    )
    reviewed_items = (
        db.session.query(func.count(func.distinct(Review.place_id)))
        .join(Place, Review.place_id == Place.id)
        .filter(Review.user_id == user_id, Place.content_type.in_(enabled_types))
        .scalar()
    )

    # Rating distribution
    rating_dist = dict(
        db.session.query(Review.rating, func.count(Review.id))
        .join(Place, Review.place_id == Place.id)
        .filter(Review.user_id == user_id, Place.content_type.in_(enabled_types))
        .group_by(Review.rating)
        .all()
    )

    return jsonify({
        "user": user.to_dict(),
        "stats": {
            "total_reviews": total_reviews,
            "total_photos": total_photos or 0,
            "avg_rating": round(avg_rating, 1) if avg_rating else None,
            "places_visited": reviewed_items or 0,
            "reviewed_items": reviewed_items or 0,
            "rating_distribution": {i: rating_dist.get(i, 0) for i in range(1, 6)},
        },
    }), 200


@stats_bp.route("/places", methods=["GET"])
@jwt_required()
def top_places():
    """Get top-rated places (visible reviews only)."""
    current_user = get_current_user()
    current_user_id = current_user.id if current_user else None
    is_admin = current_user.is_admin if current_user else False
    enabled_types = enabled_content_types(current_app.config)
    requested_content_type = request.args.get("content_type")

    if requested_content_type is not None:
        try:
            requested_content_type = validate_content_type(
                requested_content_type,
                default=None,
            )
        except ValueError as err:
            return jsonify({"error": str(err)}), 400

        if not is_content_type_enabled(current_app.config, requested_content_type):
            return jsonify({"error": "Content module not enabled"}), 404

        enabled_types = (requested_content_type,)

    results = (
        db.session.query(
            Place,
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).label("review_count"),
        )
        .join(Review, Place.id == Review.place_id)
        .filter(
            Place.content_type.in_(enabled_types),
            review_visibility_filter(current_user=current_user),
        )
        .group_by(Place.id)
        .having(func.count(Review.id) >= 1)
        .order_by(func.avg(Review.rating).desc())
        .limit(10)
        .all()
    )

    places = []
    for place, avg_rating, review_count in results:
        data = place.to_dict(
            current_user_id=current_user_id, is_admin=is_admin
        )
        data["avg_rating"] = round(float(avg_rating), 1) if avg_rating else None
        data["review_count"] = review_count
        places.append(data)

    return jsonify({"places": places}), 200
