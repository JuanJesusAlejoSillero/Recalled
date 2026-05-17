"""Authenticated media delivery routes.

Photos are stored on disk under UPLOAD_FOLDER/photos/ and
UPLOAD_FOLDER/photos/thumbnails/.  This module ensures that only users
with visibility to the review (and its place) can fetch the files.
"""

import os

from flask import Blueprint, current_app, send_from_directory
from flask_jwt_extended import jwt_required

from app import db
from app.middleware.auth import get_current_user
from app.models.photo import ReviewPhoto
from app.utils.visibility import can_view_review

media_bp = Blueprint("media", __name__)


def _can_view_photo(photo, current_user) -> bool:
    """Return True when the current user may see this photo's review."""
    review = photo.review
    return can_view_review(review, current_user)


@media_bp.route("/photos/<filename>")
@jwt_required()
def serve_photo(filename):
    """Serve a full-size photo after checking visibility."""
    photo = db.session.query(ReviewPhoto).filter_by(filename=filename).first()
    if not photo:
        return {"error": "Not found"}, 404

    current_user = get_current_user()
    if not _can_view_photo(photo, current_user):
        return {"error": "Not found"}, 404

    photos_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "photos")
    return send_from_directory(photos_dir, filename)


@media_bp.route("/photos/thumbnails/<filename>")
@jwt_required()
def serve_thumbnail(filename):
    """Serve a thumbnail after checking visibility."""
    photo = db.session.query(ReviewPhoto).filter_by(filename=filename).first()
    if not photo:
        return {"error": "Not found"}, 404

    current_user = get_current_user()
    if not _can_view_photo(photo, current_user):
        return {"error": "Not found"}, 404

    thumbs_dir = os.path.join(
        current_app.config["UPLOAD_FOLDER"], "photos", "thumbnails"
    )
    return send_from_directory(thumbs_dir, filename)
