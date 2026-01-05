from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class LeadPurchaseCreate(BaseModel):
    job_id: int
    service_category: str
    job_size: str
    urgency: str
    city_tier: str
    base_price_huf: int
    urgency_multiplier: float
    city_tier_multiplier: float
    final_price_huf: int


class LeadPurchaseResponse(BaseModel):
    id: int
    pro_profile_id: int
    job_id: int
    service_category: str
    job_size: str
    urgency: str
    city_tier: str
    base_price_huf: int
    urgency_multiplier: float
    city_tier_multiplier: float
    final_price_huf: int
    currency: str
    payment_status: str
    payment_method: Optional[str] = None
    payment_transaction_id: Optional[str] = None
    purchased_at: datetime
    payment_completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
