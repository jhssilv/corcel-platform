from pydantic import BaseModel, Field

class ErrorResponse(BaseModel):
    """Error Response Schema.
    Args:
        error (str): Description of the error.
    """
    error: str = Field(..., json_schema_extra={"example": "Error description."})

class MessageResponse(BaseModel):
    """Success Response Schema.
    Args:
        message (str): Success message.
    """
    message: str = Field(..., json_schema_extra={"example": "Operation completed successfully."})
