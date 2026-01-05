from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.db.session import get_db
from app.models.pro_profile import ProProfile
from app.models.pro_service import ProService
from app.models.service import Service
from app.models.user import User
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class MesterSearchResult(BaseModel):
    id: int
    user_id: int
    business_name: str
    business_intro: Optional[str]
    profile_image_url: Optional[str]
    city: Optional[str]
    zip_code: Optional[str]
    year_founded: Optional[int]
    number_of_employees: Optional[int]
    service_distance: Optional[int]
    
    class Config:
        from_attributes = True


@router.get("/mesters", response_model=List[MesterSearchResult])
def search_mesters(
    service_id: Optional[str] = Query(None, description="Service ID to filter by"),
    city: Optional[str] = Query(None, description="City to filter by"),
    zip_code: Optional[str] = Query(None, description="Zip code to filter by"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Search for mesters (pros) based on service, location, and other filters.
    Only returns pros who have completed onboarding.
    """
    # Start with base query - only completed onboarding pros
    query = db.query(ProProfile).filter(ProProfile.onboarding_completed == True)
    
    # Filter by service if provided
    if service_id:
        query = query.join(ProService).filter(ProService.service_id == service_id)
    
    # Filter by location
    if city:
        query = query.filter(func.lower(ProProfile.city) == city.lower())
    
    if zip_code:
        query = query.filter(ProProfile.zip_code == zip_code)
    
    # Get results
    mesters = query.offset(skip).limit(limit).all()
    
    return mesters
