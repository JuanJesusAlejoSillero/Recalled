import importlib


def test_csv_environment_values_are_normalized(app):
    assert app.config["CORS_ORIGINS"] == [
        "http://localhost",
        "https://frontend.example",
    ]
    assert app.config["ALLOWED_EXTENSIONS"] == {"jpg", "png", "webp"}


def test_content_module_flags_are_normalized(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-0123456789abcdef0123456789abcdef")
    monkeypatch.setenv("JWT_SECRET_KEY", "test-jwt-secret-0123456789abcdef0123456789abcdef")
    monkeypatch.setenv("ENABLE_MOVIES", "false")
    monkeypatch.setenv("ENABLE_SERIES", "YES")
    monkeypatch.setenv("ENABLE_BOOKS", "0")
    monkeypatch.setenv("ENABLE_VIDEOGAMES", "on")
    monkeypatch.setenv("ENABLE_PEOPLE", "no")

    import app.config as config_module

    config_module = importlib.reload(config_module)

    assert config_module.Config.CONTENT_MODULE_FLAGS == {
        "place": True,
        "movie": False,
        "series": True,
        "book": False,
        "videogame": True,
        "person": False,
    }
    assert config_module.Config.ENABLED_CONTENT_TYPES == (
        "place",
        "series",
        "videogame",
    )