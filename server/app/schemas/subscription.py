from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.subscription import SubscriptionStatus


class SubscriptionBase(BaseModel):
    pro_profile_id: int
    stripe_subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    status: Optional[SubscriptionStatus] = SubscriptionStatus.active
    amount_huf: int = 5000
    currency: str = "HUF"
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False


class SubscriptionCreate(SubscriptionBase):
    pass


class SubscriptionUpdate(BaseModel):
    stripe_subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    status: Optional[SubscriptionStatus] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: Optional[bool] = None
    cancelled_at: Optional[datetime] = None


class SubscriptionResponse(SubscriptionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

