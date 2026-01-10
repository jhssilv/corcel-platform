from pydantic import BaseModel, Field
from typing import List

class toggleToBeNormalizedRequest(BaseModel):
    """Schema for toggling the to_be_normalized flag for a token."""
    token_id: int = Field(..., json_schema_extra={"example": 42}, description="ID of the token to toggle.")

class WhitelistManageRequest(BaseModel):
    """Schema for adding a token to the whitelist."""
    token_text: str = Field(..., json_schema_extra={"example": "caza"}, description="The text of the token to whitelist.")
    action: str = Field(..., json_schema_extra={"example": "add"}, description="Action to perform: 'add' or 'remove'.")

class WhitelistTokensResponse(BaseModel):
    """Schema for retrieving whitelisted tokens."""
    tokens: List[str] = Field(..., json_schema_extra={"example": ["caza", "exemplo"]}, description="List of whitelisted token texts.")
