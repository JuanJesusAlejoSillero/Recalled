"""Places routes."""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
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


def _place_visible_to_user(place, current_user_id, is_admin):
    """Check if a place is visible to the given user."""
    if is_admin:
        return True
    if not place.is_private:
        return True
    if current_user_id and place.created_by == current_user_id:
        return True
    return False


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

    current_user_id, is_admin = _user_context()
    vis_sub = _visible_reviews_subquery(current_user_id, is_admin)

    # Left join: include places even if they have no visible reviews
    query = Place.query.outerjoin(vis_sub, Place.id == vis_sub.c.place_id)

    # Visibility filter: public places OR user's own private places OR admin sees all
    if not is_admin:
        query = query.filter(
            db.or_(
                Place.is_private == False,
                Place.created_by == current_user_id,
            )
        )

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
    user_id = int(get_jwt_identity())
    place = Place(created_by=user_id, **validated_data)
    db.session.add(place)
    db.session.commit()

    current_user_id, is_admin = _user_context()
    return jsonify(place.to_dict(current_user_id=current_user_id, is_admin=is_admin)), 201


@places_bp.route("/<int:place_id>", methods=["PUT"])
@jwt_required()
@validate_json(PlaceCreateSchema)
def update_place(place_id, validated_data):
    """Update a place (creator or admin)."""
    place = Place.query.get_or_404(place_id, description="Place not found")
    current_user = get_current_user()

    if not current_user:
        return jsonify({"error": "Authentication required"}), 401

    if place.created_by != current_user.id and not current_user.is_admin:
        return jsonify({"error": "Permission denied"}), 403

    for key, value in validated_data.items():
        setattr(place, key, value)

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
    current_user_id, is_admin = _user_context()

    if not _place_visible_to_user(place, current_user_id, is_admin):
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
