import io


_PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc``\x00\x00\x00"
    b"\x04\x00\x01\xf6\x178U\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _image_upload(filename="photo.png"):
    return (io.BytesIO(_PNG_1X1), filename)


def _create_photo(app, review_id, filename="testphoto.jpg"):
    from app import db
    from app.models.photo import ReviewPhoto

    with app.app_context():
        photo = ReviewPhoto(review_id=review_id, filename=filename)
        db.session.add(photo)
        db.session.commit()
        return photo.id


def _create_user(app, username, password="Password123!", is_admin=False):
    from app import db
    from app.models.user import User

    with app.app_context():
        user = User(username=username, is_admin=is_admin)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user.id


def _create_place(app, name, created_by, is_private=False):
    from app import db
    from app.models.place import Place

    with app.app_context():
        place = Place(name=name, created_by=created_by, is_private=is_private)
        db.session.add(place)
        db.session.commit()
        return place.id


def _create_review(app, user_id, place_id, rating=5, is_private=False, title="Review"):
    from app import db
    from app.models.review import Review

    with app.app_context():
        review = Review(
            user_id=user_id,
            place_id=place_id,
            rating=rating,
            title=title,
            is_private=is_private,
        )
        db.session.add(review)
        db.session.commit()
        return review.id


def _get_review(app, review_id):
    from app import db
    from app.models.review import Review

    with app.app_context():
        review = db.session.get(Review, review_id)
        return review.to_dict(include_photos=False) if review else None


def _get_place(app, place_id):
    from app import db
    from app.models.place import Place

    with app.app_context():
        place = db.session.get(Place, place_id)
        return place.to_dict() if place else None


def _login(client, username, password="Password123!", remote_addr="127.0.0.1"):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
        environ_overrides={"REMOTE_ADDR": remote_addr},
    )
    return response


def _login_session(client, username, password="Password123!", remote_addr="127.0.0.1"):
    response = _login(client, username, password=password, remote_addr=remote_addr)
    assert response.status_code == 200
    return response.get_json()


def _get_cookie(client, name):
    for path in ("/", "/api/", "/api/v1/auth/refresh"):
        cookie = client.get_cookie(name, path=path)
        if cookie is not None:
            return cookie
    return None


def _csrf_headers(client, refresh=False):
    cookie_name = "csrf_refresh_token" if refresh else "csrf_access_token"
    cookie = _get_cookie(client, cookie_name)
    assert cookie is not None
    return {"X-CSRF-TOKEN": cookie.value}


def test_get_user_requires_self_or_admin(app, client):
    alice_id = _create_user(app, "alice")
    bob_id = _create_user(app, "bob")

    _login_session(client, "alice")
    response = client.get(f"/api/v1/users/{bob_id}")

    assert alice_id != bob_id
    assert response.status_code == 403
    assert response.get_json()["error"] == "Permission denied"


def test_user_stats_requires_self_or_admin(app, client):
    _create_user(app, "alice")
    bob_id = _create_user(app, "bob")

    _login_session(client, "alice")
    response = client.get(f"/api/v1/stats/user/{bob_id}")

    assert response.status_code == 403
    assert response.get_json()["error"] == "Permission denied"


def test_private_place_reviews_are_hidden_and_protected(app, client):
    alice_id = _create_user(app, "alice")
    _create_user(app, "bob")
    private_place_id = _create_place(app, "Secret Place", created_by=alice_id, is_private=True)
    legacy_review_id = _create_review(
        app,
        user_id=alice_id,
        place_id=private_place_id,
        rating=5,
        is_private=False,
        title="Legacy public review",
    )

    _login_session(client, "bob")

    get_response = client.get(f"/api/v1/reviews/{legacy_review_id}")
    list_response = client.get(
        "/api/v1/reviews",
        query_string={"place_id": private_place_id},
    )
    top_places_response = client.get("/api/v1/stats/places")
    attach_response = client.post(
        "/api/v1/reviews",
        json={
            "place_id": private_place_id,
            "rating": 4,
            "title": "Should fail",
            "comment": "not allowed",
            "is_private": False,
        },
        headers=_csrf_headers(client),
    )

    assert get_response.status_code == 404
    assert list_response.status_code == 200
    assert list_response.get_json()["reviews"] == []
    assert attach_response.status_code == 404
    assert all(
        place["id"] != private_place_id
        for place in top_places_response.get_json()["places"]
    )

    _login_session(client, "alice")
    create_response = client.post(
        "/api/v1/reviews",
        json={
            "place_id": private_place_id,
            "rating": 4,
            "title": "Owner review",
            "comment": "should become private",
            "is_private": False,
        },
        headers=_csrf_headers(client),
    )

    assert create_response.status_code == 201
    created_review = create_response.get_json()
    assert created_review["is_private"] is True
    assert _get_review(app, created_review["id"])["is_private"] is True


def test_password_change_invalidates_existing_tokens(app, client):
    _create_user(app, "alice")

    _login_session(client, "alice")

    change_response = client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "Password123!",
            "new_password": "NewPassword123!",
        },
        headers=_csrf_headers(client),
    )
    me_response = client.get("/api/v1/auth/me")
    refresh_response = client.post("/api/v1/auth/refresh")
    relogin_response = _login(client, "alice", password="NewPassword123!")

    assert change_response.status_code == 200
    assert me_response.status_code == 401
    assert refresh_response.status_code == 401
    assert relogin_response.status_code == 200


