from pydantic import BaseModel, Field, TypeAdapter
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime

class ErrorResponse(BaseModel):
    """Error Response Schema."""
    error: str = Field(..., example="Error description.")

class MessageResponse(BaseModel):
    """Success Response Schema."""
    message: str = Field(..., example="Operation completed successfully.")

# --- /api/users ---

class UsernamesResponse(BaseModel):
    """Schema for the list of usernames."""
    usernames: List[str] = Field(..., example=["user1", "admin", "guest"])


# --- /api/login ---

class LoginRequest(BaseModel):
    """Schema for the login request."""
    username: str = Field(..., example="admin", description="Username.")
    password: str = Field(..., example="password123", description="Password.")

class LoginResponse(BaseModel):
    """Schema for the login response."""
    message: str = Field(..., example="Olá, admin!")
    userId: Optional[int] = Field(..., example=1)
    timestamp: datetime = Field(..., example=datetime.now())


# --- /api/texts ---

class TextMetadata(BaseModel):
    """Schema for the metadata of a single text in the list."""
    id: int
    grade: Optional[int] = None
    normalized_by_user: bool = Field(alias="normalizedByUser", default=False)
    source_file_name: Optional[str] = Field(alias="sourceFileName", default=None)
    users_assigned: List[str] = Field(alias="usersAssigned", default=[])
    
    class Config:
        populate_by_name = True
    
class TextsDataResponse(BaseModel):
    """Schema for the response of the list of texts for a user."""
    texts_data: List[TextMetadata] = Field(alias="textsData")

    class Config:
        populate_by_name = True
        title = "textsData"

class TextDetailResponse(BaseModel):
    """Schema for the detailed response of a single text."""
    id: int
    grade: Optional[int] = None
    
    tokens: List[Any] = Field(alias="tokens") # See database_queries.py for clarification 
    normalized_by_user: bool = Field(alias="normalizedByUser")
    source_file_name: Optional[str] = Field(alias="sourceFileName")
    assigned_to_user: bool = Field(alias="assignedToUser")

    class Config:
        populate_by_name = True

# --- /normalizations ---

class NormalizationValue(BaseModel):
    last_index: int
    new_token: str

NormalizationResponse = TypeAdapter(Dict[str, NormalizationValue])

class NormalizationDeleteRequest(BaseModel):
    """Schema for the DELETE request body of a normalization."""
    word_index: int = Field(..., example=15, description="Index of the token to be deleted.")

class NormalizationCreateRequest(BaseModel):
    """Schema for the POST request body to create/save a normalization."""
    first_index: int = Field(..., example=15, description="Index from the first token.")
    last_index: int = Field(..., example=16, description="Index of the last token of the normalization.")
    new_token: str = Field(..., example="new corrected token", description="The new token that will replace the original.")
    
    
# --- /downloads ---
    
class DownloadRequest(BaseModel):
    """Schema for the download request body."""
    text_ids: List[int] = Field(..., example=[1, 2, 3], description="List of text IDs to download.")
    use_tags: bool = Field(False, description="Whether to use tags in the normalized tokens.")

class ReportRequest(BaseModel):
    """Schema for the report request body."""
    text_ids: List[int] = Field(..., example=[1, 2, 3], description="List of text IDs to generate the report for.")