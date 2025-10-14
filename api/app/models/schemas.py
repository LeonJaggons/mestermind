"""
Pydantic schemas for API requests and responses
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from enum import Enum
import uuid


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

    @field_validator("id", mode="before")
    @classmethod
    def convert_uuid_to_str(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

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

    key: Optional[str] = Field(
        None, min_length=1, max_length=100, pattern="^[a-zA-Z0-9_]+$"
    )
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
    user_id: Optional[str] = None
    mester_id: Optional[str] = None
    question_set_id: str
    place_id: Optional[str] = None
    # New optional contact + message fields
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    postal_code: Optional[str] = None
    message_to_pro: Optional[str] = None
    budget_estimate: Optional[float] = None
    answers: Optional[Dict[str, Any]] = None


class WeeklyAvailability(BaseModel):
    type: Literal["weekly"] = "weekly"
    days: List[int]
    start: str
    end: str


class RequestCreate(RequestBase):
    pass


class RequestUpdate(BaseModel):
    answers: Optional[Dict[str, Any]] = None
    availability: Optional[WeeklyAvailability] = None
    current_step: Optional[int] = None
    status: Optional[str] = None
    user_id: Optional[str] = None
    mester_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    postal_code: Optional[str] = None
    message_to_pro: Optional[str] = None
    budget_estimate: Optional[float] = None


class RequestResponse(BaseModel):
    id: str
    service_id: str
    user_id: Optional[str] = None
    mester_id: Optional[str] = None
    question_set_id: str
    place_id: Optional[str]
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    postal_code: Optional[str] = None
    message_to_pro: Optional[str] = None
    budget_estimate: Optional[float] = None
    current_step: int
    answers: Optional[Dict[str, Any]]
    availability: Optional[WeeklyAvailability] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# -----------------------------
# Offer schemas
# -----------------------------


class OfferBase(BaseModel):
    request_id: str
    mester_id: str
    price: float
    currency: str = "HUF"
    message: Optional[str] = None


class OfferCreate(BaseModel):
    request_id: str
    price: float
    currency: str = "HUF"
    message: Optional[str] = None


class OfferUpdate(BaseModel):
    price: Optional[float] = None
    message: Optional[str] = None
    status: Optional[str] = None


class OfferResponse(BaseModel):
    id: str
    request_id: str
    mester_id: str
    price: float
    currency: str
    message: Optional[str]
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    expires_at: Optional[datetime]

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


# -----------------------------
# Messaging schemas
# -----------------------------


class MessageThreadCreate(BaseModel):
    request_id: str
    mester_id: str
    customer_user_id: Optional[str] = None


class MessageThreadResponse(BaseModel):
    id: str
    request_id: str
    mester_id: str
    customer_user_id: Optional[str] = None
    last_message_at: Optional[datetime] = None
    last_message_preview: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    body: str
    sender_type: str  # 'customer' | 'mester'
    sender_user_id: Optional[str] = None
    sender_mester_id: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    thread_id: str
    body: str
    sender_type: str
    sender_user_id: Optional[str] = None
    sender_mester_id: Optional[str] = None
    is_read_by_customer: bool
    is_read_by_mester: bool
    is_blurred: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


# -----------------------------
# Notification schemas
# -----------------------------


class NotificationType(str, Enum):
    """Notification type enum"""

    NEW_REQUEST = "new_request"
    NEW_OFFER = "new_offer"
    NEW_MESSAGE = "new_message"
    BOOKING_CONFIRMED = "booking_confirmed"
    REVIEW_REMINDER = "review_reminder"
    PAYMENT_RECEIVED = "payment_received"


class NotificationResponse(BaseModel):
    """Notification response model"""

    id: str
    user_id: Optional[str] = None
    mester_id: Optional[str] = None
    type: str
    title: str
    body: str
    request_id: Optional[str] = None
    offer_id: Optional[str] = None
    message_id: Optional[str] = None
    action_url: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Notification list response with unread count"""

    items: List[NotificationResponse]
    unread_count: int


class NotificationPreferenceResponse(BaseModel):
    """Notification preference response model"""

    id: str
    user_id: Optional[str] = None
    mester_id: Optional[str] = None
    preferences: Dict[str, Any]
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationPreferenceUpdate(BaseModel):
    """Notification preference update model"""

    preferences: Dict[str, Any]
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None


# -----------------------------
# Pricing schemas
# -----------------------------


class LeadPriceBreakdown(BaseModel):
    """Detailed breakdown of how the lead price was calculated"""

    expected_job_value: float
    value_source: str  # "customer_estimate", "typical_range_midpoint", "fallback_floor"
    target_take_rate: float
    base_price_before_constraints: float
    price_floor: float
    price_cap: float
    final_price: float
    applied_constraint: Optional[str] = None  # "floor", "cap", or None


class JobMetrics(BaseModel):
    """Detailed metrics about the job opportunity"""

    estimated_job_value_min: float
    estimated_job_value_max: float
    estimated_job_value_midpoint: float
    customer_budget: Optional[float] = None
    has_customer_budget: bool
    expected_roi: float  # Expected return on investment (job value / lead price)
    expected_profit_min: float
    expected_profit_max: float
    win_rate_min: float
    win_rate_max: float
    win_rate_avg: float
    expected_value: float  # job_value * win_rate
    competition_level: str  # "low", "medium", "high"
    urgency_score: int  # 1-10 based on how recently posted


