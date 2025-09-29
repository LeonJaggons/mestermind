"""
Simplified SQLAlchemy database models for Mestermind API
Focusing on service categories and subcategories
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, text, JSON, Enum
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
