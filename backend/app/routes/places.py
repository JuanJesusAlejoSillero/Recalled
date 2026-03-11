"""Places routes."""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from app import db
from app.models.place import Place
from app.models.review import Review
from app.middleware.auth import admin_required, get_current_user
from app.middleware.validators import validate_json
from app.schemas.place_schema import PlaceCreateSchema

places_bp = Blueprint("places", __name__)


def _user_context():
    """Return (current_user_id, is_admin) for the authenticated user."""
    user = get_current_user()
    if user:
        return user.id, user.is_admin
    return None, False


def _visible_reviews_subquery(current_user_id, is_admin):
    """Subquery that counts visible reviews per place for the given user."""
    query = db.session.query(
        Review.place_id,
        func.count(Review.id).label("visible_count"),
        func.avg(Review.rating).label("avg_r"),
    )
    if not is_admin:
        if current_user_id:
            query = query.filter(
                db.or_(Review.is_private == False, Review.user_id == current_user_id)
            )
        else:
            query = query.filter(Review.is_private == False)
    return query.group_by(Review.place_id).subquery()


@places_bp.route("", methods=["GET"])
@jwt_required()
def list_places():
    """List all places with optional filters.

    Only places that have at least one visible review for the current user
    are returned.
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 100)

    category = request.args.get("category")
    search = request.args.get("search")
    sort = request.args.get("sort", "name")  # name, rating, recent

    current_user_id, is_admin = _user_context()
    vis_sub = _visible_reviews_subquery(current_user_id, is_admin)

    # Inner join ensures only places with visible_count > 0 appear
    query = Place.query.join(vis_sub, Place.id == vis_sub.c.place_id)

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
    """Get a specific place with its reviews.

    Returns 404 if the place has no reviews visible to the current user,
    preventing information leakage about places with only others' private
    reviews.
    """
    place = Place.query.get_or_404(place_id, description="Place not found")
    current_user_id, is_admin = _user_context()

    data = place.to_dict(
        include_reviews=True,
        current_user_id=current_user_id,
        is_admin=is_admin,
    )

    # Hide places that only have private reviews from other users
    if not is_admin and data["review_count"] == 0:
        return jsonify({"error": "Place not found"}), 404

    return jsonify(data), 200


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
    """Get all reviews for a specific place (privacy-aware)."""
    place = Place.query.get_or_404(place_id, description="Place not found")
    current_user_id, is_admin = _user_context()

    # Hide places that only have private reviews from other users
    if not is_admin:
        vis_sub = _visible_reviews_subquery(current_user_id, is_admin)
        has_visible = (
            db.session.query(vis_sub.c.visible_count)
            .filter(vis_sub.c.place_id == place_id)
            .scalar()
        )
        if not has_visible:
            return jsonify({"error": "Place not found"}), 404

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 100)

    query = Review.query.filter(Review.place_id == place_id)
    if not is_admin:
        if current_user_id:
            query = query.filter(
                db.or_(Review.is_private == False, Review.user_id == current_user_id)
            )
        else:
            query = query.filter(Review.is_private == False)

    pagination = query.order_by(
        Review.created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "reviews": [r.to_dict() for r in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "place": place.to_dict(current_user_id=current_user_id, is_admin=is_admin),
    }), 200
