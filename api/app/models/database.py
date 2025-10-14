"""
Simplified SQLAlchemy database models for Mestermind API
Focusing on service categories and subcategories
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    text,
    JSON,
    Enum,
    Float,
    Numeric,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.core.database import Base


class User(Base):
    """End-user account linked to Firebase auth."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    firebase_uid: Mapped[Optional[str]] = mapped_column(
        String(128), nullable=True, unique=True, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )


class Category(Base):
    """Service categories model"""

    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True, index=True
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )  # Icon name or URL
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)  # For custom ordering
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )

    # Relationships
    subcategories: Mapped[List["Subcategory"]] = relationship(
        "Subcategory", back_populates="category", cascade="all, delete-orphan"
    )
    services: Mapped[List["Service"]] = relationship(
        "Service", back_populates="category", cascade="all, delete-orphan"
    )


class Subcategory(Base):
    """Service subcategories model"""

    __tablename__ = "subcategories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )

    # Relationships
    category: Mapped["Category"] = relationship(
        "Category", back_populates="subcategories"
    )
    services: Mapped[List["Service"]] = relationship(
        "Service", back_populates="subcategory", cascade="all, delete-orphan"
    )


class Service(Base):
    """Service model for individual services"""

    __tablename__ = "services"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False
    )
    subcategory_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subcategories.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requires_license: Mapped[bool] = mapped_column(Boolean, default=False)
    is_specialty: Mapped[bool] = mapped_column(Boolean, default=False)
    indoor_outdoor: Mapped[str] = mapped_column(
        String(20), nullable=False, default="both"
    )  # "indoor", "outdoor", "both"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )

    # Relationships
    category: Mapped["Category"] = relationship("Category", back_populates="services")
    subcategory: Mapped["Subcategory"] = relationship(
        "Subcategory", back_populates="services"
    )
    question_sets: Mapped[List["QuestionSet"]] = relationship(
        "QuestionSet", back_populates="service", cascade="all, delete-orphan"
    )


class QuestionSetStatus(str, enum.Enum):
    """Question set status enum"""

    DRAFT = "draft"
    PUBLISHED = "published"


class QuestionType(str, enum.Enum):
    """Question type enum"""

    TEXT = "text"
    NUMBER = "number"
    BOOLEAN = "boolean"
    SELECT = "select"
    MULTI_SELECT = "multi_select"
    DATE = "date"
    FILE = "file"


class QuestionSet(Base):
    """Question set model for services with versioning support"""

    __tablename__ = "question_sets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("services.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[QuestionSetStatus] = mapped_column(
        Enum(QuestionSetStatus), nullable=False, default=QuestionSetStatus.DRAFT
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )

    # Relationships
    service: Mapped["Service"] = relationship("Service", back_populates="question_sets")
    questions: Mapped[List["Question"]] = relationship(
        "Question", back_populates="question_set", cascade="all, delete-orphan"
    )


class Question(Base):
    """Question model with support for different types and conditional rules"""

    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    question_set_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("question_sets.id"), nullable=False
    )
    key: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # Unique identifier for the question
    label: Mapped[str] = mapped_column(String(255), nullable=False)  # Display label
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    question_type: Mapped[QuestionType] = mapped_column(
        Enum(QuestionType), nullable=False
    )
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)

    # Type-specific options stored as JSON
    options: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON, nullable=True
    )  # For select/multi_select options
    min_value: Mapped[Optional[float]] = mapped_column(nullable=True)  # For number type
    max_value: Mapped[Optional[float]] = mapped_column(nullable=True)  # For number type
    min_length: Mapped[Optional[int]] = mapped_column(nullable=True)  # For text type
    max_length: Mapped[Optional[int]] = mapped_column(nullable=True)  # For text type

    # Conditional rules stored as JSON
    conditional_rules: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON, nullable=True
    )

    # File upload constraints
    allowed_file_types: Mapped[Optional[List[str]]] = mapped_column(
        JSON, nullable=True
    )  # For file type
    max_file_size: Mapped[Optional[int]] = mapped_column(
        nullable=True
    )  # In bytes, for file type

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )

    # Relationships
    question_set: Mapped["QuestionSet"] = relationship(
        "QuestionSet", back_populates="questions"
    )


# -----------------------------
# Location models (Hungary)
# -----------------------------


class County(Base):
    """Hungarian county (megye)"""

    __tablename__ = "counties"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(
        String(120), nullable=False, unique=True, index=True
    )
    code: Mapped[Optional[str]] = mapped_column(
        String(10), nullable=True, unique=True
    )  # Optional administrative code
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )

    # Relationships
    cities: Mapped[List["City"]] = relationship(
        "City", back_populates="county", cascade="all, delete-orphan"
    )


