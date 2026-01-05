from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class ServiceBase(BaseModel):
    name: str
    slug: str


class ServiceCreate(ServiceBase):
    id: str  # UUID
    category_id: str


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    category_id: Optional[str] = None


class ServiceResponse(ServiceBase):
    id: str
    category_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
