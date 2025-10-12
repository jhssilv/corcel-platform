from pydantic import BaseModel, Field, TypeAdapter
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime

# --- Schemas Genéricos / Reutilizáveis ---

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
    id: int = Field(..., example=101)
    grade: Optional[int] = Field(None, example=5)
    users_who_normalized: List[str] = Field(..., example=["corrector1", "corrector2"])
    normalized_by_user: bool = Field(..., example=True)
    source_file_name: Optional[str] = Field(None, example="20152t4000n4.docx")
    assigned_to_user: bool = Field(..., example=True)

class TextsDataResponse(BaseModel):
    """Schema for the response of the list of texts for a user."""
    textsData: List[TextMetadata]

class TextDetailResponse(BaseModel):
    """Schema for the detailed response of a single text."""
    index: int = Field(..., example=101)
    tokens: List[str] = Field(..., example=["Eu", "gosto", "de", "sorvete", "."])
    word_map: List[bool] = Field(..., example=[True, True, True, True, False])
    candidates: Optional[Dict[str, Any]] = Field(None, example={"3": ["sorvetes", "picole"]})
    grade: Optional[int] = Field(None, example=8)
    corrections: Dict = Field(..., example={}) # This data will be filled by another endpoint
    teacher: Optional[str] = Field(None, example="Prof. Silva") # This will be removed in future versions, use the table 'texts_assignments' and 'normalized_texts_users' instead
    isCorrected: bool = Field(..., example=False)
    sourceFileName: Optional[str] = Field(None, example="redacao_joao.txt")
    correctedByUser: bool = Field(..., example=True)

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