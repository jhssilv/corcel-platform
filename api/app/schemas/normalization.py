from pydantic import BaseModel, Field, TypeAdapter
from typing import Dict, Optional

class NormalizationValue(BaseModel):
    last_index: int
    new_token: str

NormalizationResponse = TypeAdapter(Dict[str, NormalizationValue])

class NormalizationDeleteRequest(BaseModel):
    """Schema for the DELETE request body of a normalization."""
    word_index: int = Field(..., json_schema_extra={"example": 15}, description="Index of the token to be deleted.")

class NormalizationCreateRequest(BaseModel):
    """Schema for the POST request body to create/save a normalization."""
    first_index: int = Field(..., json_schema_extra={"example": 15}, description="Index from the first token.")
    last_index: int = Field(..., json_schema_extra={"example": 16}, description="Index of the last token of the normalization.")
    new_token: str = Field(..., json_schema_extra={"example": "new corrected token"}, description="The new token that will replace the original.")
    suggest_for_all: Optional[bool] = Field(False, description="If true, suggests this correction for all occurrences of the text.")
