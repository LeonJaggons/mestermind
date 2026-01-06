from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Dict, Any, List


class ProProfileBase(BaseModel):
    business_name: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    year_founded: Optional[int] = None
    number_of_employees: Optional[int] = None
    street_address: Optional[str] = None
    suite: Optional[str] = None
    city: Optional[str] = None
    zip_code: Optional[str] = None
    profile_image_url: Optional[str] = None
    business_intro: Optional[str] = None
    availability_type: Optional[str] = None
    schedule: Optional[Dict[str, Any]] = None
    lead_time_amount: Optional[int] = None
    lead_time_unit: Optional[str] = None
    advance_booking_amount: Optional[int] = None
    advance_booking_unit: Optional[str] = None
    time_zone: Optional[str] = None
    travel_time: Optional[int] = None
    service_distance: Optional[int] = None
    service_cities: Optional[List[int]] = None
    onboarding_completed: Optional[bool] = False


class ProProfileCreate(ProProfileBase):
    user_id: int


class ProProfileUpdate(BaseModel):
    business_name: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    year_founded: Optional[int] = None
    number_of_employees: Optional[int] = None
    street_address: Optional[str] = None
    suite: Optional[str] = None
    city: Optional[str] = None
    zip_code: Optional[str] = None
    profile_image_url: Optional[str] = None
    business_intro: Optional[str] = None
    availability_type: Optional[str] = None
    schedule: Optional[Dict[str, Any]] = None
    lead_time_amount: Optional[int] = None
    lead_time_unit: Optional[str] = None
    advance_booking_amount: Optional[int] = None
    advance_booking_unit: Optional[str] = None
    time_zone: Optional[str] = None
    travel_time: Optional[int] = None
    service_distance: Optional[int] = None
    service_cities: Optional[List[int]] = None
    onboarding_completed: Optional[bool] = None


class ProProfileResponse(ProProfileBase):
    id: int
    user_id: int
    balance_huf: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