class City(Base):
    """City/municipality within a county. Includes Budapest as a special case."""

    __tablename__ = "cities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    county_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("counties.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    is_capital: Mapped[bool] = mapped_column(Boolean, default=False)
    # Optional centroid coordinates for normalization/search
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lon: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )

    # Relationships
    county: Mapped["County"] = relationship("County", back_populates="cities")
    districts: Mapped[List["District"]] = relationship(
        "District", back_populates="city", cascade="all, delete-orphan"
    )
    postal_codes: Mapped[List["PostalCode"]] = relationship(
        "PostalCode", back_populates="city", cascade="all, delete-orphan"
    )


class District(Base):
    """Administrative district within certain cities (notably Budapest I-XXIII)."""

    __tablename__ = "districts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cities.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "I. kerület"
    code: Mapped[Optional[str]] = mapped_column(
        String(10), nullable=True, index=True
    )  # e.g., "I", "02", "XV"
    number: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )  # numeric form if available
    common_names: Mapped[Optional[List[str]]] = mapped_column(
        JSON, nullable=True
    )  # e.g., ["Zugló", "Zuglói"] for 14th district
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )

    # Relationships
    city: Mapped["City"] = relationship("City", back_populates="districts")
    postal_codes: Mapped[List["PostalCode"]] = relationship(
        "PostalCode", back_populates="district", cascade="all, delete-orphan"
    )


class PostalCode(Base):
    """Hungarian 4-digit postal codes, optionally associated to a district."""

    __tablename__ = "postal_codes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cities.id"), nullable=False, index=True
    )
    district_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("districts.id"), nullable=True, index=True
    )
    code: Mapped[str] = mapped_column(
        String(10), nullable=False, index=True
    )  # 4-digit code, keep string for safety
    is_po_box: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )

    # Relationships
    city: Mapped["City"] = relationship("City", back_populates="postal_codes")
    district: Mapped[Optional["District"]] = relationship(
        "District", back_populates="postal_codes"
    )


# -----------------------------
# Request models (Customer job requests)
# -----------------------------


class RequestStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    OPEN = "OPEN"
    QUOTED = "QUOTED"
    SHORTLISTED = "SHORTLISTED"
    ACCEPTED = "ACCEPTED"
    BOOKED = "BOOKED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class Request(Base):
    """Customer request capturing progressive answers and current step for resume/autosave."""

    __tablename__ = "requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("services.id"), nullable=False, index=True
    )
    mester_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=True, index=True
    )
    question_set_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("question_sets.id"), nullable=False, index=True
    )
    place_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # New contact and message fields
    first_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    postal_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    message_to_pro: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Customer's estimated budget for the request (stored as currency amount)
    budget_estimate: Mapped[Optional[float]] = mapped_column(
        Numeric(precision=10, scale=2), nullable=True
    )
    current_step: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    answers: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus), nullable=False, default=RequestStatus.DRAFT
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User")
    service: Mapped["Service"] = relationship("Service")
    mester: Mapped[Optional["Mester"]] = relationship("Mester")
    question_set: Mapped["QuestionSet"] = relationship("QuestionSet")
    availability: Mapped[Optional["RequestAvailability"]] = relationship(
        "RequestAvailability", back_populates="request", uselist=False, cascade="all, delete-orphan"
    )
class RequestAvailability(Base):
    """Normalized weekly availability for a customer request."""

    __tablename__ = "request_availability"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("requests.id", ondelete="CASCADE"), unique=True, index=True
    )
    days: Mapped[List[int]] = mapped_column(JSON, nullable=False, default=list)  # 0-6
    start: Mapped[str] = mapped_column(String(5), nullable=False)  # HH:MM
    end: Mapped[str] = mapped_column(String(5), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )

    # Relationship
    request: Mapped["Request"] = relationship("Request", back_populates="availability")



# -----------------------------
# Offer models
# -----------------------------


class OfferStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class Offer(Base):
    """Offer sent by a mester to a customer request."""

    __tablename__ = "offers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mesters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    price: Mapped[float] = mapped_column(Numeric(precision=10, scale=2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="HUF")
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[OfferStatus] = mapped_column(
        Enum(OfferStatus), nullable=False, default=OfferStatus.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    request: Mapped["Request"] = relationship("Request")
    mester: Mapped["Mester"] = relationship("Mester")


# -----------------------------
# Mester (service professional) models
# -----------------------------


class Mester(Base):
    """Service professional profile suitable for search and filtering."""

    __tablename__ = "mesters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    full_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(
        String(160), nullable=False, unique=True, index=True
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, unique=True
    )
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Searchable attributes
    skills: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    tags: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    languages: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    years_experience: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Ratings summary for sorting/filtering (denormalized)
    rating_avg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    review_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Verification and status
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Stripe integration
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, unique=True, index=True
    )

    # Location anchoring for geo search
    home_city_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True, index=True
    )
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lon: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User")
    home_city: Mapped[Optional["City"]] = relationship("City")
    services: Mapped[List["MesterService"]] = relationship(
        "MesterService", back_populates="mester", cascade="all, delete-orphan"
    )
    coverage_areas: Mapped[List["MesterCoverageArea"]] = relationship(
        "MesterCoverageArea", back_populates="mester", cascade="all, delete-orphan"
    )
    reviews: Mapped[List["MesterReview"]] = relationship(
        "MesterReview", back_populates="mester", cascade="all, delete-orphan"
    )
    calendar: Mapped[Optional["MesterCalendar"]] = relationship(
        "MesterCalendar", back_populates="mester", uselist=False
    )

    __table_args__ = (Index("ix_mesters_active_city", "is_active", "home_city_id"),)


class MesterProfile(Base):
    """Normalized profile info mirroring onboarding form (one-to-one with Mester)."""

    __tablename__ = "mester_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    mester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mesters.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    business_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    slug: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    year_founded: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    employees_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    intro: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    languages: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String(10)), nullable=True
    )

    availability_mode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    budget_mode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    weekly_budget: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    logo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )

    # Relationships to normalized tables
    services: Mapped[List["MesterProfileService"]] = relationship(
        "MesterProfileService", back_populates="profile", cascade="all, delete-orphan"
    )
    address: Mapped[Optional["MesterProfileAddress"]] = relationship(
        "MesterProfileAddress",
        back_populates="profile",
        uselist=False,
        cascade="all, delete-orphan",
    )
    coverage: Mapped[List["MesterProfileCoverage"]] = relationship(
        "MesterProfileCoverage", back_populates="profile", cascade="all, delete-orphan"
    )
    hours: Mapped[List["MesterProfileWorkingHour"]] = relationship(
        "MesterProfileWorkingHour",
        back_populates="profile",
        cascade="all, delete-orphan",
    )
    preferences: Mapped[Optional["MesterProfilePreference"]] = relationship(
        "MesterProfilePreference",
        back_populates="profile",
        uselist=False,
        cascade="all, delete-orphan",
    )
    budget: Mapped[Optional["MesterProfileBudget"]] = relationship(
        "MesterProfileBudget",
        back_populates="profile",
        uselist=False,
        cascade="all, delete-orphan",
    )


class MesterProfileService(Base):
    __tablename__ = "mester_profile_services"
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mester_profiles.id", ondelete="CASCADE"),
        index=True,
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("services.id"), nullable=False
    )
    service_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    pricing_model: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    price: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    profile: Mapped["MesterProfile"] = relationship(
        "MesterProfile", back_populates="services"
    )


class MesterProfileAddress(Base):
    __tablename__ = "mester_profile_addresses"
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mester_profiles.id", ondelete="CASCADE"),
        unique=True,
    )
    street: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    zip: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    home_city_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True
    )

    profile: Mapped["MesterProfile"] = relationship(
        "MesterProfile", back_populates="address"
    )


class MesterProfileCoverage(Base):
    __tablename__ = "mester_profile_coverage"
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mester_profiles.id", ondelete="CASCADE"),
        index=True,
    )
    city_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True
    )
    district_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("districts.id"), nullable=True
    )
    postal_code_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("postal_codes.id"), nullable=True
    )
    radius_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)

    profile: Mapped["MesterProfile"] = relationship(
        "MesterProfile", back_populates="coverage"
    )


class MesterProfileWorkingHour(Base):
    __tablename__ = "mester_profile_working_hours"
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mester_profiles.id", ondelete="CASCADE"),
        index=True,
    )
    day: Mapped[str] = mapped_column(String(3), nullable=False)  # Sun, Mon, ...
    open: Mapped[str] = mapped_column(String(5), nullable=False)  # HH:MM
    close: Mapped[str] = mapped_column(String(5), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    profile: Mapped["MesterProfile"] = relationship(
        "MesterProfile", back_populates="hours"
    )


class MesterProfilePreference(Base):
    __tablename__ = "mester_profile_preferences"
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mester_profiles.id", ondelete="CASCADE"),
        unique=True,
    )
    property_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    job_size: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    frequency: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    remove_debris: Mapped[bool] = mapped_column(Boolean, default=False)

    profile: Mapped["MesterProfile"] = relationship(
        "MesterProfile", back_populates="preferences"
    )


