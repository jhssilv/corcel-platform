from pydantic import BaseModel, Field
from typing import List


class WhitelistTokenCreateRequest(BaseModel):
    """Schema for adding a token to the whitelist."""
    token_text: str = Field(..., json_schema_extra={"example": "caza"}, description="The text of the token to whitelist.")

class WhitelistTokensResponse(BaseModel):
    """Schema for retrieving whitelisted tokens.
    Args:
        tokens (List[str]): List of whitelisted token texts.
    """
    tokens: List[str] = Field(..., json_schema_extra={"example": ["caza", "exemplo"]}, description="List of whitelisted token texts.")
