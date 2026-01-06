from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class ProProfile(Base):
    __tablename__ = "pro_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Business Name (Step 1)
    business_name = Column(String, nullable=True)
    
    # Business Info (Step 2)
    phone = Column(String, nullable=True)
    website = Column(String, nullable=True)
    year_founded = Column(Integer, nullable=True)
    number_of_employees = Column(Integer, nullable=True)
    street_address = Column(String, nullable=False)
    suite = Column(String, nullable=True)
    city = Column(String, nullable=False)
    zip_code = Column(String, nullable=False)
    profile_image_url = Column(String, nullable=True)
    
    # Business Intro (Step 3)
    business_intro = Column(Text, nullable=True)
    
    # Availability (Step 4)
    availability_type = Column(String, nullable=True)  # 'flexible' or 'specific'
    schedule = Column(JSON, nullable=True)  # JSON object with weekly schedule
    lead_time_amount = Column(Integer, nullable=True)
    lead_time_unit = Column(String, nullable=True)  # 'hours', 'days', 'weeks'
    advance_booking_amount = Column(Integer, nullable=True)
    advance_booking_unit = Column(String, nullable=True)  # 'weeks', 'months', 'years'
    time_zone = Column(String, nullable=True)
    travel_time = Column(Integer, nullable=True)  # in minutes
    
    # Geo Preferences (Step 5)
    service_distance = Column(Integer, nullable=True)  # in miles
    service_cities = Column(JSON, nullable=True)  # JSON array of city IDs
    
    # Onboarding completion
    onboarding_completed = Column(Boolean, default=False, nullable=False)
    
    # Stripe payment information
    stripe_customer_id = Column(String, nullable=True)  # Stripe customer ID
    stripe_default_payment_method_id = Column(String, nullable=True)  # Default payment method
    
    # Balance/wallet information
    balance_huf = Column(Integer, default=0, nullable=False)  # Balance in HUF (stored as integer, e.g., 10000 = 100.00 HUF)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    user = relationship("User", back_populates="pro_profile")
    pro_services = relationship("ProService", back_populates="pro_profile", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="pro_profile", cascade="all, delete-orphan")
    lead_purchases = relationship("LeadPurchase", back_populates="pro_profile", cascade="all, delete-orphan")
