from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ProServiceBase(BaseModel):
    pro_profile_id: int
    service_id: str


class ProServiceCreate(ProServiceBase):
    pass


class CategoryInfo(BaseModel):
    id: str
    name: str
    
    class Config:
        from_attributes = True


class ServiceInfo(BaseModel):
    id: str
    name: str
    category_id: str
    category: CategoryInfo
    
    class Config:
        from_attributes = True


class ProServiceResponse(ProServiceBase):
    id: int
    created_at: datetime
    service: ServiceInfo

    class Config:
        from_attributes = True
