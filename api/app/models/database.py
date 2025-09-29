"""
Simplified SQLAlchemy database models for Mestermind API
Focusing on service categories and subcategories
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, text, JSON, Enum, Float, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.core.database import Base


class Category(Base):
    """Service categories model"""
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Icon name or URL
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)  # For custom ordering
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=text('now()'))

    # Relationships
    subcategories: Mapped[List["Subcategory"]] = relationship("Subcategory", back_populates="category", cascade="all, delete-orphan")
    services: Mapped[List["Service"]] = relationship("Service", back_populates="category", cascade="all, delete-orphan")


class Subcategory(Base):
    """Service subcategories model"""
    __tablename__ = "subcategories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=text('now()'))

    # Relationships
    category: Mapped["Category"] = relationship("Category", back_populates="subcategories")
    services: Mapped[List["Service"]] = relationship("Service", back_populates="subcategory", cascade="all, delete-orphan")


class Service(Base):
    """Service model for individual services"""
    __tablename__ = "services"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    subcategory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("subcategories.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requires_license: Mapped[bool] = mapped_column(Boolean, default=False)
    is_specialty: Mapped[bool] = mapped_column(Boolean, default=False)
    indoor_outdoor: Mapped[str] = mapped_column(String(20), nullable=False, default="both")  # "indoor", "outdoor", "both"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=text('now()'))

    # Relationships
    category: Mapped["Category"] = relationship("Category", back_populates="services")
    subcategory: Mapped["Subcategory"] = relationship("Subcategory", back_populates="services")
    question_sets: Mapped[List["QuestionSet"]] = relationship("QuestionSet", back_populates="service", cascade="all, delete-orphan")


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

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("services.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[QuestionSetStatus] = mapped_column(Enum(QuestionSetStatus), nullable=False, default=QuestionSetStatus.DRAFT)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=text('now()'))

    # Relationships
    service: Mapped["Service"] = relationship("Service", back_populates="question_sets")
    questions: Mapped[List["Question"]] = relationship("Question", back_populates="question_set", cascade="all, delete-orphan")


class Question(Base):
    """Question model with support for different types and conditional rules"""
    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_set_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("question_sets.id"), nullable=False)
    key: Mapped[str] = mapped_column(String(100), nullable=False)  # Unique identifier for the question
    label: Mapped[str] = mapped_column(String(255), nullable=False)  # Display label
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    question_type: Mapped[QuestionType] = mapped_column(Enum(QuestionType), nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Type-specific options stored as JSON
    options: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)  # For select/multi_select options
    min_value: Mapped[Optional[float]] = mapped_column(nullable=True)  # For number type
    max_value: Mapped[Optional[float]] = mapped_column(nullable=True)  # For number type
    min_length: Mapped[Optional[int]] = mapped_column(nullable=True)  # For text type
    max_length: Mapped[Optional[int]] = mapped_column(nullable=True)  # For text type
    
    # Conditional rules stored as JSON
    conditional_rules: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # File upload constraints
    allowed_file_types: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)  # For file type
    max_file_size: Mapped[Optional[int]] = mapped_column(nullable=True)  # In bytes, for file type
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=text('now()'))

    # Relationships
    question_set: Mapped["QuestionSet"] = relationship("QuestionSet", back_populates="questions")


# -----------------------------
# Location models (Hungary)
# -----------------------------


class County(Base):
    """Hungarian county (megye)"""
    __tablename__ = "counties"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, unique=True)  # Optional administrative code
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=text('now()'))

    # Relationships
    cities: Mapped[List["City"]] = relationship("City", back_populates="county", cascade="all, delete-orphan")


class City(Base):
    """City/municipality within a county. Includes Budapest as a special case."""
    __tablename__ = "cities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    county_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("counties.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    is_capital: Mapped[bool] = mapped_column(Boolean, default=False)
    # Optional centroid coordinates for normalization/search
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lon: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=text('now()'))

    # Relationships
    county: Mapped["County"] = relationship("County", back_populates="cities")
    districts: Mapped[List["District"]] = relationship("District", back_populates="city", cascade="all, delete-orphan")
    postal_codes: Mapped[List["PostalCode"]] = relationship("PostalCode", back_populates="city", cascade="all, delete-orphan")


class District(Base):
    """Administrative district within certain cities (notably Budapest I-XXIII)."""
    __tablename__ = "districts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    city_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "I. kerület"
    code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)  # e.g., "I", "02", "XV"
    number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # numeric form if available
    common_names: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)  # e.g., ["Zugló", "Zuglói"] for 14th district
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=text('now()'))

    # Relationships
    city: Mapped["City"] = relationship("City", back_populates="districts")
    postal_codes: Mapped[List["PostalCode"]] = relationship("PostalCode", back_populates="district", cascade="all, delete-orphan")


class PostalCode(Base):
    """Hungarian 4-digit postal codes, optionally associated to a district."""
    __tablename__ = "postal_codes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    city_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=False, index=True)
    district_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("districts.id"), nullable=True, index=True)
    code: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # 4-digit code, keep string for safety
    is_po_box: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=text('now()'))

    # Relationships
    city: Mapped["City"] = relationship("City", back_populates="postal_codes")
    district: Mapped[Optional["District"]] = relationship("District", back_populates="postal_codes")


# -----------------------------
# Request models (Customer job requests)
# -----------------------------


class RequestStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"


class Request(Base):
    """Customer request capturing progressive answers and current step for resume/autosave."""
    __tablename__ = "requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("services.id"), nullable=False, index=True)
    question_set_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("question_sets.id"), nullable=False, index=True)
    place_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    current_step: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    answers: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    status: Mapped[RequestStatus] = mapped_column(Enum(RequestStatus), nullable=False, default=RequestStatus.DRAFT)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=text('now()'))

    # Relationships
    service: Mapped["Service"] = relationship("Service")
    question_set: Mapped["QuestionSet"] = relationship("QuestionSet")


# -----------------------------
# Mester (service professional) models
# -----------------------------


class Mester(Base):
    """Service professional profile suitable for search and filtering."""
    __tablename__ = "mesters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(160), nullable=False, unique=True, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, unique=True)
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

    # Location anchoring for geo search
    home_city_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True, index=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lon: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=text('now()'))

    # Relationships
    home_city: Mapped[Optional["City"]] = relationship("City")
    services: Mapped[List["MesterService"]] = relationship("MesterService", back_populates="mester", cascade="all, delete-orphan")
    coverage_areas: Mapped[List["MesterCoverageArea"]] = relationship("MesterCoverageArea", back_populates="mester", cascade="all, delete-orphan")
    reviews: Mapped[List["MesterReview"]] = relationship("MesterReview", back_populates="mester", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_mesters_active_city", "is_active", "home_city_id"),
    )


class MesterService(Base):
    """Join table between Mester and Service with pricing metadata."""
    __tablename__ = "mester_services"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mester_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=False, index=True)
    service_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("services.id"), nullable=False, index=True)

    price_hour_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    price_hour_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    pricing_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=text('now()'))

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

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mester_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=False, index=True)
    city_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True, index=True)
    district_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("districts.id"), nullable=True, index=True)
    postal_code_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("postal_codes.id"), nullable=True, index=True)
    radius_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text('now()'))

    # Relationships
    mester: Mapped["Mester"] = relationship("Mester", back_populates="coverage_areas")
    city: Mapped[Optional["City"]] = relationship("City")
    district: Mapped[Optional["District"]] = relationship("District")
    postal_code: Mapped[Optional["PostalCode"]] = relationship("PostalCode")


class MesterReview(Base):
    """Customer review for a Mester. Used to compute aggregated rating fields on Mester."""
    __tablename__ = "mester_reviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mester_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("mesters.id"), nullable=False, index=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    author_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text('now()'))

    # Relationships
    mester: Mapped["Mester"] = relationship("Mester", back_populates="reviews")


# -----------------------------
# Onboarding Drafts (server-side autosave)
# -----------------------------


class OnboardingDraft(Base):
    """Server-side draft to support autosave/resume for mester activation."""
    __tablename__ = "onboarding_drafts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    current_step: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_submitted: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=text('now()'))
