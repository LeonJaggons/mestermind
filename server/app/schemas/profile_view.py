from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProfileViewCreate(BaseModel):
    pro_profile_id: int
    service_id: Optional[str] = None
    viewer_ip: Optional[str] = None
    viewer_user_id: Optional[int] = None


class ProfileViewResponse(BaseModel):
    id: int
    pro_profile_id: int
    service_id: Optional[str] = None
    viewer_ip: Optional[str] = None
    viewer_user_id: Optional[int] = None
    viewed_at: datetime
    
    class Config:
        from_attributes = True


class ViewCountResponse(BaseModel):
    total_views: int
    views_by_service: dict[str, int]  # service_id -> count
    views_this_week: int
    views_this_month: int
