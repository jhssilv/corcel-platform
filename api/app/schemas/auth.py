from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class UserCredentials(BaseModel):
    """Schema for login and registration requests."""
    username: str = Field(..., json_schema_extra={"example": "admin"}, description="Username.")
    password: str = Field(..., json_schema_extra={"example": "password123"}, description="Password.")

class UserRegisterRequest(BaseModel):
    """Schema for user registration (admin only)."""
    username: str = Field(..., json_schema_extra={"example": "newuser"}, description="Username.")

class UserActivationRequest(BaseModel):
    """Schema for user activation."""
    username: str = Field(..., json_schema_extra={"example": "newuser"})
    password: str = Field(..., json_schema_extra={"example": "newpassword123"})

class LoginResponse(BaseModel):
    """Schema for the login response."""
    message: str = Field(..., json_schema_extra={"example": "Olá, admin!"})
    is_admin: bool = Field(..., alias="isAdmin", json_schema_extra={"example": True})
