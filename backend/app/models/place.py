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
    is_private = db.Column(db.Boolean, default=False, nullable=False)
    created_by = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    reviews = db.relationship(
        "Review", backref="place", lazy="dynamic", cascade="all, delete-orphan"
    )
    creator = db.relationship("User", foreign_keys=[created_by])

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

    def _review_privacy_filters(self, current_user_id=None, is_admin=False):
        """Build SQLAlchemy filters for review privacy."""
        from app.models.review import Review

        filters = [Review.place_id == self.id]
        if not is_admin:
            if current_user_id:
                filters.append(
                    db.or_(Review.is_private == False, Review.user_id == current_user_id)
                )
            else:
                filters.append(Review.is_private == False)
        return filters

    def to_dict(self, include_reviews: bool = False,
                current_user_id: int | None = None,
                is_admin: bool = False) -> dict:
        """Serialize place to dictionary.

        When current_user_id is provided, avg_rating and review_count reflect
        only the reviews visible to that user (public + own).
        """
        from sqlalchemy import func
        from app.models.review import Review

        filters = self._review_privacy_filters(current_user_id, is_admin)

        avg_result = (
            db.session.query(func.avg(Review.rating))
            .filter(*filters)
            .scalar()
        )
        visible_count = (
            db.session.query(func.count(Review.id))
            .filter(*filters)
            .scalar()
        )

        data = {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "category": self.category,
            "is_private": bool(self.is_private),
            "created_by": self.created_by,
            "creator_username": self.creator.username if self.creator else None,
            "avg_rating": round(avg_result, 1) if avg_result else None,
            "review_count": visible_count or 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_reviews:
            visible = (
                Review.query.filter(*filters)
                .order_by(Review.created_at.desc())
                .all()
            )
            data["reviews"] = [r.to_dict() for r in visible]
        return data

    def __repr__(self):
        return f"<Place {self.name}>"
