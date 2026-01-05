from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.invitation import InvitationStatus


class InvitationBase(BaseModel):
    job_id: int
    pro_profile_id: int


class InvitationCreate(InvitationBase):
    pass


class InvitationUpdate(BaseModel):
    status: Optional[InvitationStatus] = None
    pro_viewed: Optional[bool] = None


class InvitationResponse(InvitationBase):
    id: int
    status: InvitationStatus
    pro_viewed: bool
    created_at: datetime
    updated_at: Optional[datetime]
    responded_at: Optional[datetime]

    class Config:
        from_attributes = True


class InvitationWithDetails(InvitationResponse):
    job: Optional[dict] = None
    pro_profile: Optional[dict] = None

    class Config:
        from_attributes = True
