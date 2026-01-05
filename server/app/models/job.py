from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, Numeric, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum


class JobStatus(str, enum.Enum):
    draft = "draft"
    open = "open"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(String, ForeignKey("services.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Job details
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    
    # Location
    city = Column(String, nullable=True)
    district = Column(String, nullable=True)
    street = Column(String, nullable=True)
    
    # Exact location coordinates (for privacy: shown only after appointment confirmation)
    exact_latitude = Column(Numeric(precision=10, scale=7), nullable=True)
    exact_longitude = Column(Numeric(precision=10, scale=7), nullable=True)
    
    # Timing
    timing = Column(String, nullable=True)
    
    # Budget
    budget = Column(String, nullable=True)
    
    # Contact info (if different from user profile)
    contact_name = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    
    # Photos (stored as JSON array of URLs)
    photos = Column(JSON, nullable=True)
    
    # Status
    status = Column(Enum(JobStatus), default=JobStatus.draft, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    user = relationship("User", backref="jobs")
    service = relationship("Service", backref="jobs")
    lead_purchases = relationship("LeadPurchase", back_populates="job", cascade="all, delete-orphan")
    
    def has_confirmed_appointment(self) -> bool:
        """
        Check if this job has at least one confirmed appointment.
        Used to determine whether to show exact location or obfuscated location.
        """
        from app.models.appointment import AppointmentStatus
        return any(
            appointment.status == AppointmentStatus.confirmed
            for appointment in self.appointments
        )
