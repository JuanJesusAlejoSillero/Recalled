"""Authentication routes."""

from flask import Blueprint, jsonify
from app import db
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    jwt_required,
)

from app.models.user import User
from app.middleware.validators import validate_json
from app.schemas.user_schema import LoginSchema

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
@validate_json(LoginSchema)
def login(validated_data):
    """Authenticate a user and return JWT tokens."""
    user = User.query.filter_by(username=validated_data["username"]).first()

    if not user or not user.check_password(validated_data["password"]):
        return jsonify({"error": "Invalid username or password"}), 401

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict(include_email=True),
    }), 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Refresh an access token."""
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=str(user_id))
    return jsonify({"access_token": access_token}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    """Get the current authenticated user."""
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict(include_email=True)), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    """Log out the current user.

    Note: With stateless JWT, logout is handled on the client side by
    discarding the token. This endpoint exists for API completeness.
    """
    return jsonify({"message": "Successfully logged out"}), 200
