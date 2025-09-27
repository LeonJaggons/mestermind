"""
SQLAlchemy database models for Mestermind API
"""

from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum
from app.core.database import Base


class UserRole(enum.Enum):
    CUSTOMER = "customer"
    SERVICE_PROVIDER = "service_provider"
    ADMIN = "admin"


class JobStatus(enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class QuoteStatus(enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"


class User(Base):
    """User model for customers and service providers"""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.CUSTOMER)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    customer_jobs = relationship("JobRequest", back_populates="customer", foreign_keys="JobRequest.customer_id")
    provider_quotes = relationship("Quote", back_populates="service_provider", foreign_keys="Quote.provider_id")
    provider_profile = relationship("ServiceProvider", back_populates="user", uselist=False)


class ServiceProvider(Base):
    """Service provider profile model"""
    __tablename__ = "service_providers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    business_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=False, index=True)
    rating = Column(Float, default=0.0)
    total_reviews = Column(Integer, default=0)
    is_verified = Column(Boolean, default=False)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="provider_profile")
    quotes = relationship("Quote", back_populates="service_provider")


class JobRequest(Base):
    """Job request model"""
    __tablename__ = "job_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False, index=True)
    location = Column(String(255), nullable=False, index=True)
    budget_min = Column(Float, nullable=True)
    budget_max = Column(Float, nullable=True)
    status = Column(Enum(JobStatus), default=JobStatus.OPEN)
    preferred_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    customer = relationship("User", back_populates="customer_jobs", foreign_keys=[customer_id])
    quotes = relationship("Quote", back_populates="job_request", cascade="all, delete-orphan")


class Quote(Base):
    """Quote model for service provider bids"""
    __tablename__ = "quotes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_request_id = Column(UUID(as_uuid=True), ForeignKey("job_requests.id"), nullable=False)
    provider_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    estimated_duration = Column(String(100), nullable=True)  # e.g., "2-3 days", "1 week"
    status = Column(Enum(QuoteStatus), default=QuoteStatus.PENDING)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    job_request = relationship("JobRequest", back_populates="quotes")
    service_provider = relationship("User", back_populates="provider_quotes", foreign_keys=[provider_id])


class Review(Base):
    """Review model for service provider ratings"""
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_request_id = Column(UUID(as_uuid=True), ForeignKey("job_requests.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    provider_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5 stars
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    job_request = relationship("JobRequest")
    customer = relationship("User", foreign_keys=[customer_id])
    provider = relationship("User", foreign_keys=[provider_id])


class Category(Base):
    """Service categories model"""
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    icon = Column(String(100), nullable=True)  # Icon name or URL
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
