"""User model."""

from datetime import datetime, timezone

import bcrypt

from app import db


class User(db.Model):
    """User account model."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    reviews = db.relationship(
        "Review", backref="author", lazy="dynamic", cascade="all, delete-orphan"
    )

    def set_password(self, password: str) -> None:
        """Hash and set the user password using bcrypt with 12 salt rounds."""
        # bcrypt 5.0+ raises ValueError for passwords > 72 bytes
        password_bytes = password.encode("utf-8")[:72]
        self.password_hash = bcrypt.hashpw(
            password_bytes, bcrypt.gensalt(rounds=12)
        ).decode("utf-8")

    def check_password(self, password: str) -> bool:
        """Verify a password against the stored hash."""
        password_bytes = password.encode("utf-8")[:72]
        return bcrypt.checkpw(
            password_bytes, self.password_hash.encode("utf-8")
        )

    def to_dict(self, include_email: bool = False) -> dict:
        """Serialize user to dictionary."""
        data = {
            "id": self.id,
            "username": self.username,
            "is_admin": self.is_admin,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_email:
            data["email"] = self.email
        return data

    def __repr__(self):
        return f"<User {self.username}>"