class LeadPriceResponse(BaseModel):
    """Response model for lead pricing"""

    request_id: str
    price: float
    currency: str = "HUF"
    band_code: str
    band_label: str
    band_description: Optional[str] = None
    seats_available: int
    estimated_close_rate: float
    breakdown: LeadPriceBreakdown
    job_metrics: JobMetrics
    value_proposition: str  # Human-readable value prop


# -----------------------------
# Payment schemas (Stripe)
# -----------------------------


class PaymentIntentCreate(BaseModel):
    """Request to create a payment intent"""

    request_id: str
    thread_id: Optional[str] = None
    return_url: Optional[str] = None


class PaymentIntentResponse(BaseModel):
    """Response containing Stripe payment intent details"""

    payment_id: str
    client_secret: str
    amount: int
    currency: str
    status: str


class PaymentConfirm(BaseModel):
    """Confirmation of successful payment"""

    payment_intent_id: str


class PaymentResponse(BaseModel):
    """Payment record response"""

    id: str
    mester_id: str
    amount: int
    currency: str
    status: str
    stripe_payment_intent_id: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LeadPurchaseResponse(BaseModel):
    """Lead purchase record response"""

    id: str
    payment_id: str
    mester_id: str
    request_id: str
    thread_id: Optional[str] = None
    price_paid: int
    currency: str
    price_band_code: Optional[str] = None
    unlocked_at: datetime

    class Config:
        from_attributes = True


# -----------------------------
# Saved Payment Method schemas
# -----------------------------


class SavedPaymentMethodBase(BaseModel):
    """Base saved payment method schema"""

    card_brand: Optional[str] = None
    card_last4: Optional[str] = None
    card_exp_month: Optional[int] = None
    card_exp_year: Optional[int] = None
    is_default: bool = False


class SavedPaymentMethodCreate(BaseModel):
    """Request to save a payment method"""

    stripe_payment_method_id: str
    is_default: bool = False


class SavedPaymentMethodUpdate(BaseModel):
    """Request to update a saved payment method"""

    is_default: Optional[bool] = None


class SavedPaymentMethodResponse(SavedPaymentMethodBase):
    """Saved payment method response"""

    id: str
    mester_id: str
    stripe_payment_method_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SavedPaymentMethodListResponse(BaseModel):
    """List of saved payment methods"""

    payment_methods: list[SavedPaymentMethodResponse]
    total: int


class PaymentIntentCreateWithMethod(BaseModel):
    """Request to create a payment intent with optional saved payment method"""

    request_id: str
    thread_id: Optional[str] = None
    return_url: Optional[str] = None
    payment_method_id: Optional[str] = None  # Stripe payment method ID
    save_payment_method: bool = False  # Whether to save this payment method


# -----------------------------
# Appointment Proposal schemas
# -----------------------------


class AppointmentProposalStatus(str, Enum):
    """Appointment proposal status enum"""

    PROPOSED = "proposed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class AppointmentProposalCreate(BaseModel):
    """Request to create an appointment proposal"""

    proposed_date: datetime
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    
    # Offer details (price quote)
    price: float
    currency: str = "HUF"
    offer_message: Optional[str] = None


class AppointmentProposalResponse(BaseModel):
    """Appointment proposal response"""

    id: str
    thread_id: str
    mester_id: str
    request_id: str
    customer_user_id: Optional[str] = None
    proposed_date: datetime
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    status: str
    response_message: Optional[str] = None
    responded_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    appointment_id: Optional[str] = None  # ID of the confirmed appointment if accepted
    
    # Offer details (if linked)
    offer_id: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    offer_message: Optional[str] = None
    offer_status: Optional[str] = None
    
    # Request details
    request_service_id: Optional[str] = None
    request_service_name: Optional[str] = None
    request_customer_name: Optional[str] = None
    request_postal_code: Optional[str] = None
    request_message: Optional[str] = None

    class Config:
        from_attributes = True


class AppointmentProposalAccept(BaseModel):
    """Request to accept an appointment proposal"""

    response_message: Optional[str] = None


class AppointmentProposalReject(BaseModel):
    """Request to reject an appointment proposal"""

    response_message: Optional[str] = None


# -----------------------------
# Appointment Schemas
# -----------------------------


class AppointmentStatus(str, Enum):
    """Appointment status enum"""
    CONFIRMED = "confirmed"
    RESCHEDULED = "rescheduled"
    CANCELLED_BY_CUSTOMER = "cancelled_by_customer"
    CANCELLED_BY_MESTER = "cancelled_by_mester"
    COMPLETED = "completed"
    NO_SHOW = "no_show"


class AppointmentCreate(BaseModel):
    """Request to create an appointment (from accepted proposal)"""
    
    proposal_id: str
    location_address: Optional[str] = None
    location_coordinates: Optional[str] = None
    customer_notes: Optional[str] = None


