"""Request validation middleware."""

from functools import wraps

from flask import jsonify, request
from marshmallow import ValidationError


def validate_json(schema_cls):
    """Decorator that validates request JSON against a Marshmallow schema.

    The validated data is passed as 'validated_data' keyword argument.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            json_data = request.get_json(silent=True)
            if json_data is None:
                return jsonify({"error": "Request body must be valid JSON"}), 400
            try:
                schema = schema_cls()
                validated_data = schema.load(json_data)
            except ValidationError as err:
                return jsonify({"error": "Validation error", "details": err.messages}), 400
            kwargs["validated_data"] = validated_data
            return fn(*args, **kwargs)
        return wrapper
    return decorator
