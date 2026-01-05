from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class CustomerProfileBase(BaseModel):
    first_name: str
    last_name: str
    phone: str
    city: str
    district: str
    street_address: Optional[str] = None


class CustomerProfileCreate(CustomerProfileBase):
    user_id: int


class CustomerProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    street_address: Optional[str] = None


class CustomerProfileResponse(CustomerProfileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
