"""Statistics routes."""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from app import db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.review import Review
from app.models.place import Place
from app.models.photo import ReviewPhoto

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

    total_reviews = Review.query.filter_by(user_id=user_id).count()
    total_photos = (
        db.session.query(func.count(ReviewPhoto.id))
        .join(Review, ReviewPhoto.review_id == Review.id)
        .filter(Review.user_id == user_id)
        .scalar()
    )
    avg_rating = (
        db.session.query(func.avg(Review.rating))
        .filter(Review.user_id == user_id)
        .scalar()
    )
    places_visited = (
        db.session.query(func.count(func.distinct(Review.place_id)))
        .filter(Review.user_id == user_id)
        .scalar()
    )

    # Rating distribution
    rating_dist = dict(
        db.session.query(Review.rating, func.count(Review.id))
        .filter(Review.user_id == user_id)
        .group_by(Review.rating)
        .all()
    )

    return jsonify({
        "user": user.to_dict(),
        "stats": {
            "total_reviews": total_reviews,
            "total_photos": total_photos or 0,
            "avg_rating": round(avg_rating, 1) if avg_rating else None,
            "places_visited": places_visited or 0,
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

    review_filter = Review.is_private == False
    place_filter = Place.is_private == False
    if not is_admin and current_user_id:
        review_filter = db.or_(
            Review.is_private == False, Review.user_id == current_user_id
        )
        place_filter = db.or_(
            Place.is_private == False, Place.created_by == current_user_id
        )

    results = (
        db.session.query(
            Place,
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).label("review_count"),
        )
        .join(Review, Place.id == Review.place_id)
        .filter(review_filter, place_filter)
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
