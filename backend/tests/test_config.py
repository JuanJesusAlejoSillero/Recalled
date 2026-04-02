def test_csv_environment_values_are_normalized(app):
    assert app.config["CORS_ORIGINS"] == [
        "http://localhost",
        "https://frontend.example",
    ]
    assert app.config["ALLOWED_EXTENSIONS"] == {"jpg", "png", "webp"}