"""
Simplified SQLAlchemy database models for Mestermind API
Focusing on service categories and subcategories
"""

from datetime import datetime
from typing import List, Optional
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

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
