"""Review validation schemas."""

from marshmallow import Schema, fields, validate, pre_load

from app.utils.security import sanitize_string


class ReviewSchema(Schema):
    """Schema for serializing review data."""

    id = fields.Int(dump_only=True)
    user_id = fields.Int(dump_only=True)
    place_id = fields.Int(required=True)
    rating = fields.Int(required=True, validate=validate.Range(min=1, max=5))
    title = fields.Str(allow_none=True, validate=validate.Length(max=200))
    comment = fields.Str(allow_none=True)
    visit_date = fields.Date(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    author = fields.Str(dump_only=True)
    place_name = fields.Str(dump_only=True)
    photos = fields.List(fields.Dict(), dump_only=True)


class ReviewCreateSchema(Schema):
    """Schema for creating a review."""

    place_id = fields.Int(load_default=None)
    place_name = fields.Str(load_default=None, validate=validate.Length(min=1, max=200))
    rating = fields.Int(required=True, validate=validate.Range(min=1, max=5))
    title = fields.Str(allow_none=True, load_default=None, validate=validate.Length(max=200))
    comment = fields.Str(allow_none=True, load_default=None)
    visit_date = fields.Date(allow_none=True, load_default=None)

    @pre_load
    def sanitize(self, data, **kwargs):
        data["title"] = sanitize_string(data.get("title"))
        data["comment"] = sanitize_string(data.get("comment"))
        if "place_name" in data:
            data["place_name"] = sanitize_string(data.get("place_name"))
        if data.get("visit_date") == "":
            data["visit_date"] = None
        return data


class ReviewUpdateSchema(Schema):
    """Schema for updating a review."""

    place_id = fields.Int()
    rating = fields.Int(validate=validate.Range(min=1, max=5))
    title = fields.Str(allow_none=True, validate=validate.Length(max=200))
    comment = fields.Str(allow_none=True)
    visit_date = fields.Date(allow_none=True)

    @pre_load
    def sanitize(self, data, **kwargs):
        if "title" in data:
            data["title"] = sanitize_string(data.get("title"))
        if "comment" in data:
            data["comment"] = sanitize_string(data.get("comment"))
        if data.get("visit_date") == "":
            data["visit_date"] = None
        return data
