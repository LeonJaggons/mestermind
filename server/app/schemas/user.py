from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.customer


class UserCreate(UserBase):
    firebase_uid: Optional[str] = None


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    firebase_uid: Optional[str] = None
    email_notifications_enabled: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    firebase_uid: Optional[str] = None
    email_notifications_enabled: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
