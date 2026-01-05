from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    pro_profile_id = Column(Integer, ForeignKey("pro_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Project info
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    pro_profile = relationship("ProProfile", back_populates="projects")
    media = relationship("ProjectMedia", back_populates="project", cascade="all, delete-orphan")


class ProjectMedia(Base):
    __tablename__ = "project_media"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Media info
    media_url = Column(String, nullable=False)
    media_type = Column(String, nullable=False)  # 'image' or 'video'
    caption = Column(Text, nullable=True)
    display_order = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="media")
