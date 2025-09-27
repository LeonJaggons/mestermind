"""
Pydantic schemas for API requests and responses
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class HealthResponse(BaseModel):
    """Response model for health check endpoints"""
    status: str
    message: str


class CategoryBase(BaseModel):
    """Base category model"""
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0


class CategoryCreate(CategoryBase):
    """Model for creating a new category"""


class CategoryUpdate(BaseModel):
    """Model for updating a category"""
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class SubcategoryBase(BaseModel):
    """Base subcategory model"""
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0


class SubcategoryCreate(SubcategoryBase):
    """Model for creating a new subcategory"""
    category_id: str


class SubcategoryUpdate(BaseModel):
    """Model for updating a subcategory"""
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class SubcategoryResponse(SubcategoryBase):
    """Subcategory response model"""
    id: str
    category_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CategoryResponse(CategoryBase):
    """Category response model with subcategories"""
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    subcategories: List[SubcategoryResponse] = []

    class Config:
        from_attributes = True


class CategoryListResponse(CategoryBase):
    """Category response model without subcategories (for listing)"""
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    subcategory_count: int = 0

    class Config:
        from_attributes = True


class ServiceBase(BaseModel):
    """Base service model"""
    name: str
    description: Optional[str] = None
    requires_license: bool = False
    is_specialty: bool = False
    indoor_outdoor: str = "both"  # "indoor", "outdoor", "both"
    is_active: bool = True
    sort_order: int = 0


class ServiceCreate(ServiceBase):
    """Model for creating a new service"""
    category_id: str
    subcategory_id: str


class ServiceUpdate(BaseModel):
    """Model for updating a service"""
    name: Optional[str] = None
    description: Optional[str] = None
    requires_license: Optional[bool] = None
    is_specialty: Optional[bool] = None
    indoor_outdoor: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class ServiceResponse(ServiceBase):
    """Service response model"""
    id: str
    category_id: str
    subcategory_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ServiceListResponse(ServiceBase):
    """Service response model for listing (without full details)"""
    id: str
    category_id: str
    subcategory_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ServiceExploreResponse(ServiceBase):
    """Service response model for explore endpoint with category and subcategory info"""
    id: str
    category_id: str
    subcategory_id: str
    category_name: str
    subcategory_name: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
