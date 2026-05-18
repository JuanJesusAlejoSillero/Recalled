from app import db
from app.models.place import Place
from app.models.review import Review
from app.models.user import User


def _create_user(app, username, password="Password123!", is_admin=False):
    with app.app_context():
        user = User(username=username, is_admin=is_admin)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user.id


def _login_session(client, username, password="Password123!"):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return response


def _csrf_headers(client):
    cookie = client.get_cookie("csrf_access_token", path="/")
    assert cookie is not None
    return {"X-CSRF-TOKEN": cookie.value}


def _create_place(app, name, created_by, content_type="place", details=None):
    with app.app_context():
        place = Place(
            name=name,
            created_by=created_by,
            content_type=content_type,
            details=details or {},
        )
        db.session.add(place)
        db.session.commit()
        return place.id


def _create_review(app, user_id, place_id, rating=5, title="Review"):
    with app.app_context():
        review = Review(
            user_id=user_id,
            place_id=place_id,
            rating=rating,
            title=title,
        )
        db.session.add(review)
        db.session.commit()
        return review.id


def test_places_can_be_filtered_by_content_type(app, client):
    alice_id = _create_user(app, "alice")
    _create_place(app, "Paris", created_by=alice_id, content_type="place")
    movie_id = _create_place(app, "Blade Runner", created_by=alice_id, content_type="movie")

    _login_session(client, "alice")

    response = client.get("/api/v1/places", query_string={"content_type": "movie"})

    assert response.status_code == 200
    assert response.get_json()["places"] == [
        {
            "address": None,
            "avg_rating": None,
            "content_type": "movie",
            "created_at": response.get_json()["places"][0]["created_at"],
            "created_by": alice_id,
            "creator_username": "alice",
            "details": {},
            "id": movie_id,
            "is_private": False,
            "latitude": None,
            "longitude": None,
            "name": "Blade Runner",
            "review_count": 0,
            "shared_with_count": 0,
            "visibility_mode": "public",
            "visibility_user_ids": [],
            "visibility_users": [],
            "category": None,
        }
    ]


def test_disabled_content_module_is_rejected_for_create_and_read(app, client):
    alice_id = _create_user(app, "alice")
    movie_id = _create_place(app, "Alien", created_by=alice_id, content_type="movie")
    app.config["CONTENT_MODULE_FLAGS"]["movie"] = False

    _login_session(client, "alice")

    create_response = client.post(
        "/api/v1/places",
        json={"name": "Heat", "content_type": "movie"},
        headers=_csrf_headers(client),
    )
    get_response = client.get(f"/api/v1/places/{movie_id}")
    list_response = client.get("/api/v1/places")

    assert create_response.status_code == 404
    assert create_response.get_json()["error"] == "Content module not enabled"
    assert get_response.status_code == 404
    assert get_response.get_json()["error"] == "Content module not enabled"
    assert list_response.status_code == 200
    assert list_response.get_json()["places"] == []


def test_disabled_places_module_is_rejected_and_hidden_from_stats(app, client):
    alice_id = _create_user(app, "alice")
    place_id = _create_place(app, "Paris", created_by=alice_id, content_type="place")
    _create_review(app, alice_id, place_id, title="Trip")
    app.config["CONTENT_MODULE_FLAGS"]["place"] = False

    _login_session(client, "alice")

    create_response = client.post(
        "/api/v1/places",
        json={"name": "Berlin", "content_type": "place"},
        headers=_csrf_headers(client),
    )
    detail_response = client.get(f"/api/v1/places/{place_id}")
    list_response = client.get("/api/v1/places")
    stats_response = client.get("/api/v1/stats/places")

    assert create_response.status_code == 404
    assert create_response.get_json()["error"] == "Content module not enabled"
    assert detail_response.status_code == 404
    assert detail_response.get_json()["error"] == "Content module not enabled"
    assert list_response.status_code == 200
    assert list_response.get_json()["places"] == []
    assert stats_response.status_code == 200
    assert stats_response.get_json()["places"] == []


def test_inline_review_creation_serializes_place_content_type(app, client):
    _create_user(app, "alice")
    _login_session(client, "alice")

    movie_details = {
        "director": "Denis Villeneuve",
        "release_year": 2016,
        "genre": "Sci-Fi",
        "duration_minutes": 116,
        "country": "United States",
    }

    response = client.post(
        "/api/v1/reviews",
        json={
            "place_name": "Arrival",
            "place_content_type": "movie",
            "place_details": movie_details,
            "rating": 5,
            "title": "Outstanding",
        },
        headers=_csrf_headers(client),
    )

    assert response.status_code == 201
    body = response.get_json()
    assert body["place_name"] == "Arrival"
    assert body["place_content_type"] == "movie"

    with app.app_context():
        place = db.session.get(Place, body["place_id"])
        assert place is not None
        assert place.details == movie_details