class MesterProfileBudget(Base):
    __tablename__ = "mester_profile_budgets"
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mester_profiles.id", ondelete="CASCADE"),
        unique=True,
    )
    budget_mode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    weekly_budget: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    profile: Mapped["MesterProfile"] = relationship(
        "MesterProfile", back_populates="budget"
    )


class MesterService(Base):
    """Join table between Mester and Service with pricing metadata."""

    __tablename__ = "mester_services"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    mester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=False, index=True
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("services.id"), nullable=False, index=True
    )

    price_hour_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    price_hour_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    pricing_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )

    # Relationships
    mester: Mapped["Mester"] = relationship("Mester", back_populates="services")
    service: Mapped["Service"] = relationship("Service")

    __table_args__ = (
        UniqueConstraint("mester_id", "service_id", name="uq_mester_service"),
        Index("ix_mester_services_active", "is_active"),
    )


class MesterCoverageArea(Base):
    """Geographic coverage for a Mester (city/district/postal code with optional radius)."""

    __tablename__ = "mester_coverage_areas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    mester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=False, index=True
    )
    city_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True, index=True
    )
    district_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("districts.id"), nullable=True, index=True
    )
    postal_code_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("postal_codes.id"), nullable=True, index=True
    )
    radius_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )

    # Relationships
    mester: Mapped["Mester"] = relationship("Mester", back_populates="coverage_areas")
    city: Mapped[Optional["City"]] = relationship("City")
    district: Mapped[Optional["District"]] = relationship("District")
    postal_code: Mapped[Optional["PostalCode"]] = relationship("PostalCode")


class MesterReview(Base):
    """Customer review for a Mester. Used to compute aggregated rating fields on Mester."""

    __tablename__ = "mester_reviews"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    mester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=False, index=True
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    author_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )

    # Relationships
    mester: Mapped["Mester"] = relationship("Mester", back_populates="reviews")


# -----------------------------
# Onboarding Drafts (server-side autosave)
# -----------------------------


class OnboardingDraft(Base):
    """Server-side draft to support autosave/resume for mester activation."""

    __tablename__ = "onboarding_drafts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    current_step: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_submitted: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )


# -----------------------------
# Messaging models
# -----------------------------


class MessageThread(Base):
    """Conversation thread between a customer and a mester about a specific request."""

    __tablename__ = "message_threads"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    customer_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    mester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=False, index=True
    )

    last_message_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_message_preview: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )

    # Relationships
    request: Mapped["Request"] = relationship("Request")
    mester: Mapped["Mester"] = relationship("Mester")
    customer: Mapped[Optional["User"]] = relationship("User")
    messages: Mapped[List["Message"]] = relationship(
        "Message", back_populates="thread", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("request_id", "mester_id", name="uq_thread_request_mester"),
    )


class Message(Base):
    """Individual message within a thread."""

    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("message_threads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # 'customer' or 'mester'
    sender_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    sender_mester_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=True, index=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_read_by_customer: Mapped[bool] = mapped_column(Boolean, default=False)
    is_read_by_mester: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )

    # Relationships
    thread: Mapped["MessageThread"] = relationship(
        "MessageThread", back_populates="messages"
    )


# -----------------------------
# Notification models
# -----------------------------


class NotificationType(str, enum.Enum):
    """Notification type enum"""

    NEW_REQUEST = "new_request"
    NEW_OFFER = "new_offer"
    NEW_MESSAGE = "new_message"
    BOOKING_CONFIRMED = "booking_confirmed"
    REVIEW_REMINDER = "review_reminder"
    PAYMENT_RECEIVED = "payment_received"


class NotificationChannel(str, enum.Enum):
    """Notification channel enum"""

    IN_APP = "in_app"
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"


class Notification(Base):
    """User notifications for in-app display"""

    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    mester_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=True, index=True
    )

    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)

    # Link to related entities
    request_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("requests.id"), nullable=True
    )
    offer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("offers.id"), nullable=True
    )
    message_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("messages.id"), nullable=True
    )

    # Action URL for clicking the notification
    action_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Additional data as JSON (renamed from metadata to avoid SQLAlchemy reserved name)
    data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), index=True
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User")
    mester: Mapped[Optional["Mester"]] = relationship("Mester")
    request: Mapped[Optional["Request"]] = relationship("Request")
    offer: Mapped[Optional["Offer"]] = relationship("Offer")
    message: Mapped[Optional["Message"]] = relationship("Message")

    __table_args__ = (
        Index("ix_notifications_recipient", "mester_id", "is_read", "created_at"),
        Index("ix_notifications_user_unread", "user_id", "is_read"),
    )


