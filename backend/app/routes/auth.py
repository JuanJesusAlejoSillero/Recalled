"""Authentication routes."""

import base64
import io
import secrets
import time
from datetime import timedelta

import bcrypt
import pyotp
import qrcode
from flask import Blueprint, current_app, jsonify
from flask_jwt_extended import (
    create_access_token,
    decode_token,
    get_jwt_identity,
    jwt_required,
)

from app import db, limiter
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
from app.utils.security import build_token_claims, clear_auth_cookies, set_auth_cookies

auth_bp = Blueprint("auth", __name__)


@auth_bp.after_request
def add_no_store_headers(response):
    """Prevent auth responses from being cached by browsers or proxies."""
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return response


def _verify_totp_strict(user, code):
    """Verify TOTP code with strict timing and replay prevention."""
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(code, valid_window=0):
        return False
    current_counter = int(time.time()) // 30
    if user.totp_last_counter is not None and current_counter <= user.totp_last_counter:
        return False
    user.totp_last_counter = current_counter
    return True


# Pre-computed hash used when the user does not exist, so that the response time
# is indistinguishable from a real password check (prevents user enumeration via
# timing attacks).
_DUMMY_HASH = bcrypt.hashpw(b"dummy", bcrypt.gensalt(rounds=12)).decode("utf-8")


@auth_bp.route("/login", methods=["POST"])
@limiter.limit(lambda: current_app.config["AUTH_LOGIN_RATE_LIMIT"])
@validate_json(LoginSchema)
def login(validated_data):
    """Authenticate a user and return JWT tokens."""
    user = User.query.filter_by(username=validated_data["username"]).first()

    if not user:
        # Perform a dummy bcrypt check to prevent timing-based user enumeration
        bcrypt.checkpw(validated_data["password"].encode("utf-8")[:72], _DUMMY_HASH.encode("utf-8"))
        return jsonify({"error": "Invalid username or password"}), 401

    if not user.check_password(validated_data["password"]):
        return jsonify({"error": "Invalid username or password"}), 401

    if user.totp_enabled:
        temp_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(minutes=5),
            additional_claims=build_token_claims(user, purpose="2fa_pending"),
        )
        return jsonify({"2fa_required": True, "temp_token": temp_token}), 200

    response = jsonify({"user": user.to_dict()})
    return set_auth_cookies(response, user)


@auth_bp.route("/refresh", methods=["POST"])
@limiter.limit(lambda: current_app.config["AUTH_REFRESH_RATE_LIMIT"])
@jwt_required(refresh=True)
def refresh():
    """Refresh an access token."""
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({"error": "Token no longer valid"}), 401

    response = jsonify({"message": "Session refreshed"})
    return set_auth_cookies(response, user, include_refresh=False)


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    """Get the current authenticated user."""
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict()), 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Log out the current user.

    Note: With stateless JWT, logout is handled on the client side by
    discarding the token. This endpoint exists for API completeness.
    """
    response = jsonify({"message": "Successfully logged out"})
    return clear_auth_cookies(response)


# ----- 2FA (TOTP) -----


@auth_bp.route("/2fa/setup", methods=["POST"])
@jwt_required()
@limiter.limit("5/minute")
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
        "qr_code": f"data:image/png;base64,{qr_base64}",
    }), 200


@auth_bp.route("/2fa/confirm-setup", methods=["POST"])
@jwt_required()
@limiter.limit(lambda: current_app.config["AUTH_2FA_RATE_LIMIT"])
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
    if not totp.verify(validated_data["totp_code"], valid_window=0):
        return jsonify({"error": "Invalid TOTP code"}), 401

    user.totp_enabled = True
    db.session.commit()

    # Generate recovery codes (hashed for storage, shown once to the user)
    import bcrypt as _bcrypt
    recovery_codes_plain = []
    recovery_codes_hashed = []
    for _ in range(8):
        code = secrets.token_hex(4)  # 8 hex chars, e.g. "a1b2c3d4"
        recovery_codes_plain.append(code)
        hashed = _bcrypt.hashpw(code.encode("utf-8"), _bcrypt.gensalt(rounds=10)).decode("utf-8")
        recovery_codes_hashed.append(hashed)

    user.recovery_codes = recovery_codes_hashed
    db.session.commit()

    response = jsonify({
        "message": "2FA enabled successfully",
        "recovery_codes": recovery_codes_plain,
        "user": user.to_dict(),
    })
    return set_auth_cookies(response, user)


@auth_bp.route("/2fa/disable", methods=["POST"])
@jwt_required()
@limiter.limit(lambda: current_app.config["AUTH_2FA_RATE_LIMIT"])
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

    if not _verify_totp_strict(user, validated_data["totp_code"]):
        return jsonify({"error": "Invalid TOTP code"}), 401

    user.totp_secret = None
    user.totp_enabled = False
    user.totp_last_counter = None
    db.session.commit()

    response = jsonify({
        "message": "2FA disabled successfully",
        "user": user.to_dict(),
    })
    return set_auth_cookies(response, user)


@auth_bp.route("/2fa/verify", methods=["POST"])
@limiter.limit(lambda: current_app.config["AUTH_2FA_RATE_LIMIT"])
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

    if not _verify_totp_strict(user, validated_data["totp_code"]):
        return jsonify({"error": "Invalid TOTP code"}), 401

    db.session.commit()

    response = jsonify({"user": user.to_dict()})
    return set_auth_cookies(response, user)


@auth_bp.route("/2fa/recover", methods=["POST"])
@limiter.limit("3/minute")
@validate_json(TotpCodeSchema)
def recover_2fa(validated_data):
    """Authenticate using a recovery code when TOTP is unavailable."""
    try:
        from flask import request as _req
        username = _req.get_json(silent=True).get("username", "")
    except Exception:
        return jsonify({"error": "Invalid request"}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not user.totp_enabled or not user.recovery_codes:
        return jsonify({"error": "Invalid credentials"}), 401

    import bcrypt as _bcrypt
    input_code = validated_data["totp_code"]
    stored_hashes = user.recovery_codes

    for i, hashed in enumerate(stored_hashes):
        if _bcrypt.checkpw(input_code.encode("utf-8"), hashed.encode("utf-8")):
            remaining = list(stored_hashes)
            remaining.pop(i)
            user.recovery_codes = remaining
            db.session.commit()

            response = jsonify({"user": user.to_dict()})
            return set_auth_cookies(response, user)

    return jsonify({"error": "Invalid credentials"}), 401


# ----- Account management -----


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
@limiter.limit(lambda: current_app.config["AUTH_LOGIN_RATE_LIMIT"])
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

    response = jsonify({
        "message": "Password changed successfully",
        "reauth_required": True,
    })
    return clear_auth_cookies(response)


@auth_bp.route("/delete-account", methods=["POST"])
@jwt_required()
@limiter.limit("3/minute")
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

    response = jsonify({"message": "Account deleted successfully"})
    return clear_auth_cookies(response)