def test_content_details_are_persisted_and_serialized_for_non_place_modules(app, client):
    _create_user(app, "alice")
    _login_session(client, "alice")

    movie_details = {
        "director": "Ridley Scott",
        "release_year": 1982,
        "genre": "Sci-Fi",
        "duration_minutes": 117,
        "country": "United States",
    }

    create_response = client.post(
        "/api/v1/places",
        json={
            "name": "Blade Runner",
            "content_type": "movie",
            "details": movie_details,
        },
        headers=_csrf_headers(client),
    )

    assert create_response.status_code == 201
    created = create_response.get_json()
    assert created["details"] == movie_details

    update_response = client.put(
        f"/api/v1/places/{created['id']}",
        json={
            "details": {
                **movie_details,
                "country": "USA",
            }
        },
        headers=_csrf_headers(client),
    )

    assert update_response.status_code == 200
    assert update_response.get_json()["details"]["country"] == "USA"


def test_person_notes_are_persisted_and_person_detail_hides_reviews(app, client):
    _create_user(app, "alice")
    _login_session(client, "alice")

    person_details = {
        "occupation": "Director",
        "birth_year": 1941,
        "nationality": "Japanese",
        "known_for": "Spirited Away",
        "notes": "Reference contact with contextual notes and no rating semantics.",
    }

    create_response = client.post(
        "/api/v1/places",
        json={
            "name": "Hayao Miyazaki",
            "content_type": "person",
            "details": person_details,
        },
        headers=_csrf_headers(client),
    )

    assert create_response.status_code == 201
    created = create_response.get_json()
    assert created["details"] == person_details
    assert created["avg_rating"] is None
    assert created["review_count"] == 0

    detail_response = client.get(f"/api/v1/places/{created['id']}")

    assert detail_response.status_code == 200
    detail = detail_response.get_json()
    assert detail["details"]["notes"] == person_details["notes"]
    assert detail["avg_rating"] is None
    assert detail["review_count"] == 0
    assert detail["reviews"] == []


def test_invalid_content_details_are_rejected(app, client):
    _create_user(app, "alice")
    _login_session(client, "alice")

    response = client.post(
        "/api/v1/places",
        json={
            "name": "Invalid Movie",
            "content_type": "movie",
            "details": {
                "director": "Someone",
                "latitude": 10,
            },
        },
        headers=_csrf_headers(client),
    )

    assert response.status_code == 400
    body = response.get_json()
    assert body["error"] == "Validation error"
    assert body["details"]["details"]["latitude"] == ["Unsupported field for this content type"]


def test_reviews_from_disabled_module_are_hidden(app, client):
    alice_id = _create_user(app, "alice")
    movie_id = _create_place(app, "Dune", created_by=alice_id, content_type="movie")
    review_id = _create_review(app, alice_id, movie_id, title="Epic")
    app.config["CONTENT_MODULE_FLAGS"]["movie"] = False

    _login_session(client, "alice")

    list_response = client.get("/api/v1/reviews")
    detail_response = client.get(f"/api/v1/reviews/{review_id}")

    assert list_response.status_code == 200
    assert list_response.get_json()["reviews"] == []
    assert detail_response.status_code == 404
    assert detail_response.get_json()["error"] == "Content module not enabled"


def test_person_reviews_are_rejected_and_hidden_from_review_and_stats_routes(app, client):
    alice_id = _create_user(app, "alice")
    person_id = _create_place(
        app,
        "Hayao Miyazaki",
        created_by=alice_id,
        content_type="person",
        details={"notes": "Reference-only profile"},
    )
    review_id = _create_review(app, alice_id, person_id, title="Should be hidden")

    _login_session(client, "alice")

    create_response = client.post(
        "/api/v1/reviews",
        json={
            "place_id": person_id,
            "rating": 5,
            "title": "Not allowed",
        },
        headers=_csrf_headers(client),
    )
    inline_response = client.post(
        "/api/v1/reviews",
        json={
            "place_name": "Jane Doe",
            "place_content_type": "person",
            "rating": 4,
            "title": "Still not allowed",
        },
        headers=_csrf_headers(client),
    )
    list_response = client.get("/api/v1/reviews")
    detail_response = client.get(f"/api/v1/reviews/{review_id}")
    stats_response = client.get("/api/v1/stats/places", query_string={"content_type": "person"})

    assert create_response.status_code == 400
    assert create_response.get_json()["error"] == "Reviews are not available for this content type"
    assert inline_response.status_code == 400
    assert inline_response.get_json()["error"] == "Reviews are not available for this content type"
    assert list_response.status_code == 200
    assert list_response.get_json()["reviews"] == []
    assert detail_response.status_code == 404
    assert detail_response.get_json()["error"] == "Reviews are not available for this content type"
    assert stats_response.status_code == 400
    assert stats_response.get_json()["error"] == "Reviews are not available for this content type"


def test_top_content_stats_can_be_filtered_by_content_type(app, client):
    alice_id = _create_user(app, "alice")
    place_id = _create_place(app, "Paris", created_by=alice_id, content_type="place")
    movie_id = _create_place(app, "Interstellar", created_by=alice_id, content_type="movie")
    _create_review(app, alice_id, place_id, rating=5, title="Trip")
    _create_review(app, alice_id, movie_id, rating=4, title="Film")

    _login_session(client, "alice")

    response = client.get("/api/v1/stats/places", query_string={"content_type": "movie"})

    assert response.status_code == 200
    assert [item["content_type"] for item in response.get_json()["places"]] == ["movie"]
    assert [item["name"] for item in response.get_json()["places"]] == ["Interstellar"]