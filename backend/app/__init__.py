"""Recalled Application - Flask Factory."""

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_migrate import Migrate

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # Load configuration
    from app.config import Config
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    CORS(app, origins=app.config.get("CORS_ORIGINS", "").split(","),
         supports_credentials=True)

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.places import places_bp
    from app.routes.reviews import reviews_bp
    from app.routes.stats import stats_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(users_bp, url_prefix="/api/v1/users")
    app.register_blueprint(places_bp, url_prefix="/api/v1/places")
    app.register_blueprint(reviews_bp, url_prefix="/api/v1/reviews")
    app.register_blueprint(stats_bp, url_prefix="/api/v1/stats")

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

    # Serve uploaded files
    @app.route("/uploads/<path:filename>")
    def uploaded_file(filename):
        from flask import send_from_directory
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {"error": "Token has expired"}, 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {"error": "Invalid token"}, 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {"error": "Authorization token is missing"}, 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return {"error": "Token has been revoked"}, 401

    @jwt.token_verification_loader
    def verify_token_claims(jwt_header, jwt_payload):
        """Reject 2FA pending tokens from being used as regular tokens."""
        return jwt_payload.get("purpose") != "2fa_pending"

    @jwt.token_verification_failed_loader
    def token_verification_failed(jwt_header, jwt_payload):
        """Return error when token verification fails (e.g. 2FA pending token)."""
        return {"error": "Token verification failed"}, 401

    return app
