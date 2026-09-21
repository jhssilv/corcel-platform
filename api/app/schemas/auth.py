from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class UserCredentials(BaseModel):
    """Schema for login and registration requests.
    Args:
        username (str): The username of the user.
        password (str): The password of the user.
    """
    username: str = Field(..., json_schema_extra={"example": "admin"}, description="Username.")
    password: str = Field(..., json_schema_extra={"example": "password123"}, description="Password.")

class UserRegisterRequest(BaseModel):
    """Schema for user registration (admin only).
    Args:
        username (str): The username of the new user.
    """
    username: str = Field(..., json_schema_extra={"example": "newuser"}, description="Username.")

class UserRegisterResponse(BaseModel):
    """Schema for user registration response with temporary password.
    Args:
        message (str): Confirmation message.
        temporary_password (str): Auto-generated temporary password.
    """
    message: str = Field(..., json_schema_extra={"example": "User created successfully"})
    temporary_password: str = Field(..., alias="temporaryPassword", json_schema_extra={"example": "aB3_xK9zP1"})
    model_config = ConfigDict(populate_by_name=True)

class UserActivationRequest(BaseModel):
    """Schema for user activation requests.
    Args:
        username (str): The username of the user to activate.
        temporary_password (str): Temporary password provided by administrator.
        password (str): The new password for the user.
    """
    username: str = Field(..., json_schema_extra={"example": "newuser"})
    temporary_password: str = Field(..., alias="temporaryPassword", json_schema_extra={"example": "aB3_xK9zP1"})
    password: str = Field(..., json_schema_extra={"example": "newpassword123"})
    model_config = ConfigDict(populate_by_name=True)

class LoginResponse(BaseModel):
    """Schema for the login response.
    Args:
        message (str): Success message.
        is_admin (bool): Whether the user has admin privileges.
    """
    message: str = Field(..., json_schema_extra={"example": "Olá, admin!"})
    is_admin: bool = Field(..., alias="isAdmin", json_schema_extra={"example": True})

class SetUserActiveRequest(BaseModel):
    """Schema for explicitly setting a user's active status."""
    is_active: bool = Field(..., json_schema_extra={"example": False}, description="Desired active status.")


class SetUserAdminRequest(BaseModel):
    """Schema for explicitly setting a user's admin role."""
    is_admin: bool = Field(..., json_schema_extra={"example": True}, description="Desired admin status.")
