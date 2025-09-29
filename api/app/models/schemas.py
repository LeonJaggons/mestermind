"""
Pydantic schemas for API requests and responses
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


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


# Question Set Enums
class QuestionSetStatus(str, Enum):
    """Question set status enum"""
    DRAFT = "draft"
    PUBLISHED = "published"


class QuestionType(str, Enum):
    """Question type enum"""
    TEXT = "text"
    NUMBER = "number"
    BOOLEAN = "boolean"
    SELECT = "select"
    MULTI_SELECT = "multi_select"
    DATE = "date"
    FILE = "file"


# Question Set Schemas
class QuestionSetBase(BaseModel):
    """Base question set model"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: QuestionSetStatus = QuestionSetStatus.DRAFT
    is_active: bool = True
    sort_order: int = 0


class QuestionSetCreate(QuestionSetBase):
    """Model for creating a new question set"""
    service_id: str


class QuestionSetUpdate(BaseModel):
    """Model for updating a question set"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[QuestionSetStatus] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class QuestionSetResponse(QuestionSetBase):
    """Question set response model"""
    id: str
    service_id: str
    version: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    questions: List["QuestionResponse"] = []

    class Config:
        from_attributes = True


class QuestionSetListResponse(QuestionSetBase):
    """Question set response model for listing (without questions)"""
    id: str
    service_id: str
    version: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    question_count: int = 0

    class Config:
        from_attributes = True


# Question Schemas
class QuestionBase(BaseModel):
    """Base question model"""
    key: str = Field(..., min_length=1, max_length=100, pattern="^[a-zA-Z0-9_]+$")
    label: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    question_type: QuestionType
    is_required: bool = False
    is_active: bool = True
    sort_order: int = 0


class QuestionCreate(QuestionBase):
    """Model for creating a new question"""
    question_set_id: str
    options: Optional[Dict[str, Any]] = None  # For select/multi_select
    min_value: Optional[float] = None  # For number type
    max_value: Optional[float] = None  # For number type
    min_length: Optional[int] = Field(None, ge=0)  # For text type
    max_length: Optional[int] = Field(None, ge=1)  # For text type
    conditional_rules: Optional[Dict[str, Any]] = None
    allowed_file_types: Optional[List[str]] = None  # For file type
    max_file_size: Optional[int] = Field(None, ge=1)  # For file type, in bytes


class QuestionUpdate(BaseModel):
    """Model for updating a question"""
    key: Optional[str] = Field(None, min_length=1, max_length=100, pattern="^[a-zA-Z0-9_]+$")
    label: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    question_type: Optional[QuestionType] = None
    is_required: Optional[bool] = None
    options: Optional[Dict[str, Any]] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    min_length: Optional[int] = Field(None, ge=0)
    max_length: Optional[int] = Field(None, ge=1)
    conditional_rules: Optional[Dict[str, Any]] = None
    allowed_file_types: Optional[List[str]] = None
    max_file_size: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class QuestionResponse(QuestionBase):
    """Question response model"""
    id: str
    question_set_id: str
    options: Optional[Dict[str, Any]] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    conditional_rules: Optional[Dict[str, Any]] = None
    allowed_file_types: Optional[List[str]] = None
    max_file_size: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Update forward references
QuestionSetResponse.model_rebuild()
QuestionResponse.model_rebuild()