class NotificationPreference(Base):
    """User preferences for notification channels"""

    __tablename__ = "notification_preferences"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, unique=True
    )
    mester_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=True, unique=True
    )

    # Preferences by notification type and channel (JSON)
    # Example: {"new_request": {"email": true, "sms": false, "in_app": true}}
    preferences: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=lambda: {
            "new_request": {"email": True, "in_app": True, "sms": False},
            "new_offer": {"email": True, "in_app": True, "sms": False},
            "new_message": {"email": True, "in_app": True, "sms": False},
            "booking_confirmed": {"email": True, "in_app": True, "sms": True},
        },
    )

    # Quiet hours (no notifications during these times)
    quiet_hours_start: Mapped[Optional[str]] = mapped_column(
        String(5), nullable=True
    )  # "22:00"
    quiet_hours_end: Mapped[Optional[str]] = mapped_column(
        String(5), nullable=True
    )  # "08:00"

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User")
    mester: Mapped[Optional["Mester"]] = relationship("Mester")


class NotificationLog(Base):
    """Audit log for sent notifications (for debugging and analytics)"""

    __tablename__ = "notification_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    notification_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("notifications.id"), nullable=True, index=True
    )

    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel), nullable=False
    )
    recipient: Mapped[str] = mapped_column(String(255), nullable=False)  # email/phone

    status: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # sent, failed, bounced
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    provider: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # sendgrid, twilio
    provider_message_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )

    # Relationships
    notification: Mapped[Optional["Notification"]] = relationship("Notification")

    __table_args__ = (Index("ix_notification_logs_status", "status", "sent_at"),)


# -----------------------------
# Appointment Proposal models
# -----------------------------


class AppointmentProposalStatus(str, enum.Enum):
    """Appointment proposal status enum"""

    PROPOSED = "proposed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class AppointmentProposal(Base):
    """Appointment time proposal from mester to customer"""

    __tablename__ = "appointment_proposals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("message_threads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=False, index=True
    )
    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("requests.id"), nullable=False, index=True
    )
    customer_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    offer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("offers.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Proposed appointment details
    proposed_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[AppointmentProposalStatus] = mapped_column(
        Enum(AppointmentProposalStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=AppointmentProposalStatus.PROPOSED,
        index=True,
    )

    # Response details
    response_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    responded_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Expiration
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), index=True
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )

    # Relationships
    thread: Mapped["MessageThread"] = relationship("MessageThread")
    mester: Mapped["Mester"] = relationship("Mester")
    request: Mapped["Request"] = relationship("Request")
    customer: Mapped[Optional["User"]] = relationship("User")
    offer: Mapped[Optional["Offer"]] = relationship("Offer")
    appointment: Mapped[Optional["Appointment"]] = relationship(
        "Appointment", back_populates="proposal", uselist=False
    )

    __table_args__ = (
        Index("ix_appointment_proposals_thread_status", "thread_id", "status"),
        Index("ix_appointment_proposals_mester_status", "mester_id", "status"),
    )


# -----------------------------
# Appointment and Calendar models
# -----------------------------


class AppointmentStatus(str, enum.Enum):
    """Appointment status enum"""
    CONFIRMED = "confirmed"  # Appointment confirmed and scheduled
    RESCHEDULED = "rescheduled"  # Appointment was rescheduled
    CANCELLED_BY_CUSTOMER = "cancelled_by_customer"
    CANCELLED_BY_MESTER = "cancelled_by_mester"
    COMPLETED = "completed"  # Service was completed
    NO_SHOW = "no_show"  # Customer didn't show up


class Appointment(Base):
    """Actual confirmed appointment record"""
    
    __tablename__ = "appointments"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    proposal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("appointment_proposals.id"), 
        nullable=False, 
        index=True
    )
    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("message_threads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=False, index=True
    )
    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("requests.id"), nullable=False, index=True
    )
    customer_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    
    # Appointment details
    scheduled_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    scheduled_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Location
    location: Mapped[str] = mapped_column(Text, nullable=False)
    location_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location_coordinates: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # "lat,lng"
    
    # Notes
    mester_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    customer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    internal_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Status
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=AppointmentStatus.CONFIRMED,
        index=True,
    )
    
    # Cancellation info
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Completion info
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    
    # Reschedule tracking
    rescheduled_from_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("appointments.id"), nullable=True
    )
    rescheduled_to_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("appointments.id"), nullable=True
    )
    
    # Confirmation tracking
    confirmed_by_customer_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    confirmed_by_mester_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    
    # Calendar integration
    google_calendar_event_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ical_uid: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), index=True
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )
    
    # Relationships
    proposal: Mapped["AppointmentProposal"] = relationship(
        "AppointmentProposal", back_populates="appointment"
    )
    thread: Mapped["MessageThread"] = relationship("MessageThread")
    mester: Mapped["Mester"] = relationship("Mester")
    request: Mapped["Request"] = relationship("Request")
    customer: Mapped["User"] = relationship("User")
    
    __table_args__ = (
        Index("ix_appointments_mester_date", "mester_id", "scheduled_start"),
        Index("ix_appointments_customer_date", "customer_user_id", "scheduled_start"),
        Index("ix_appointments_status", "status"),
    )


