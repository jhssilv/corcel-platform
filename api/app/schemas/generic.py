from pydantic import BaseModel, Field

class ErrorResponse(BaseModel):
    """Error Response Schema."""
    error: str = Field(..., json_schema_extra={"example": "Error description."})

class MessageResponse(BaseModel):
    """Success Response Schema."""
    message: str = Field(..., json_schema_extra={"example": "Operation completed successfully."})
