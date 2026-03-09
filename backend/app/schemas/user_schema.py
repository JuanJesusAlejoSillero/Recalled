"""User validation schemas."""

from marshmallow import Schema, fields, validate, pre_load

from app.utils.security import sanitize_string


class UserSchema(Schema):
    """Schema for serializing user data."""

    id = fields.Int(dump_only=True)
    username = fields.Str(required=True, validate=validate.Length(min=3, max=50))
    email = fields.Email(required=True)
    is_admin = fields.Bool(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class UserCreateSchema(Schema):
    """Schema for creating a new user."""

    username = fields.Str(
        required=True,
        validate=[validate.Length(min=3, max=50), validate.Regexp(
            r"^[a-zA-Z0-9_]+$",
            error="Username must contain only letters, numbers and underscores",
        )],
    )
    email = fields.Email(required=True)
    password = fields.Str(
        required=True,
        validate=validate.Length(min=8, max=128),
    )
    is_admin = fields.Bool(load_default=False)

    @pre_load
    def sanitize(self, data, **kwargs):
        data["username"] = sanitize_string(data.get("username"))
        return data


class UserUpdateSchema(Schema):
    """Schema for updating an existing user."""

    username = fields.Str(
        validate=[validate.Length(min=3, max=50), validate.Regexp(
            r"^[a-zA-Z0-9_]+$",
            error="Username must contain only letters, numbers and underscores",
        )],
    )
    email = fields.Email()
    password = fields.Str(validate=validate.Length(min=8, max=128))
    is_admin = fields.Bool()

    @pre_load
    def sanitize(self, data, **kwargs):
        if "username" in data:
            data["username"] = sanitize_string(data.get("username"))
        return data


class LoginSchema(Schema):
    """Schema for login request."""

    username = fields.Str(required=True)
    password = fields.Str(required=True)
