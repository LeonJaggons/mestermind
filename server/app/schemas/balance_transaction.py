from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.balance_transaction import BalanceTransactionType


class BalanceTransactionBase(BaseModel):
    transaction_type: BalanceTransactionType
    amount_huf: int
    description: Optional[str] = None


class BalanceTransactionCreate(BalanceTransactionBase):
    pro_profile_id: int
    lead_purchase_id: Optional[int] = None
    stripe_payment_intent_id: Optional[str] = None


class BalanceTransactionResponse(BaseModel):
    id: int
    pro_profile_id: int
    transaction_type: BalanceTransactionType
    amount_huf: int
    balance_before_huf: int
    balance_after_huf: int
    lead_purchase_id: Optional[int] = None
    stripe_payment_intent_id: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AddFundsRequest(BaseModel):
    pro_profile_id: int
    amount_huf: int  # Amount to add in HUF
    payment_method_id: Optional[str] = None  # Optional saved payment method ID


class BalanceResponse(BaseModel):
    balance_huf: int
    currency: str = "HUF"

