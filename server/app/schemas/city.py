from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class CityBase(BaseModel):
    name: str
    slug: str
    country: str
    country_code: str
    region: str
    population: int
    timezone: str
    is_capital: bool = False
    is_major_market: bool = False
    sort_order: int


class CityCreate(CityBase):
    id: str  # UUID


class CityUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    region: Optional[str] = None
    population: Optional[int] = None
    timezone: Optional[str] = None
    is_capital: Optional[bool] = None
    is_major_market: Optional[bool] = None
    sort_order: Optional[int] = None


class CityResponse(CityBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
