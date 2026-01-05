from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ReviewBase(BaseModel):
    job_id: int
    pro_profile_id: int
    user_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: str
    service_details: Optional[str] = None
    customer_name: str
    customer_avatar_url: Optional[str] = None
    hired_on_platform: bool = True
    verified_hire: bool = False


class ReviewCreate(ReviewBase):
    pass


class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None
    service_details: Optional[str] = None
    mester_reply: Optional[str] = None


class ReviewResponse(ReviewBase):
    id: int
    mester_reply: Optional[str]
    mester_replied_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
