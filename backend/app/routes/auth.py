"""Authentication routes."""

import base64
import io
from datetime import timedelta

import pyotp
import qrcode
from flask import Blueprint, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_jwt_identity,
    jwt_required,
)

from app import db
from app.middleware.validators import validate_json
from app.models.user import User
from app.schemas.user_schema import (
    ChangePasswordSchema,
    DeleteAccountSchema,
    LoginSchema,
    TotpCodeSchema,
    TotpDisableSchema,
    TotpVerifySchema,
)

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
@validate_json(LoginSchema)
def login(validated_data):
    """Authenticate a user and return JWT tokens."""
    user = User.query.filter_by(username=validated_data["username"]).first()

    if not user or not user.check_password(validated_data["password"]):
        return jsonify({"error": "Invalid username or password"}), 401

    if user.totp_enabled:
        temp_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(minutes=5),
            additional_claims={"purpose": "2fa_pending"},
        )
        return jsonify({"2fa_required": True, "temp_token": temp_token}), 200

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


# ----- 2FA (TOTP) -----


@auth_bp.route("/2fa/setup", methods=["POST"])
@jwt_required()
def setup_2fa():
    """Generate a TOTP secret and return QR code for setup."""
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.totp_enabled:
        return jsonify({"error": "2FA is already enabled"}), 400

    secret = pyotp.random_base32()
    user.totp_secret = secret
    db.session.commit()

    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=user.username, issuer_name="Recalled"
    )

    qr = qrcode.make(provisioning_uri)
    buffer = io.BytesIO()
    qr.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return jsonify({
        "secret": secret,
        "qr_code": f"data:image/png;base64,{qr_base64}",
    }), 200


@auth_bp.route("/2fa/confirm-setup", methods=["POST"])
@jwt_required()
@validate_json(TotpCodeSchema)
def confirm_2fa_setup(validated_data):
    """Confirm 2FA setup by verifying the first TOTP code."""
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.totp_enabled:
        return jsonify({"error": "2FA is already enabled"}), 400

    if not user.totp_secret:
        return jsonify({"error": "2FA setup not initiated"}), 400

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(validated_data["totp_code"], valid_window=1):
        return jsonify({"error": "Invalid TOTP code"}), 401

    user.totp_enabled = True
    db.session.commit()

    return jsonify({
        "message": "2FA enabled successfully",
        "user": user.to_dict(include_email=True),
    }), 200


@auth_bp.route("/2fa/disable", methods=["POST"])
@jwt_required()
@validate_json(TotpDisableSchema)
def disable_2fa(validated_data):
    """Disable 2FA for the current user."""
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not user.totp_enabled:
        return jsonify({"error": "2FA is not enabled"}), 400

    if not user.check_password(validated_data["password"]):
        return jsonify({"error": "Invalid password"}), 401

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(validated_data["totp_code"], valid_window=1):
        return jsonify({"error": "Invalid TOTP code"}), 401

    user.totp_secret = None
    user.totp_enabled = False
    db.session.commit()

    return jsonify({
        "message": "2FA disabled successfully",
        "user": user.to_dict(include_email=True),
    }), 200


@auth_bp.route("/2fa/verify", methods=["POST"])
@validate_json(TotpVerifySchema)
def verify_2fa(validated_data):
    """Verify TOTP code during login and return JWT tokens."""
    try:
        token_data = decode_token(validated_data["temp_token"])
    except Exception:
        return jsonify({"error": "Invalid or expired token"}), 401

    if token_data.get("purpose") != "2fa_pending":
        return jsonify({"error": "Invalid token"}), 401

    user = db.session.get(User, int(token_data["sub"]))
    if not user or not user.totp_enabled:
        return jsonify({"error": "Invalid request"}), 400

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(validated_data["totp_code"], valid_window=1):
        return jsonify({"error": "Invalid TOTP code"}), 401

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict(include_email=True),
    }), 200


# ----- Account management -----


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
@validate_json(ChangePasswordSchema)
def change_password(validated_data):
    """Change the current user's password."""
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not user.check_password(validated_data["current_password"]):
        return jsonify({"error": "Invalid current password"}), 401

    user.set_password(validated_data["new_password"])
    db.session.commit()

    return jsonify({"message": "Password changed successfully"}), 200


@auth_bp.route("/delete-account", methods=["POST"])
@jwt_required()
@validate_json(DeleteAccountSchema)
def delete_account(validated_data):
    """Delete the current user's account."""
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.is_admin:
        return jsonify({"error": "Admin accounts cannot be self-deleted"}), 403

    if not user.check_password(validated_data["password"]):
        return jsonify({"error": "Invalid password"}), 401

    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": "Account deleted successfully"}), 200
