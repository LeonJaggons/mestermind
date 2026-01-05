from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum


class AppointmentStatus(str, enum.Enum):
    pending_customer_confirmation = "pending_customer_confirmation"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"


class PricingType(str, enum.Enum):
    fixed_price = "fixed_price"
    hourly_rate = "hourly_rate"


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    pro_id = Column(Integer, ForeignKey("pro_profiles.id", ondelete="CASCADE"), nullable=False)
    service_category = Column(String, nullable=False)
    
    # Date and time
    appointment_date = Column(String, nullable=False)  # ISO date string
    appointment_start_time = Column(String, nullable=False)  # HH:MM format
    estimated_duration_minutes = Column(Integer, nullable=False)
    time_flexibility = Column(String, nullable=True)  # e.g., "±30min"
    
    # Address
    address_line1 = Column(String, nullable=False)
    address_line2 = Column(String, nullable=True)
    city = Column(String, nullable=False)
    postal_code = Column(String, nullable=True)
    access_note = Column(Text, nullable=True)
    
    # Pricing
    pricing_type = Column(Enum(PricingType), nullable=False)
    quoted_amount_huf = Column(Integer, nullable=True)  # For fixed_price
    hourly_rate_huf = Column(Integer, nullable=True)  # For hourly_rate
    min_hours = Column(Integer, nullable=True)  # For hourly_rate
    price_note = Column(Text, nullable=True)
    
    # Status and notifications
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.pending_customer_confirmation, nullable=False)
    notify_customer_by_sms = Column(Boolean, default=True, nullable=False)
    notify_customer_by_email = Column(Boolean, default=True, nullable=False)
    reminder_minutes_before = Column(Integer, default=60, nullable=False)
    
    # Internal notes
    pro_internal_note = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    job = relationship("Job", backref="appointments")
    customer = relationship("User", foreign_keys=[customer_id], backref="appointments_as_customer")
    pro_profile = relationship("ProProfile", backref="appointments")

