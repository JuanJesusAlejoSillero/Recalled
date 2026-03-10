"""Statistics routes."""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from app import db
from app.models.user import User
from app.models.review import Review
from app.models.place import Place
from app.models.photo import ReviewPhoto

stats_bp = Blueprint("stats", __name__)


@stats_bp.route("/user/<int:user_id>", methods=["GET"])
@jwt_required()
def user_stats(user_id):
    """Get statistics for a specific user."""
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
    """Get top-rated places."""
    results = (
        db.session.query(
            Place,
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).label("review_count"),
        )
        .join(Review, Place.id == Review.place_id)
        .filter(Review.is_private == False)
        .group_by(Place.id)
        .having(func.count(Review.id) >= 1)
        .order_by(func.avg(Review.rating).desc())
        .limit(10)
        .all()
    )

    places = []
    for place, avg_rating, review_count in results:
        data = place.to_dict()
        data["avg_rating"] = round(float(avg_rating), 1) if avg_rating else None
        data["review_count"] = review_count
        places.append(data)

    return jsonify({"places": places}), 200
