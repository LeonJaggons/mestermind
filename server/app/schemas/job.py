from pydantic import BaseModel, ConfigDict, computed_field
from decimal import Decimal
from datetime import datetime
from typing import Optional, List, Tuple
from app.models.job import JobStatus


class JobBase(BaseModel):
    user_id: int
    service_id: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    street: Optional[str] = None
    timing: Optional[str] = None
    budget: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    photos: Optional[List[str]] = None


class JobCreate(JobBase):
    status: Optional[JobStatus] = JobStatus.draft


class JobUpdate(BaseModel):
    service_id: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    street: Optional[str] = None
    timing: Optional[str] = None
    budget: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    photos: Optional[List[str]] = None
    status: Optional[JobStatus] = None


class JobResponse(JobBase):
    id: int
    status: JobStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Exact coordinates (stored in DB but not directly exposed for privacy)
    exact_latitude: Optional[Decimal] = None
    exact_longitude: Optional[Decimal] = None
    # Display location (obfuscated for privacy until appointment confirmed)
    display_latitude: Optional[float] = None
    display_longitude: Optional[float] = None
    # Whether this job has a confirmed appointment
    has_confirmed_appointment: bool = False

    model_config = ConfigDict(from_attributes=True)
