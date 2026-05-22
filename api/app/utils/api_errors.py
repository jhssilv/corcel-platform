from __future__ import annotations

from typing import Iterable, Optional

from flask import jsonify

from app.schemas import generic as generic_schemas


AUTH_NOT_AUTHENTICATED = "AUTH_NOT_AUTHENTICATED"
AUTH_INVALID_USER = "AUTH_INVALID_USER"
AUTH_FORBIDDEN = "AUTH_FORBIDDEN"
VALIDATION_ERROR = "VALIDATION_ERROR"
RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
INVALID_REQUEST = "INVALID_REQUEST"
BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION"
INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED"


def build_error_details(
    details: Optional[Iterable[generic_schemas.ErrorDetail | dict]] = None,
) -> Optional[list[generic_schemas.ErrorDetail]]:
    if not details:
        return None

    return [
        detail
        if isinstance(detail, generic_schemas.ErrorDetail)
        else generic_schemas.ErrorDetail(**detail)
        for detail in details
    ]


def error_response(
    *,
    error: str,
    code: str,
    status_code: int,
    details: Optional[Iterable[generic_schemas.ErrorDetail | dict]] = None,
):
    payload = generic_schemas.ErrorResponse(
        error=error,
        code=code,
        details=build_error_details(details),
    )
    return jsonify(payload.model_dump(exclude_none=True)), status_code

