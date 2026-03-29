"""Application configuration."""

import os
from datetime import timedelta

# Directorio base del backend (backend/)
basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))


class Config:
    """Flask application configuration."""

    # Flask
    SECRET_KEY = os.environ.get("SECRET_KEY")
    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY environment variable is required")

    # Database - ruta absoluta para evitar problemas con instance_path de Flask
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
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

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
