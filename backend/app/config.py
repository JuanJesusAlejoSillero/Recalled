"""Application configuration."""

import os
from datetime import timedelta

# Backend base directory (backend/)
basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))


class Config:
    """Flask application configuration."""

    @staticmethod
    def _get_bool(name: str, default: bool = False) -> bool:
        value = os.environ.get(name)
        if value is None:
            return default
        return value.strip().lower() in {"1", "true", "yes", "on"}

    @staticmethod
    def _get_int(name: str, default: int) -> int:
        value = os.environ.get(name)
        if value is None:
            return default
        try:
            return int(value)
        except ValueError as exc:
            raise RuntimeError(f"{name} environment variable must be an integer") from exc

    @staticmethod
    def _get_samesite(name: str, default: str = "Lax") -> str:
        value = os.environ.get(name, default).strip()
        normalized = value.lower()
        if normalized == "none":
            return "None"
        if normalized == "lax":
            return "Lax"
        if normalized == "strict":
            return "Strict"
        raise RuntimeError(
            f"{name} environment variable must be one of: Lax, Strict, None"
        )

    # Flask
    SECRET_KEY = os.environ.get("SECRET_KEY")
    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY environment variable is required")
    PROXY_FIX_X_FOR = _get_int.__func__("PROXY_FIX_X_FOR", 1)

    # Database - use an absolute path to avoid Flask instance_path issues
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(basedir, 'data', 'reviews.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
    if not JWT_SECRET_KEY:
        raise RuntimeError("JWT_SECRET_KEY environment variable is required")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_COOKIE_SECURE = _get_bool.__func__("JWT_COOKIE_SECURE", False)
    JWT_COOKIE_SAMESITE = _get_samesite.__func__("JWT_COOKIE_SAMESITE", "Lax")
    if JWT_COOKIE_SAMESITE == "None" and not JWT_COOKIE_SECURE:
        raise RuntimeError(
            "JWT_COOKIE_SAMESITE=None requires JWT_COOKIE_SECURE=true. "
            "Use JWT_COOKIE_SAMESITE=Lax or Strict for plain HTTP development."
        )
    JWT_COOKIE_CSRF_PROTECT = True
    JWT_SESSION_COOKIE = False
    JWT_ACCESS_COOKIE_PATH = "/api/"
    JWT_REFRESH_COOKIE_PATH = "/api/v1/auth/refresh"
    JWT_ACCESS_CSRF_COOKIE_PATH = "/"
    JWT_REFRESH_CSRF_COOKIE_PATH = "/"

    # Auth hardening
    AUTH_LOGIN_RATE_LIMIT = os.environ.get("AUTH_LOGIN_RATE_LIMIT", "5/minute")
    AUTH_2FA_RATE_LIMIT = os.environ.get("AUTH_2FA_RATE_LIMIT", "10/minute")
    AUTH_REFRESH_RATE_LIMIT = os.environ.get("AUTH_REFRESH_RATE_LIMIT", "30/minute")
    RATELIMIT_STORAGE_URI = os.environ.get("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_HEADERS_ENABLED = True

    # File uploads
    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "/app/uploads")
    MAX_CONTENT_LENGTH = int(
        os.environ.get("MAX_CONTENT_LENGTH", 52428800)
    )  # 50MB (multiple photo uploads)
    ALLOWED_EXTENSIONS = set(
        os.environ.get("ALLOWED_EXTENSIONS", "jpg,jpeg,png,webp").split(",")
    )

    # CORS
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost")

    # Admin
    ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")

    # Image processing
    MAX_IMAGE_WIDTH = 1920
    MAX_IMAGE_HEIGHT = 1080
    THUMBNAIL_SIZE = (300, 300)
    IMAGE_QUALITY = 85

    # Pagination
    ITEMS_PER_PAGE = 20
