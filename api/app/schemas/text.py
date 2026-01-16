from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional

class TextMetadata(BaseModel):
    """Schema for the metadata of a single text in the list.
    Args:
        id (int): ID of the text.
        grade (Optional[int]): Grade of the text.
        normalized_by_user (bool): Whether the text has been normalized by the user.
        source_file_name (Optional[str]): Name of the source file.
        users_assigned (List[str]): List of usernames assigned to the text.
    """
    id: int
    grade: Optional[int] = None
    normalized_by_user: bool = Field(alias="normalizedByUser", default=False)
    source_file_name: Optional[str] = Field(alias="sourceFileName", default=None)
    users_assigned: List[str] = Field(alias="usersAssigned", default=[])
    model_config = ConfigDict(populate_by_name=True)

class TextsDataResponse(BaseModel):
    """Schema for the response of the list of texts for a user.
    Args:
        texts_data (List[TextMetadata]): List of text metadata.
    """
    texts_data: List[TextMetadata] = Field(alias="textsData")
    model_config = ConfigDict(populate_by_name=True, title="textsData")

class Token(BaseModel):
    """Schema for a single token.
    Args:
        id (int): ID of the token.
        text (str): The token text.
        is_word (bool): Whether the token is a word.
        position (int): Position of the token in the text.
        to_be_normalized (bool): Whether the token is marked to be normalized.
        candidates (List[str]): List of normalization candidates.
        whitespace_after (Optional[str]): Whitespace after the token.
        whitelisted (bool): Whether the token is whitelisted.
    """
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
    """Schema for the detailed response of a single text.
    Args:
        id (int): ID of the text.
        grade (Optional[int]): Grade of the text.
        tokens (List[Token]): List of tokens in the text.
        normalized_by_user (bool): Whether the text has been normalized by the user.
        source_file_name (Optional[str]): Name of the source file.
        assigned_to_user (bool): Whether the text is assigned to the current user.
    """
    id: int
    grade: Optional[int] = None
    tokens: List[Token] = Field(alias="tokens")
    normalized_by_user: bool = Field(alias="normalizedByUser")
    source_file_name: Optional[str] = Field(alias="sourceFileName")
    assigned_to_user: bool = Field(alias="assignedToUser")
    model_config = ConfigDict(populate_by_name=True)
