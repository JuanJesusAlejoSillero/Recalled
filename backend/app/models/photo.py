"""ReviewPhoto model."""

from datetime import datetime, timezone

from app import db


class ReviewPhoto(db.Model):
    """Photo attached to a review."""

    __tablename__ = "review_photos"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    review_id = db.Column(
        db.Integer, db.ForeignKey("reviews.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255))
    file_size = db.Column(db.Integer)
    uploaded_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self) -> dict:
        """Serialize photo to dictionary."""
        return {
            "id": self.id,
            "review_id": self.review_id,
            "filename": self.filename,
            "original_filename": self.original_filename,
            "file_size": self.file_size,
            "url": f"/api/v1/media/photos/{self.filename}",
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
        }

    def __repr__(self):
        return f"<ReviewPhoto {self.filename}>"
