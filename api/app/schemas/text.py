from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional

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
    id: int
    text: str
    is_word: bool = Field(alias="isWord")
    position: int
    to_be_normalized: bool = Field(alias="toBeNormalized")
    candidates: List[str] = Field(default=[])
    whitespace_after: Optional[str] = Field(alias="whitespaceAfter", default="")
    whitelisted: bool = Field(alias="whitelisted", default=False)
    model_config = ConfigDict(populate_by_name=True)

class TextDetailResponse(BaseModel):
    """Schema for the detailed response of a single text."""
    id: int
    grade: Optional[int] = None
    tokens: List[Token] = Field(alias="tokens")
    normalized_by_user: bool = Field(alias="normalizedByUser")
    source_file_name: Optional[str] = Field(alias="sourceFileName")
    assigned_to_user: bool = Field(alias="assignedToUser")
    model_config = ConfigDict(populate_by_name=True)
