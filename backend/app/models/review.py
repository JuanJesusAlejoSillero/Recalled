"""Review model."""

from datetime import datetime, timezone

from app import db


class Review(db.Model):
    """Place review model."""

    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    place_id = db.Column(
        db.Integer, db.ForeignKey("places.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    rating = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200))
    comment = db.Column(db.Text)
    visit_date = db.Column(db.Date)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    photos = db.relationship(
        "ReviewPhoto", backref="review", lazy="dynamic",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        db.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_rating_range"),
    )

    def to_dict(self, include_photos: bool = True) -> dict:
        """Serialize review to dictionary."""
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "place_id": self.place_id,
            "rating": self.rating,
            "title": self.title,
            "comment": self.comment,
            "visit_date": self.visit_date.isoformat() if self.visit_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "author": self.author.username if self.author else None,
            "place_name": self.place.name if self.place else None,
        }
        if include_photos:
            data["photos"] = [p.to_dict() for p in self.photos]
        return data

    def __repr__(self):
        return f"<Review {self.id} - {self.rating}★>"
