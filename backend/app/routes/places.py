"""Places routes."""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from app import db
from app.models.place import Place
from app.models.review import Review
from app.middleware.auth import admin_required
from app.middleware.validators import validate_json
from app.schemas.place_schema import PlaceCreateSchema

places_bp = Blueprint("places", __name__)


@places_bp.route("", methods=["GET"])
@jwt_required()
def list_places():
    """List all places with optional filters."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 100)

    category = request.args.get("category")
    search = request.args.get("search")
    sort = request.args.get("sort", "name")  # name, rating, recent

    query = Place.query

    if category:
        query = query.filter(Place.category == category)

    if search:
        query = query.filter(Place.name.ilike(f"%{search}%"))

    if sort == "rating":
        # Use a subquery to sort by average rating at DB level
        avg_rating_sub = (
            db.session.query(
                Review.place_id,
                func.avg(Review.rating).label("avg_r")
            )
            .group_by(Review.place_id)
            .subquery()
        )
        query = (
            query.outerjoin(avg_rating_sub, Place.id == avg_rating_sub.c.place_id)
            .order_by(avg_rating_sub.c.avg_r.desc().nulls_last())
        )
    elif sort == "recent":
        query = query.order_by(Place.created_at.desc())
    else:
        query = query.order_by(Place.name.asc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    places = [p.to_dict() for p in pagination.items]

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
    return jsonify(place.to_dict(include_reviews=True)), 200


@places_bp.route("", methods=["POST"])
@jwt_required()
@validate_json(PlaceCreateSchema)
def create_place(validated_data):
    """Create a new place."""
    place = Place(**validated_data)
    db.session.add(place)
    db.session.commit()

    return jsonify(place.to_dict()), 201


@places_bp.route("/<int:place_id>", methods=["PUT"])
@admin_required
@validate_json(PlaceCreateSchema)
def update_place(place_id, validated_data):
    """Update a place (admin only)."""
    place = Place.query.get_or_404(place_id, description="Place not found")

    for key, value in validated_data.items():
        setattr(place, key, value)

    db.session.commit()

    return jsonify(place.to_dict()), 200


@places_bp.route("/<int:place_id>", methods=["DELETE"])
@admin_required
def delete_place(place_id):
    """Delete a place and all its reviews (admin only)."""
    place = Place.query.get_or_404(place_id, description="Place not found")

    db.session.delete(place)
    db.session.commit()

    return jsonify({"message": f"Place '{place.name}' deleted"}), 200


@places_bp.route("/<int:place_id>/reviews", methods=["GET"])
@jwt_required()
def get_place_reviews(place_id):
    """Get all reviews for a specific place."""
    place = Place.query.get_or_404(place_id, description="Place not found")

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 100)

    pagination = place.reviews.order_by(
        Review.created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "reviews": [r.to_dict() for r in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "place": place.to_dict(),
    }), 200