class AppointmentReschedule(BaseModel):
    """Request to reschedule an appointment"""
    
    new_start: datetime
    new_duration_minutes: Optional[int] = None
    reason: Optional[str] = None


class AppointmentCancel(BaseModel):
    """Request to cancel an appointment"""
    
    reason: str
    cancelled_by: str  # "customer" or "mester"


class AppointmentComplete(BaseModel):
    """Request to mark appointment as completed"""
    
    notes: Optional[str] = None


class AppointmentResponse(BaseModel):
    """Appointment response"""
    
    id: str
    proposal_id: str
    thread_id: str
    mester_id: str
    request_id: str
    customer_user_id: str
    
    scheduled_start: datetime
    scheduled_end: datetime
    duration_minutes: int
    
    location: str
    location_address: Optional[str] = None
    location_coordinates: Optional[str] = None
    
    mester_notes: Optional[str] = None
    customer_notes: Optional[str] = None
    internal_notes: Optional[str] = None
    
    status: str
    
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    completed_at: Optional[datetime] = None
    
    rescheduled_from_id: Optional[str] = None
    rescheduled_to_id: Optional[str] = None
    
    confirmed_by_customer_at: Optional[datetime] = None
    confirmed_by_mester_at: Optional[datetime] = None
    
    google_calendar_event_id: Optional[str] = None
    ical_uid: Optional[str] = None
    
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# -----------------------------
# Calendar & Availability Schemas
# -----------------------------


class MesterCalendarCreate(BaseModel):
    """Request to create mester calendar settings"""
    
    timezone: str = "Europe/Budapest"
    default_working_hours: Optional[Dict[str, Any]] = None
    buffer_minutes: int = 15
    min_advance_hours: int = 24
    max_advance_days: int = 90
    default_duration_minutes: int = 60
    allow_online_booking: bool = True


class MesterCalendarUpdate(BaseModel):
    """Request to update mester calendar settings"""
    
    timezone: Optional[str] = None
    default_working_hours: Optional[Dict[str, Any]] = None
    buffer_minutes: Optional[int] = None
    min_advance_hours: Optional[int] = None
    max_advance_days: Optional[int] = None
    default_duration_minutes: Optional[int] = None
    allow_online_booking: Optional[bool] = None


class MesterCalendarResponse(BaseModel):
    """Mester calendar response"""
    
    id: str
    mester_id: str
    timezone: str
    default_working_hours: Optional[Dict[str, Any]] = None
    buffer_minutes: int
    min_advance_hours: int
    max_advance_days: int
    default_duration_minutes: int
    allow_online_booking: bool
    google_calendar_enabled: bool
    google_calendar_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class AvailabilitySlotCreate(BaseModel):
    """Request to create an availability slot"""
    
    start_time: datetime
    end_time: datetime
    is_available: bool = True
    reason: Optional[str] = None
    notes: Optional[str] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[Dict[str, Any]] = None


class AvailabilitySlotUpdate(BaseModel):
    """Request to update an availability slot"""
    
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_available: Optional[bool] = None
    reason: Optional[str] = None
    notes: Optional[str] = None


class AvailabilitySlotResponse(BaseModel):
    """Availability slot response"""
    
    id: str
    mester_id: str
    start_time: datetime
    end_time: datetime
    is_available: bool
    reason: Optional[str] = None
    notes: Optional[str] = None
    is_recurring: bool
    recurrence_pattern: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class AvailableTimeSlot(BaseModel):
    """Available time slot for booking"""
    
    start: datetime
    end: datetime
    duration_minutes: int


class AvailabilityCheckRequest(BaseModel):
    """Request to check availability"""
    
    date: str  # YYYY-MM-DD
    duration_minutes: int


class AvailabilityCheckResponse(BaseModel):
    """Response with available time slots"""
    
    date: str
    available_slots: List[AvailableTimeSlot]


# -----------------------------
# Reminder Schemas
# -----------------------------


class ReminderStatus(str, Enum):
    """Reminder status enum"""
    SCHEDULED = "scheduled"
    SENT = "sent"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AppointmentReminderCreate(BaseModel):
    """Request to create an appointment reminder"""
    
    appointment_id: str
    recipient_type: str  # "customer" or "mester"
    recipient_id: str
    minutes_before: int
    send_email: bool = True
    send_sms: bool = False
    send_push: bool = True


class AppointmentReminderResponse(BaseModel):
    """Appointment reminder response"""
    
    id: str
    appointment_id: str
    recipient_type: str
    recipient_id: str
    remind_at: datetime
    minutes_before: int
    send_email: bool
    send_sms: bool
    send_push: bool
    status: str
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# -----------------------------
# Calendar Export Schemas
# -----------------------------


class CalendarExportRequest(BaseModel):
    """Request to export calendar"""
    
    format: str = "ical"  # "ical" or "google"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class GoogleCalendarAuthRequest(BaseModel):
    """Request to authenticate with Google Calendar"""
    
    auth_code: str


class GoogleCalendarSyncRequest(BaseModel):
    """Request to sync with Google Calendar"""
    
    calendar_id: str
