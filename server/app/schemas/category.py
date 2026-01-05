from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List


class CategoryBase(BaseModel):
    name: str
    slug: str


class CategoryCreate(CategoryBase):
    id: str  # UUID


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None


class CategoryResponse(CategoryBase):
    id: str
    name_hu: Optional[str] = None  # Hungarian name for search
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# Category with services
class ServiceSimple(BaseModel):
    id: str
    name: str
    name_hu: Optional[str] = None  # Hungarian name for search
    slug: str

    model_config = ConfigDict(from_attributes=True)


class CategoryWithServices(CategoryResponse):
    services: List[ServiceSimple] = []

    model_config = ConfigDict(from_attributes=True)
