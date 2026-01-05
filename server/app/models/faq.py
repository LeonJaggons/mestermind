from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class FAQ(Base):
    __tablename__ = "faqs"

    id = Column(Integer, primary_key=True, index=True)
    pro_profile_id = Column(Integer, ForeignKey("pro_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # FAQ content
    question = Column(String, nullable=False)
    answer = Column(Text, nullable=True)  # Nullable so questions can be added without answers
    
    # Display order
    display_order = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    pro_profile = relationship("ProProfile", backref="faqs")