class MesterCalendar(Base):
    """Mester's calendar and availability settings"""
    
    __tablename__ = "mester_calendars"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    mester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=False, unique=True, index=True
    )
    
    # Timezone
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="Europe/Budapest")
    
    # Default working hours (JSON format: {"monday": {"start": "09:00", "end": "17:00"}, ...})
    default_working_hours: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # Buffer time between appointments (minutes)
    buffer_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    
    # Minimum advance booking time (hours)
    min_advance_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=24)
    
    # Maximum advance booking time (days)
    max_advance_days: Mapped[int] = mapped_column(Integer, nullable=False, default=90)
    
    # Default appointment duration (minutes)
    default_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    
    # Allow online booking
    allow_online_booking: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Google Calendar sync
    google_calendar_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    google_calendar_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    google_refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    google_access_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    google_token_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )
    
    # Relationships
    mester: Mapped["Mester"] = relationship("Mester", back_populates="calendar")


class MesterAvailabilitySlot(Base):
    """Specific time slots when mester is available or unavailable"""
    
    __tablename__ = "mester_availability_slots"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    mester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=False, index=True
    )
    
    # Time slot
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    end_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    
    # Availability type
    is_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    # Reason/notes (e.g., "Lunch break", "Out of office", "Available for emergency calls")
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Recurring pattern (if applicable)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    recurrence_pattern: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )
    
    # Relationships
    mester: Mapped["Mester"] = relationship("Mester")
    
    __table_args__ = (
        Index("ix_mester_availability_mester_time", "mester_id", "start_time", "end_time"),
    )


class ReminderStatus(str, enum.Enum):
    """Reminder status enum"""
    SCHEDULED = "scheduled"
    SENT = "sent"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AppointmentReminder(Base):
    """Scheduled reminders for appointments"""
    
    __tablename__ = "appointment_reminders"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    appointment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    # Recipient
    recipient_type: Mapped[str] = mapped_column(
        String(20), nullable=False  # "customer" or "mester"
    )
    recipient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    
    # Timing
    remind_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    minutes_before: Mapped[int] = mapped_column(
        Integer, nullable=False  # e.g., 1440 for 24 hours before
    )
    
    # Delivery method
    send_email: Mapped[bool] = mapped_column(Boolean, default=True)
    send_sms: Mapped[bool] = mapped_column(Boolean, default=False)
    send_push: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Status
    status: Mapped[ReminderStatus] = mapped_column(
        Enum(ReminderStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=ReminderStatus.SCHEDULED,
        index=True,
    )
    
    # Delivery tracking
    sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )
    
    # Relationships
    appointment: Mapped["Appointment"] = relationship("Appointment")
    
    __table_args__ = (
        Index("ix_appointment_reminders_status_time", "status", "remind_at"),
    )


# -----------------------------
# Pricing models (Price Bands)
# -----------------------------


class PriceBand(Base):
    """Defines a pricing band (A-D) with metadata and constraints in HUF."""

    __tablename__ = "price_bands"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str] = mapped_column(String(10), nullable=False, unique=True, index=True)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="HUF")

    typical_job_value_min_huf: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    typical_job_value_max_huf: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    typical_close_rate_min: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    typical_close_rate_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    target_take_of_expected_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    price_floor_huf: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    price_cap_huf: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    seats_per_lead: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )


class PriceBandMapping(Base):
    """Maps category/subcategory pairs to a price band."""

    __tablename__ = "price_band_mappings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subcategory_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subcategories.id", ondelete="CASCADE"), nullable=False, index=True
    )
    price_band_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("price_bands.id", ondelete="CASCADE"), nullable=False, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )

    # Relationships
    category: Mapped["Category"] = relationship("Category")
    subcategory: Mapped["Subcategory"] = relationship("Subcategory")
    price_band: Mapped["PriceBand"] = relationship("PriceBand")

    __table_args__ = (
        UniqueConstraint("category_id", "subcategory_id", name="uq_price_band_cat_subcat"),
        Index("ix_price_band_mapping_band", "price_band_id"),
    )


