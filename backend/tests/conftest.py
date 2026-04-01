from pathlib import Path
import sys

import pytest


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


@pytest.fixture
def app(tmp_path, monkeypatch):
    database_path = tmp_path / "test.db"
    upload_dir = tmp_path / "uploads"

    monkeypatch.setenv("SECRET_KEY", "test-secret-key-0123456789abcdef0123456789abcdef")
    monkeypatch.setenv("JWT_SECRET_KEY", "test-jwt-secret-0123456789abcdef0123456789abcdef")
    monkeypatch.setenv("ADMIN_PASSWORD", "AdminPassword123!")
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{database_path}")
    monkeypatch.setenv("UPLOAD_FOLDER", str(upload_dir))
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost")
    monkeypatch.setenv("AUTH_LOGIN_RATE_LIMIT", "5/minute")
    monkeypatch.setenv("AUTH_2FA_RATE_LIMIT", "10/minute")
    monkeypatch.setenv("AUTH_REFRESH_RATE_LIMIT", "30/minute")
    monkeypatch.setenv("RATELIMIT_STORAGE_URI", "memory://")

    from app import create_app, db

    app = create_app()
    app.config.update(TESTING=True)

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()
