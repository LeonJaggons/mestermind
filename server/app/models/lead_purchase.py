from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class LeadPurchase(Base):
    """Model for tracking lead purchases by professionals"""
    __tablename__ = "lead_purchases"

    id = Column(Integer, primary_key=True, index=True)
    
    # References
    pro_profile_id = Column(Integer, ForeignKey("pro_profiles.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    
    # Pricing information at time of purchase
    service_category = Column(String, nullable=False)
    job_size = Column(String, nullable=False)  # small, standard, large
    urgency = Column(String, nullable=False)  # flexible, soon, emergency
    city_tier = Column(String, nullable=False)  # budapest_central, etc.
    
    # Calculated price
    base_price_huf = Column(Integer, nullable=False)
    urgency_multiplier = Column(Float, nullable=False)
    city_tier_multiplier = Column(Float, nullable=False)
    final_price_huf = Column(Integer, nullable=False)
    currency = Column(String, default="HUF")
    
    # Payment information
    payment_status = Column(String, default="pending")  # pending, completed, failed, refunded
    payment_method = Column(String, nullable=True)  # stripe, paypal, etc.
    payment_transaction_id = Column(String, nullable=True)
    
    # Timestamps
    purchased_at = Column(DateTime(timezone=True), server_default=func.now())
    payment_completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    pro_profile = relationship("ProProfile", back_populates="lead_purchases")
    job = relationship("Job", back_populates="lead_purchases")
