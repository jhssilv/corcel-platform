from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class UsernamesResponse(BaseModel):
    """Schema for the list of usernames."""
    usernames: List[str] = Field(..., json_schema_extra={"example": ["user1", "admin", "guest"]})

class UserData(BaseModel):
    """Schema for user data."""
    username: str
    is_admin: bool = Field(alias="isAdmin")
    is_active: bool = Field(alias="isActive")
    last_login: Optional[datetime] = Field(alias="lastLogin", default=None)

    model_config = ConfigDict(populate_by_name=True)

class UsersDataResponse(BaseModel):
    """Schema for the response of the list of users."""
    users_data: List[UserData] = Field(alias="usersData")

    model_config = ConfigDict(populate_by_name=True, title="usersData")
