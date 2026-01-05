from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class ProfileView(Base):
    __tablename__ = "profile_views"

    id = Column(Integer, primary_key=True, index=True)
    pro_profile_id = Column(Integer, ForeignKey("pro_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(String, ForeignKey("services.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Track viewer information (optional, for analytics)
    viewer_ip = Column(String, nullable=True)  # IP address for basic tracking
    viewer_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # If logged in
    
    # Timestamp
    viewed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    pro_profile = relationship("ProProfile", backref="profile_views")
    service = relationship("Service")
    viewer = relationship("User", foreign_keys=[viewer_user_id])
