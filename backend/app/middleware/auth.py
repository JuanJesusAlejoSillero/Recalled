"""Authentication middleware and decorators."""

from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app import db
from app.models.user import User


def admin_required(fn):
    """Decorator that requires the current user to be an admin."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = db.session.get(User, int(user_id))
        if not user or not user.is_admin:
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper


def get_current_user() -> User | None:
    """Get the current authenticated user from JWT."""
    user_id = get_jwt_identity()
    if user_id is None:
        return None
    return db.session.get(User, int(user_id))


def owner_or_admin_required(get_owner_id):
    """Decorator that requires the current user to be the owner or an admin.

    Args:
        get_owner_id: A callable that receives the same args as the decorated
                      function and returns the owner's user_id.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            current_user = get_current_user()
            if not current_user:
                return jsonify({"error": "Authentication required"}), 401
            owner_id = get_owner_id(*args, **kwargs)
            if current_user.id != owner_id and not current_user.is_admin:
                return jsonify({"error": "Permission denied"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
