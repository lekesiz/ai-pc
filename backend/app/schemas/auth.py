"""
Authentication schemas
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    preferred_ai_model: Optional[str] = None
    voice_enabled: Optional[bool] = None
    language: Optional[str] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime]
    preferred_ai_model: str
    voice_enabled: bool
    language: str
    
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    # refresh_token is now in httpOnly cookie, not in response body


class TokenRefresh(BaseModel):
    # This schema is deprecated - refresh token now comes from httpOnly cookie
    # Kept for backwards compatibility
    refresh_token: Optional[str] = None


class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)