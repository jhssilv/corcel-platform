from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class UsernamesResponse(BaseModel):
    """Schema for the list of usernames.
    Args:
        usernames (List[str]): List of usernames.
    """
    usernames: List[str] = Field(..., json_schema_extra={"example": ["user1", "admin", "guest"]})

class UserData(BaseModel):
    """Schema for user data.
    Args:
        username (str): The username of the user.
        is_admin (bool): Whether the user has admin privileges.
        is_active (bool): Whether the user account is active.
        last_login (Optional[datetime]): Timestamp of the user's last login.
    """
    username: str
    is_admin: bool = Field(alias="isAdmin")
    is_active: bool = Field(alias="isActive")
    last_login: Optional[datetime] = Field(alias="lastLogin", default=None)

    model_config = ConfigDict(populate_by_name=True)

class UsersDataResponse(BaseModel):
    """Schema for the response of the list of users.
    Args:
        users_data (List[UserData]): List of user data.
    """
    users_data: List[UserData] = Field(alias="usersData")

    model_config = ConfigDict(populate_by_name=True, title="usersData")
