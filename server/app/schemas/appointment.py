from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.appointment import AppointmentStatus, PricingType


class AddressBase(BaseModel):
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    postal_code: Optional[str] = None


class PricingBase(BaseModel):
    pricing_type: PricingType
    quoted_amount_huf: Optional[int] = None
    hourly_rate_huf: Optional[int] = None
    min_hours: Optional[int] = None
    price_note: Optional[str] = None


class AppointmentCreate(BaseModel):
    job_id: int
    customer_id: int
    pro_id: int
    service_category: str
    appointment_date: str
    appointment_start_time: str
    estimated_duration_minutes: int
    time_flexibility: Optional[str] = None
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    postal_code: Optional[str] = None
    access_note: Optional[str] = None
    pricing_type: PricingType
    quoted_amount_huf: Optional[int] = None
    hourly_rate_huf: Optional[int] = None
    min_hours: Optional[int] = None
    price_note: Optional[str] = None
    notify_customer_by_sms: bool = True
    notify_customer_by_email: bool = True
    reminder_minutes_before: int = 60
    pro_internal_note: Optional[str] = None


class AppointmentUpdate(BaseModel):
    status: Optional[AppointmentStatus] = None
    appointment_date: Optional[str] = None
    appointment_start_time: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None
    pro_internal_note: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: int
    job_id: int
    customer_id: int
    pro_id: int
    service_category: str
    appointment_date: str
    appointment_start_time: str
    estimated_duration_minutes: int
    time_flexibility: Optional[str] = None
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    postal_code: Optional[str] = None
    access_note: Optional[str] = None
    pricing_type: PricingType
    quoted_amount_huf: Optional[int] = None
    hourly_rate_huf: Optional[int] = None
    min_hours: Optional[int] = None
    price_note: Optional[str] = None
    status: AppointmentStatus
    notify_customer_by_sms: bool
    notify_customer_by_email: bool
    reminder_minutes_before: int
    pro_internal_note: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