# -----------------------------
# Payment models (Stripe Integration)
# -----------------------------


class PaymentStatus(str, enum.Enum):
    """Payment status enum"""
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"
    REFUNDED = "refunded"


class Payment(Base):
    """Payment transaction record for Stripe payments"""

    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    mester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=False, index=True
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # Amount in smallest currency unit (e.g., cents, fillér)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="HUF")
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING, index=True
    )
    
    # Stripe-specific fields
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, unique=True, index=True
    )
    stripe_client_secret: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stripe_charge_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Metadata
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    payment_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # Refund info
    refunded_amount: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=0)
    refund_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), index=True
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    mester: Mapped["Mester"] = relationship("Mester")
    lead_purchases: Mapped[List["LeadPurchase"]] = relationship(
        "LeadPurchase", back_populates="payment", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_payments_mester_status", "mester_id", "status"),
        Index("ix_payments_created", "created_at"),
    )


class LeadPurchase(Base):
    """Tracks which mesters have purchased which leads (requests)"""

    __tablename__ = "lead_purchases"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    payment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payments.id"), nullable=False, index=True
    )
    mester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=False, index=True
    )
    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("requests.id"), nullable=False, index=True
    )
    thread_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("message_threads.id"), nullable=True, index=True
    )
    
    # Pricing snapshot at time of purchase
    price_paid: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="HUF")
    price_band_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    
    # Lead details snapshot
    lead_details: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # Access tracking
    unlocked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), index=True
    )
    first_message_sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )

    # Relationships
    payment: Mapped["Payment"] = relationship("Payment", back_populates="lead_purchases")
    mester: Mapped["Mester"] = relationship("Mester")
    request: Mapped["Request"] = relationship("Request")
    thread: Mapped[Optional["MessageThread"]] = relationship("MessageThread")

    __table_args__ = (
        UniqueConstraint("mester_id", "request_id", name="uq_mester_request_purchase"),
        Index("ix_lead_purchases_mester_unlocked", "mester_id", "unlocked_at"),
    )


class SavedPaymentMethod(Base):
    """Saved payment methods for mesters to reuse for lead purchases"""
    
    __tablename__ = "saved_payment_methods"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    mester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=False, index=True
    )
    
    # Stripe payment method ID
    stripe_payment_method_id: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    
    # Payment method details (for display purposes)
    card_brand: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    card_last4: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)
    card_exp_month: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    card_exp_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Metadata
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )
    
    # Relationships
    mester: Mapped["Mester"] = relationship("Mester")
    
    __table_args__ = (
        Index("ix_saved_payment_methods_mester_default", "mester_id", "is_default"),
    )


# -----------------------------
# Job/Project Management models
# -----------------------------


class JobStatus(str, enum.Enum):
    """Job status enum for tracking job lifecycle"""
    PENDING = "pending"  # Job created, not started yet
    IN_PROGRESS = "in_progress"  # Work has begun
    ON_HOLD = "on_hold"  # Temporarily paused
    COMPLETED = "completed"  # Job finished
    CANCELLED = "cancelled"  # Job cancelled


class Job(Base):
    """Job/Project record tracking the actual work being performed"""
    
    __tablename__ = "jobs"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("requests.id"), nullable=False, index=True
    )
    appointment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("appointments.id"), nullable=True, index=True
    )
    mester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=False, index=True
    )
    customer_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    thread_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("message_threads.id"), nullable=True, index=True
    )
    
    # Job details
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Status tracking
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=JobStatus.PENDING,
        index=True,
    )
    
    # Timeline
    scheduled_start_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    scheduled_end_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    actual_start_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    actual_end_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    
    # Financial
    estimated_cost: Mapped[Optional[float]] = mapped_column(
        Numeric(precision=10, scale=2), nullable=True
    )
    final_cost: Mapped[Optional[float]] = mapped_column(
        Numeric(precision=10, scale=2), nullable=True
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="HUF")
    
    # Location
    location: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Completion tracking
    # customer_approved_at: Mapped[Optional[datetime]] = mapped_column(
    #     DateTime(timezone=True), nullable=True
    # )  # REMOVED: No approval step needed
    mester_marked_complete_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    
    # Customer satisfaction
    customer_satisfaction_rating: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True  # 1-5 scale
    )
    customer_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), index=True
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )
    
    # Relationships
    request: Mapped["Request"] = relationship("Request")
    appointment: Mapped[Optional["Appointment"]] = relationship("Appointment")
    mester: Mapped["Mester"] = relationship("Mester")
    customer: Mapped["User"] = relationship("User")
    thread: Mapped[Optional["MessageThread"]] = relationship("MessageThread")
    milestones: Mapped[List["JobMilestone"]] = relationship(
        "JobMilestone", back_populates="job", cascade="all, delete-orphan"
    )
    documents: Mapped[List["JobDocument"]] = relationship(
        "JobDocument", back_populates="job", cascade="all, delete-orphan"
    )
    status_history: Mapped[List["JobStatusHistory"]] = relationship(
        "JobStatusHistory", back_populates="job", cascade="all, delete-orphan"
    )
    notes: Mapped[List["JobNote"]] = relationship(
        "JobNote", back_populates="job", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        Index("ix_jobs_mester_status", "mester_id", "status"),
        Index("ix_jobs_customer_status", "customer_user_id", "status"),
        Index("ix_jobs_scheduled_start", "scheduled_start_date"),
    )


