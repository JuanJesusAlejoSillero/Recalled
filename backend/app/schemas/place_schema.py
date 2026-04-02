"""Place validation schemas."""

from marshmallow import Schema, fields, validate, pre_load

from app.utils.security import sanitize_string


VALID_CATEGORIES = [
    "restaurant", "hotel", "museum", "park", "beach", "monument",
    "shopping", "nightlife", "cafe", "bar", "other",
]


class PlaceSchema(Schema):
    """Schema for serializing place data."""

    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    address = fields.Str(allow_none=True)
    latitude = fields.Float(allow_none=True, validate=validate.Range(min=-90, max=90))
    longitude = fields.Float(allow_none=True, validate=validate.Range(min=-180, max=180))
    category = fields.Str(allow_none=True, validate=validate.OneOf(VALID_CATEGORIES))
    avg_rating = fields.Float(dump_only=True)
    review_count = fields.Int(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class PlaceCreateSchema(Schema):
    """Schema for creating a place."""

    name = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    address = fields.Str(allow_none=True, load_default=None)
    latitude = fields.Float(allow_none=True, load_default=None, validate=validate.Range(min=-90, max=90))
    longitude = fields.Float(allow_none=True, load_default=None, validate=validate.Range(min=-180, max=180))
    category = fields.Str(allow_none=True, load_default=None, validate=validate.OneOf(VALID_CATEGORIES))
    is_private = fields.Bool(load_default=False)
    created_by = fields.Int(allow_none=True, load_default=None)

    @pre_load
    def sanitize(self, data, **kwargs):
        data["name"] = sanitize_string(data.get("name"))
        if "address" in data:
            data["address"] = sanitize_string(data.get("address"))
        return data


class PlaceUpdateSchema(Schema):
    """Schema for updating a place."""

    name = fields.Str(validate=validate.Length(min=1, max=200))
    address = fields.Str(allow_none=True, load_default=None)
    latitude = fields.Float(allow_none=True, load_default=None, validate=validate.Range(min=-90, max=90))
    longitude = fields.Float(allow_none=True, load_default=None, validate=validate.Range(min=-180, max=180))
    category = fields.Str(allow_none=True, load_default=None, validate=validate.OneOf(VALID_CATEGORIES))
    is_private = fields.Bool()
    created_by = fields.Int(allow_none=True, load_default=None)

    @pre_load
    def sanitize(self, data, **kwargs):
        if "name" in data:
            data["name"] = sanitize_string(data.get("name"))
        if "address" in data:
            data["address"] = sanitize_string(data.get("address"))
        return data
