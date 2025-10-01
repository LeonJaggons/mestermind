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


# -----------------------------
# User schemas
# -----------------------------


class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    firebase_uid: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    firebase_uid: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


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
    service_id: Optional[str] = None
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


# -----------------------------
# Request schemas
# -----------------------------
class RequestBase(BaseModel):
    service_id: str
    mester_id: Optional[str] = None
    question_set_id: str
    place_id: Optional[str] = None
    # New optional contact + message fields
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    postal_code: Optional[str] = None
    message_to_pro: Optional[str] = None
    answers: Optional[Dict[str, Any]] = None
    current_step: int = 0


class RequestCreate(RequestBase):
    pass


class RequestUpdate(BaseModel):
    answers: Optional[Dict[str, Any]] = None
    current_step: Optional[int] = None
    status: Optional[str] = None
    mester_id: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    postal_code: Optional[str] = None
    message_to_pro: Optional[str] = None


class RequestResponse(BaseModel):
    id: str
    service_id: str
    mester_id: Optional[str] = None
    question_set_id: str
    place_id: Optional[str]
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    postal_code: Optional[str] = None
    message_to_pro: Optional[str] = None
    current_step: int
    answers: Optional[Dict[str, Any]]
    status: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Update forward references
QuestionSetResponse.model_rebuild()
QuestionResponse.model_rebuild()


# -----------------------------
# Location schemas (Hungary)
# -----------------------------

class CountyBase(BaseModel):
    name: str
    code: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0


class CountyCreate(CountyBase):
    pass


class CountyUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class CountyResponse(CountyBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CityBase(BaseModel):
    name: str
    is_capital: bool = False
    is_active: bool = True
    sort_order: int = 0


class CityCreate(CityBase):
    county_id: str


class CityUpdate(BaseModel):
    name: Optional[str] = None
    is_capital: Optional[bool] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    county_id: Optional[str] = None


class CityResponse(CityBase):
    id: str
    county_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DistrictBase(BaseModel):
    name: str
    code: Optional[str] = None
    number: Optional[int] = None
    is_active: bool = True
    sort_order: int = 0


class DistrictCreate(DistrictBase):
    city_id: str


class DistrictUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    number: Optional[int] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    city_id: Optional[str] = None


class DistrictResponse(DistrictBase):
    id: str
    city_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PostalCodeBase(BaseModel):
    code: str
    is_po_box: bool = False
    is_active: bool = True
    sort_order: int = 0


class PostalCodeCreate(PostalCodeBase):
    city_id: str
    district_id: Optional[str] = None


class PostalCodeUpdate(BaseModel):
    code: Optional[str] = None
    is_po_box: Optional[bool] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    city_id: Optional[str] = None
    district_id: Optional[str] = None


class PostalCodeResponse(PostalCodeBase):
    id: str
    city_id: str
    district_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# -----------------------------
# Geo normalization schemas
# -----------------------------

class GeoNormalizeRequest(BaseModel):
    """Geo normalization request model"""
    query: Optional[str] = None
    place_id: Optional[str] = None
    type: Optional[str] = Field(None, pattern="^(city|district)$")


class GeoNormalizeResponse(BaseModel):
    """Geo normalization response model"""
    place_id: str
    type: str
    name: str
    city_id: str
    district_id: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


# -----------------------------
# Mester schemas
# -----------------------------


class MesterBase(BaseModel):
    full_name: str
    slug: str
    email: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    years_experience: Optional[int] = None
    is_verified: bool = False
    is_active: bool = True
    home_city_id: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


class MesterCreate(MesterBase):
    pass


class MesterUpdate(BaseModel):
    full_name: Optional[str] = None
    slug: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    years_experience: Optional[int] = None
    is_verified: Optional[bool] = None
    is_active: Optional[bool] = None
    home_city_id: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


class MesterResponse(MesterBase):
    id: str
    rating_avg: Optional[float] = None
    review_count: int
    logo_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MesterServiceBase(BaseModel):
    service_id: str
    price_hour_min: Optional[int] = None
    price_hour_max: Optional[int] = None
    pricing_notes: Optional[str] = None
    is_active: bool = True


class MesterServiceCreate(MesterServiceBase):
    mester_id: str


class MesterServiceUpdate(BaseModel):
    price_hour_min: Optional[int] = None
    price_hour_max: Optional[int] = None
    pricing_notes: Optional[str] = None
    is_active: Optional[bool] = None


class MesterServiceResponse(MesterServiceBase):
    id: str
    mester_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MesterCoverageAreaBase(BaseModel):
    city_id: Optional[str] = None
    district_id: Optional[str] = None
    postal_code_id: Optional[str] = None
    radius_km: Optional[float] = None
    priority: int = 0


class MesterCoverageAreaCreate(MesterCoverageAreaBase):
    mester_id: str


class MesterCoverageAreaUpdate(BaseModel):
    city_id: Optional[str] = None
    district_id: Optional[str] = None
    postal_code_id: Optional[str] = None
    radius_km: Optional[float] = None
    priority: Optional[int] = None


class MesterCoverageAreaResponse(MesterCoverageAreaBase):
    id: str
    mester_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class MesterReviewBase(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    author_name: Optional[str] = None
    is_public: bool = True


class MesterReviewCreate(MesterReviewBase):
    mester_id: str


class MesterReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None
    author_name: Optional[str] = None
    is_public: Optional[bool] = None


class MesterReviewResponse(MesterReviewBase):
    id: str
    mester_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# -----------------------------
# Search pros schemas
# -----------------------------


class SearchProsItem(BaseModel):
    mester: MesterResponse
    services: List[MesterServiceResponse]
    distance_km: Optional[float] = None
    score: float


class SearchProsResponse(BaseModel):
    items: List[SearchProsItem]
    next_cursor: Optional[str] = None


# -----------------------------
# Onboarding draft schemas
# -----------------------------


class OnboardingDraftBase(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    current_step: int = 0


class OnboardingDraftCreate(OnboardingDraftBase):
    pass


class OnboardingDraftUpdate(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    current_step: Optional[int] = None
    is_submitted: Optional[bool] = None


class OnboardingDraftResponse(OnboardingDraftBase):
    id: str
    is_submitted: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True