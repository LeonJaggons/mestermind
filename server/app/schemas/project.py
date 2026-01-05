from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ProjectMediaBase(BaseModel):
    media_url: str
    media_type: str  # 'image' or 'video'
    caption: Optional[str] = None
    display_order: int = 0


class ProjectMediaCreate(ProjectMediaBase):
    pass


class ProjectMediaResponse(ProjectMediaBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    media: Optional[List[ProjectMediaCreate]] = []


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class ProjectResponse(ProjectBase):
    id: int
    pro_profile_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    media: List[ProjectMediaResponse] = []

    class Config:
        from_attributes = True
