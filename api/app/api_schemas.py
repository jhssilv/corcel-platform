from pydantic import BaseModel, Field, TypeAdapter, ConfigDict
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime

class ErrorResponse(BaseModel):
    """Error Response Schema."""
    error: str = Field(..., json_schema_extra={"example": "Error description."})

class MessageResponse(BaseModel):
    """Success Response Schema."""
    message: str = Field(..., json_schema_extra={"example": "Operation completed successfully."})

# --- /api/users ---

class UsernamesResponse(BaseModel):
    """Schema for the list of usernames."""
    usernames: List[str] = Field(..., json_schema_extra={"example": ["user1", "admin", "guest"]})


# --- /api/login & /api/register ---

class UserCredentials(BaseModel):
    """Schema for login and registration requests."""
    username: str = Field(..., json_schema_extra={"example": "admin"}, description="Username.")
    password: str = Field(..., json_schema_extra={"example": "password123"}, description="Password.")

class LoginResponse(BaseModel):
    """Schema for the login response."""
    message: str = Field(..., json_schema_extra={"example": "Olá, admin!"})


# --- /api/texts ---

class TextMetadata(BaseModel):
    """Schema for the metadata of a single text in the list."""
    id: int
    grade: Optional[int] = None
    normalized_by_user: bool = Field(alias="normalizedByUser", default=False)
    source_file_name: Optional[str] = Field(alias="sourceFileName", default=None)
    users_assigned: List[str] = Field(alias="usersAssigned", default=[])
    
    model_config = ConfigDict(populate_by_name=True)
    
class TextsDataResponse(BaseModel):
    """Schema for the response of the list of texts for a user."""
    texts_data: List[TextMetadata] = Field(alias="textsData")

    model_config = ConfigDict(populate_by_name=True, title="textsData")

class Token(BaseModel):
    """Schema for a single token."""
    text: str
    is_word: bool = Field(alias="isWord")
    position: int
    to_be_normalized: bool = Field(alias="toBeNormalized")
    candidates: List[str] = Field(default=[])
    whitespace_after: Optional[str] = Field(alias="whitespaceAfter", default="")

    model_config = ConfigDict(populate_by_name=True)

class TextDetailResponse(BaseModel):
    """Schema for the detailed response of a single text."""
    id: int
    grade: Optional[int] = None
    
    tokens: List[Token] = Field(alias="tokens") # See database_queries.py for clarification 
    normalized_by_user: bool = Field(alias="normalizedByUser")
    source_file_name: Optional[str] = Field(alias="sourceFileName")
    assigned_to_user: bool = Field(alias="assignedToUser")

    model_config = ConfigDict(populate_by_name=True)

# --- /normalizations ---

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
    
    
# --- /downloads ---
    
class DownloadRequest(BaseModel):
    """Schema for the download request body."""
    text_ids: List[int] = Field(..., json_schema_extra={"example": [1, 2, 3]}, description="List of text IDs to download.")
    use_tags: bool = Field(False, description="Whether to use tags in the normalized tokens.")

class ReportRequest(BaseModel):
    """Schema for the report request body."""
    text_ids: List[int] = Field(..., json_schema_extra={"example": [1, 2, 3]}, description="List of text IDs to generate the report for.")
    
class toggleToBeNormalizedRequest(BaseModel):
    """Schema for toggling the to_be_normalized flag for a token."""
    token_id: int = Field(..., json_schema_extra={"example": 42}, description="ID of the token to toggle.")