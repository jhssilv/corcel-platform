from pydantic import BaseModel, Field
from typing import Optional


class ErrorDetail(BaseModel):
    """Structured error detail item."""
    field: Optional[str] = Field(default=None, json_schema_extra={"example": "username"})
    message: str = Field(..., json_schema_extra={"example": "Field is required."})


class ErrorResponse(BaseModel):
    """Canonical API error response schema."""
    error: str = Field(..., json_schema_extra={"example": "Validation failed"})
    code: str = Field(..., json_schema_extra={"example": "VALIDATION_ERROR"})
    details: Optional[list[ErrorDetail]] = Field(default=None)

class MessageResponse(BaseModel):
    """Success Response Schema.
    Args:
        message (str): Success message.
    """
    message: str = Field(..., json_schema_extra={"example": "Operation completed successfully."})