class MilestoneStatus(str, enum.Enum):
    """Milestone status enum"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class JobMilestone(Base):
    """Milestones/phases within a job"""
    
    __tablename__ = "job_milestones"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    # Milestone details
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Status
    status: Mapped[MilestoneStatus] = mapped_column(
        Enum(MilestoneStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=MilestoneStatus.PENDING,
    )
    
    # Ordering
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    # Timeline
    scheduled_start: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    scheduled_end: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    actual_start: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    actual_end: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    
    # Completion
    completion_percentage: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completion_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )
    
    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="milestones")
    documents: Mapped[List["JobDocument"]] = relationship(
        "JobDocument", back_populates="milestone", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        Index("ix_job_milestones_job_order", "job_id", "order_index"),
    )


class DocumentType(str, enum.Enum):
    """Document type enum"""
    PHOTO = "photo"
    DOCUMENT = "document"
    INVOICE = "invoice"
    CONTRACT = "contract"
    RECEIPT = "receipt"
    OTHER = "other"


class DocumentCategory(str, enum.Enum):
    """Document category for organizing uploads"""
    BEFORE = "before"  # Before work photos
    DURING = "during"  # Progress photos
    AFTER = "after"  # Completion photos
    INVOICE = "invoice"  # Invoices
    CONTRACT = "contract"  # Contracts
    PERMIT = "permit"  # Permits/licenses
    OTHER = "other"


class JobDocument(Base):
    """Documents and photos related to a job"""
    
    __tablename__ = "job_documents"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    milestone_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("job_milestones.id", ondelete="SET NULL"), nullable=True, index=True
    )
    
    # File details
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # bytes
    file_type: Mapped[str] = mapped_column(String(100), nullable=False)  # MIME type
    
    # Classification
    document_type: Mapped[DocumentType] = mapped_column(
        Enum(DocumentType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=DocumentType.OTHER,
    )
    category: Mapped[DocumentCategory] = mapped_column(
        Enum(DocumentCategory, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=DocumentCategory.OTHER,
    )
    
    # Metadata
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Uploader info
    uploaded_by_type: Mapped[str] = mapped_column(
        String(20), nullable=False  # "customer" or "mester"
    )
    uploaded_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    uploaded_by_mester_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=True
    )
    
    # Visibility
    is_visible_to_customer: Mapped[bool] = mapped_column(Boolean, default=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), index=True
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )
    
    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="documents")
    milestone: Mapped[Optional["JobMilestone"]] = relationship(
        "JobMilestone", back_populates="documents"
    )
    
    __table_args__ = (
        Index("ix_job_documents_job_category", "job_id", "category"),
        Index("ix_job_documents_type", "document_type"),
    )


class JobStatusHistory(Base):
    """Audit trail of job status changes"""
    
    __tablename__ = "job_status_history"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    # Status change
    previous_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    new_status: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # Changed by
    changed_by_type: Mapped[str] = mapped_column(
        String(20), nullable=False  # "customer" or "mester" or "system"
    )
    changed_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    changed_by_mester_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=True
    )
    
    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), index=True
    )
    
    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="status_history")
    
    __table_args__ = (
        Index("ix_job_status_history_job_created", "job_id", "created_at"),
    )


class JobNote(Base):
    """CRM-style notes for jobs"""
    
    __tablename__ = "job_notes"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    # Note content
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Author
    created_by_type: Mapped[str] = mapped_column(
        String(20), nullable=False  # "customer" or "mester"
    )
    created_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_by_mester_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=True
    )
    
    # Visibility
    is_private: Mapped[bool] = mapped_column(
        Boolean, default=False  # If True, only visible to mester (CRM note)
    )
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), index=True
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=text("now()")
    )
    
    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="notes")
    
    __table_args__ = (
        Index("ix_job_notes_job_created", "job_id", "created_at"),
        Index("ix_job_notes_pinned", "job_id", "is_pinned"),
    )
