"""Recalled Application - Flask Factory."""

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from werkzeug.middleware.proxy_fix import ProxyFix

from app.utils.security import clear_auth_cookies

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
limiter = Limiter(key_func=get_remote_address, default_limits=[])


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    # Load configuration
    from app.config import Config
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)
    CORS(app, origins=app.config.get("CORS_ORIGINS", "").split(","),
         supports_credentials=True)

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.places import places_bp
    from app.routes.reviews import reviews_bp
    from app.routes.stats import stats_bp
    from app.routes.media import media_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(users_bp, url_prefix="/api/v1/users")
    app.register_blueprint(places_bp, url_prefix="/api/v1/places")
    app.register_blueprint(reviews_bp, url_prefix="/api/v1/reviews")
    app.register_blueprint(stats_bp, url_prefix="/api/v1/stats")
    app.register_blueprint(media_bp, url_prefix="/api/v1/media")

    # Health check endpoint
    @app.route("/api/v1/health")
    def health():
        return {"status": "ok"}, 200

    # App version endpoint (version baked into /app/VERSION at image build time)
    @app.route("/api/v1/version")
    def version():
        try:
            with open("/app/VERSION") as f:
                return {"version": f.read().strip()}, 200
        except OSError:
            return {"version": "dev"}, 200

    # Legacy /uploads/ redirect - kept only as a fallback for old URLs.
    # New code should use /api/v1/media/ which enforces auth + visibility.
    @app.route("/uploads/<path:filename>")
    def uploaded_file(filename):
        from flask import abort
        abort(404)

    @app.errorhandler(429)
    def ratelimit_handler(error):
        return {"error": "Rate limit exceeded"}, 429

    def auth_error(message: str, status_code: int):
        response = jsonify({"error": message})
        response.status_code = status_code
        return clear_auth_cookies(response)

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return auth_error("Token has expired", 401)

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return auth_error("Invalid token", 401)

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return auth_error("Authorization token is missing", 401)

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return auth_error("Token has been revoked", 401)

    @jwt.token_verification_loader
    def verify_token_claims(jwt_header, jwt_payload):
        """Reject stale tokens and 2FA-pending tokens from protected routes."""
        from app.models.user import User
        from app.utils.security import token_matches_user_state

        if jwt_payload.get("purpose") == "2fa_pending":
            return False

        try:
            user_id = int(jwt_payload.get("sub"))
        except (TypeError, ValueError):
            return False

        user = db.session.get(User, user_id)
        if not user:
            return False

        return token_matches_user_state(jwt_payload, user)

    @jwt.token_verification_failed_loader
    def token_verification_failed(jwt_header, jwt_payload):
        """Return error when token verification fails (e.g. 2FA pending token)."""
        return auth_error("Token verification failed", 401)

    return app
