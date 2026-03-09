"""File handling utilities for image uploads."""

import os
import uuid

from flask import current_app
from PIL import Image


def allowed_file(filename: str) -> bool:
    """Check if the file extension is allowed."""
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in current_app.config["ALLOWED_EXTENSIONS"]


def save_photo(file) -> dict:
    """Save an uploaded photo, resize it, and generate a thumbnail.

    Args:
        file: FileStorage object from the request.

    Returns:
        Dictionary with filename, original_filename, and file_size.

    Raises:
        ValueError: If the file type is not allowed.
    """
    if not file or not file.filename:
        raise ValueError("No file provided")

    if not allowed_file(file.filename):
        allowed = ", ".join(current_app.config["ALLOWED_EXTENSIONS"])
        raise ValueError(f"File type not allowed. Allowed types: {allowed}")

    # Generate unique filename
    ext = file.filename.rsplit(".", 1)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}.{ext}"

    # Ensure upload directory exists
    photos_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "photos")
    thumbs_dir = os.path.join(photos_dir, "thumbnails")
    os.makedirs(photos_dir, exist_ok=True)
    os.makedirs(thumbs_dir, exist_ok=True)

    filepath = os.path.join(photos_dir, unique_filename)

    # Save and process image
    img = Image.open(file.stream)

    # Convert RGBA to RGB if necessary (for JPEG)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    # Resize if larger than max dimensions
    max_w = current_app.config["MAX_IMAGE_WIDTH"]
    max_h = current_app.config["MAX_IMAGE_HEIGHT"]
    if img.width > max_w or img.height > max_h:
        img.thumbnail((max_w, max_h), Image.LANCZOS)

    # Save main image
    quality = current_app.config["IMAGE_QUALITY"]
    img.save(filepath, quality=quality, optimize=True)

    # Generate thumbnail
    thumb_size = current_app.config["THUMBNAIL_SIZE"]
    thumb = img.copy()
    thumb.thumbnail(thumb_size, Image.LANCZOS)
    thumb.save(os.path.join(thumbs_dir, unique_filename), quality=quality, optimize=True)

    file_size = os.path.getsize(filepath)

    return {
        "filename": unique_filename,
        "original_filename": file.filename,
        "file_size": file_size,
    }


def delete_photo(filename: str) -> None:
    """Delete a photo and its thumbnail from disk."""
    photos_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "photos")
    thumbs_dir = os.path.join(photos_dir, "thumbnails")

    filepath = os.path.join(photos_dir, filename)
    thumbpath = os.path.join(thumbs_dir, filename)

    if os.path.exists(filepath):
        os.remove(filepath)
    if os.path.exists(thumbpath):
        os.remove(thumbpath)
