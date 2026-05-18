"""Review model."""

from datetime import datetime, timezone

from app import db


review_visible_users = db.Table(
    "review_visible_users",
    db.Column(
        "review_id",
        db.Integer,
        db.ForeignKey("reviews.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    db.Column(
        "user_id",
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


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
    is_private = db.Column(db.Boolean, default=False, nullable=False)
    inherits_place_visibility = db.Column(db.Boolean, default=False, nullable=False)
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
    visible_users = db.relationship(
        "User",
        secondary=review_visible_users,
        lazy="selectin",
        passive_deletes=True,
        order_by="User.username.asc()",
    )

    __table_args__ = (
        db.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_rating_range"),
    )

    def to_dict(self, include_photos: bool = True,
                current_user_id: int | None = None,
                is_admin: bool = False) -> dict:
        """Serialize review to dictionary."""
        from app.utils.visibility import build_visibility_metadata

        data = {
            "id": self.id,
            "user_id": self.user_id,
            "place_id": self.place_id,
            "place_content_type": self.place.content_type if self.place else None,
            "rating": self.rating,
            "title": self.title,
            "comment": self.comment,
            "visit_date": self.visit_date.isoformat() if self.visit_date else None,
            "is_private": bool(self.is_private),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "author": self.author.username if self.author else None,
            "place_name": self.place.name if self.place else None,
        }
        data.update(
            build_visibility_metadata(
                self.visible_users,
                self.is_private,
                owner_id=self.user_id,
                current_user_id=current_user_id,
                is_admin=is_admin,
            )
        )
        effective_users = self.visible_users
        effective_is_private = bool(self.is_private)
        if not effective_is_private and self.place and self.place.is_private:
            effective_users = self.place.visible_users
            effective_is_private = True

        effective_visibility = build_visibility_metadata(
            effective_users,
            effective_is_private,
            owner_id=self.user_id,
        )
        data["effective_visibility_mode"] = effective_visibility["visibility_mode"]
        data["effective_shared_with_count"] = effective_visibility["shared_with_count"]
        if include_photos:
            data["photos"] = [p.to_dict() for p in self.photos]
        return data

    def __repr__(self):
        return f"<Review {self.id} - {self.rating}★>"