def test_login_is_rate_limited(app, client):
    _create_user(app, "alice")
    remote_addr = "198.51.100.23"

    responses = [
        _login(client, "alice", password="wrong-password", remote_addr=remote_addr)
        for _ in range(6)
    ]

    assert [response.status_code for response in responses[:5]] == [401] * 5
    assert responses[5].status_code == 429
    assert responses[5].get_json()["error"] == "Rate limit exceeded"


def test_username_change_rotates_cookie_session(app, client):
    alice_id = _create_user(app, "alice")

    _login_session(client, "alice")
    old_cookie = _get_cookie(client, "access_token_cookie")

    response = client.put(
        f"/api/v1/users/{alice_id}",
        json={"username": "alice_renamed"},
        headers=_csrf_headers(client),
    )
    me_response = client.get("/api/v1/auth/me")
    new_cookie = _get_cookie(client, "access_token_cookie")

    assert response.status_code == 200
    assert response.get_json()["username"] == "alice_renamed"
    assert old_cookie is not None
    assert new_cookie is not None
    assert new_cookie.value != old_cookie.value
    assert me_response.status_code == 200
    assert me_response.get_json()["username"] == "alice_renamed"


def test_place_owner_can_update_coordinates_without_full_payload(app, client):
    alice_id = _create_user(app, "alice")
    place_id = _create_place(app, "Coordinate Spot", created_by=alice_id)

    _login_session(client, "alice")
    response = client.put(
        f"/api/v1/places/{place_id}",
        json={"latitude": 40.4168, "longitude": -3.7038},
        headers=_csrf_headers(client),
    )

    assert response.status_code == 200
    place = _get_place(app, place_id)
    assert place["name"] == "Coordinate Spot"
    assert place["latitude"] == 40.4168
    assert place["longitude"] == -3.7038


def test_review_photo_limit_is_enforced_in_backend(app, client):
    alice_id = _create_user(app, "alice")
    place_id = _create_place(app, "Photo Spot", created_by=alice_id)
    review_id = _create_review(app, user_id=alice_id, place_id=place_id)

    for index in range(5):
        _create_photo(app, review_id, filename=f"existing-{index}.png")

    _login_session(client, "alice")
    response = client.post(
        f"/api/v1/reviews/{review_id}/photos",
        data={"photos": [_image_upload("extra.png")]},
        headers=_csrf_headers(client),
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "Photo limit reached for this review"


def test_starting_2fa_setup_keeps_session_valid(app, client):
    _create_user(app, "alice")

    _login_session(client, "alice")
    setup_response = client.post("/api/v1/auth/2fa/setup", headers=_csrf_headers(client))
    me_response = client.get("/api/v1/auth/me")

    assert setup_response.status_code == 200
    assert "secret" in setup_response.get_json()
    assert "qr_code" in setup_response.get_json()
    assert me_response.status_code == 200
    assert me_response.get_json()["username"] == "alice"


def test_auth_responses_disable_caching(app, client):
    _create_user(app, "alice")

    response = _login(client, "alice")
    data = response.get_json()

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    assert response.headers["Pragma"] == "no-cache"
    assert "access_token" not in data
    assert "refresh_token" not in data
    assert data["user"]["username"] == "alice"
    assert _get_cookie(client, "access_token_cookie") is not None
    assert _get_cookie(client, "refresh_token_cookie") is not None


def test_media_requires_auth_and_visibility(app, client):
    """Photos on private places/reviews must be inaccessible to outsiders."""
    import os
    from flask import current_app as _  # noqa: just trigger app context

    alice_id = _create_user(app, "alice")
    _create_user(app, "bob")

    # Create a private place + review + photo record
    private_place_id = _create_place(app, "Private Spot", created_by=alice_id, is_private=True)
    review_id = _create_review(
        app, user_id=alice_id, place_id=private_place_id,
        rating=5, is_private=True, title="Secret review",
    )
    _create_photo(app, review_id, filename="secret.jpg")

    # Write a dummy file so send_from_directory can serve it
    with app.app_context():
        photos_dir = os.path.join(app.config["UPLOAD_FOLDER"], "photos")
        os.makedirs(photos_dir, exist_ok=True)
        with open(os.path.join(photos_dir, "secret.jpg"), "wb") as f:
            f.write(b"\xff\xd8\xffDUMMY")

    # Unauthenticated access must fail
    anon_response = client.get("/api/v1/media/photos/secret.jpg")
    assert anon_response.status_code == 401

    # Bob (not the owner) must be denied
    _login_session(client, "bob")
    bob_response = client.get("/api/v1/media/photos/secret.jpg")
    assert bob_response.status_code == 404

    # Alice (the owner) should get the file
    _login_session(client, "alice")
    alice_response = client.get("/api/v1/media/photos/secret.jpg")
    assert alice_response.status_code == 200

    # Old /uploads/ path must be dead
    legacy_response = client.get("/uploads/photos/secret.jpg")
    assert legacy_response.status_code == 404
