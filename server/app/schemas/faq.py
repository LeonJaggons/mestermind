from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class FAQBase(BaseModel):
    question: str
    answer: Optional[str] = None
    display_order: int = 0


class FAQCreate(FAQBase):
    pro_profile_id: int


class FAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    display_order: Optional[int] = None


class FAQResponse(FAQBase):
    id: int
    pro_profile_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


