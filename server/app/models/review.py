from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    pro_profile_id = Column(Integer, ForeignKey("pro_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Review content
    rating = Column(Integer, nullable=False)  # 1-5 stars
    comment = Column(Text, nullable=False)
    service_details = Column(Text, nullable=True)  # e.g., "2 bedrooms • 1 bathroom • Standard cleaning"
    
    # Customer info
    customer_name = Column(String, nullable=False)
    customer_avatar_url = Column(String, nullable=True)
    
    # Mester reply
    mester_reply = Column(Text, nullable=True)
    mester_replied_at = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    hired_on_platform = Column(Boolean, default=True, nullable=False)
    verified_hire = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    job = relationship("Job", backref="reviews")
    pro_profile = relationship("ProProfile", backref="reviews")
    user = relationship("User", backref="reviews")
