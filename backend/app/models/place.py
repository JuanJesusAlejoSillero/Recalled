"""Place model."""

from datetime import datetime, timezone

from app import db


class Place(db.Model):
    """Place model."""

    __tablename__ = "places"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(200), nullable=False)
    address = db.Column(db.Text)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    category = db.Column(db.String(50))
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    reviews = db.relationship(
        "Review", backref="place", lazy="dynamic", cascade="all, delete-orphan"
    )

    @property
    def avg_rating(self) -> float | None:
        """Calculate average rating from all reviews."""
        from sqlalchemy import func
        from app.models.review import Review

        result = (
            db.session.query(func.avg(Review.rating))
            .filter(Review.place_id == self.id)
            .scalar()
        )
        return round(result, 1) if result else None

    @property
    def review_count(self) -> int:
        """Count total reviews for this place."""
        return self.reviews.count()

    def to_dict(self, include_reviews: bool = False) -> dict:
        """Serialize place to dictionary."""
        data = {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "category": self.category,
            "avg_rating": self.avg_rating,
            "review_count": self.review_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_reviews:
            data["reviews"] = [r.to_dict() for r in self.reviews]
        return data

    def __repr__(self):
        return f"<Place {self.name}>"
