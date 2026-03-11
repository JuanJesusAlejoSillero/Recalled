"""User management routes (admin only for most operations)."""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models.user import User
from app.middleware.auth import admin_required, get_current_user
from app.middleware.validators import validate_json
from app.schemas.user_schema import UserCreateSchema, UserUpdateSchema

users_bp = Blueprint("users", __name__)


@users_bp.route("", methods=["GET"])
@admin_required
def list_users():
    """List all users (admin only)."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 100)  # Cap maximum

    pagination = User.query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "users": [u.to_dict() for u in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "per_page": per_page,
    }), 200


@users_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user(user_id):
    """Get a specific user (admin or self)."""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Authentication required"}), 401

    user = User.query.get_or_404(user_id, description="User not found")

    return jsonify(user.to_dict()), 200


@users_bp.route("", methods=["POST"])
@admin_required
@validate_json(UserCreateSchema)
def create_user(validated_data):
    """Create a new user (admin only)."""
    # Check for existing username
    if User.query.filter_by(username=validated_data["username"]).first():
        return jsonify({"error": "Username already exists"}), 409

    user = User(
        username=validated_data["username"],
        is_admin=validated_data.get("is_admin", False),
    )
    user.set_password(validated_data["password"])

    db.session.add(user)
    db.session.commit()

    return jsonify(user.to_dict()), 201


@users_bp.route("/<int:user_id>", methods=["PUT"])
@jwt_required()
@validate_json(UserUpdateSchema)
def update_user(user_id, validated_data):
    """Update a user (admin or self)."""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "Authentication required"}), 401

    user = User.query.get_or_404(user_id, description="User not found")

    # Only admin or the user themselves can update
    if current_user.id != user_id and not current_user.is_admin:
        return jsonify({"error": "Permission denied"}), 403

    # Only admin can change is_admin flag
    if "is_admin" in validated_data and not current_user.is_admin:
        return jsonify({"error": "Only admins can change admin status"}), 403

    # Check for duplicate username
    if "username" in validated_data and validated_data["username"] != user.username:
        if User.query.filter_by(username=validated_data["username"]).first():
            return jsonify({"error": "Username already exists"}), 409

    # Apply updates
    if "username" in validated_data:
        user.username = validated_data["username"]
    if "password" in validated_data:
        user.set_password(validated_data["password"])
    if "is_admin" in validated_data:
        user.is_admin = validated_data["is_admin"]

    db.session.commit()

    return jsonify(user.to_dict()), 200


@users_bp.route("/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    """Delete a user (admin only)."""
    current_user = get_current_user()
    if current_user and current_user.id == user_id:
        return jsonify({"error": "Cannot delete your own account"}), 400

    user = User.query.get_or_404(user_id, description="User not found")

    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": f"User '{user.username}' deleted"}), 200
