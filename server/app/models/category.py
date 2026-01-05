from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True)  # UUID from JSON
    name = Column(String, unique=True, index=True, nullable=False)  # English name
    name_hu = Column(String, nullable=True)  # Hungarian translation
    slug = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    services = relationship("Service", back_populates="category", cascade="all, delete-orphan")
