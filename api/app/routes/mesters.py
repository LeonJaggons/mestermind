"""
Mester profile routes
GET /v1/mesters/{id}
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Mester, MesterService, MesterResponse, MesterServiceResponse
from app.models.database import MesterProfile


router = APIRouter(prefix="/v1/mesters", tags=["mesters"])


class MesterDetailResponse(BaseModel):
    mester: MesterResponse
    services: List[MesterServiceResponse] = []


@router.get("/{mester_id}", response_model=MesterDetailResponse)
async def get_mester_by_id(mester_id: str, db: Session = Depends(get_db)):
    # Query mester with profile join
    result = (
        db.query(Mester, MesterProfile)
        .outerjoin(MesterProfile, MesterProfile.mester_id == Mester.id)
        .filter(Mester.id == mester_id, Mester.is_active == True)  # noqa: E712
        .first()
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Mester not found")
    
    m, profile = result

    services: List[MesterService] = (
        db.query(MesterService)
        .filter(MesterService.mester_id == m.id, MesterService.is_active == True)  # noqa: E712
        .all()
    )

    mester_response = MesterResponse(
        id=str(m.id),
        full_name=m.full_name,
        slug=m.slug,
        email=m.email,
        phone=m.phone,
        bio=profile.intro if profile else m.bio,
        logo_url=profile.logo_url if profile else None,
        skills=m.skills,
        tags=m.tags,
        languages=m.languages,
        years_experience=m.years_experience,
        is_verified=m.is_verified,
        is_active=m.is_active,
        home_city_id=str(m.home_city_id) if m.home_city_id else None,
        lat=m.lat,
        lon=m.lon,
        rating_avg=m.rating_avg,
        review_count=m.review_count,
        created_at=m.created_at,
        updated_at=m.updated_at,
    )

    service_responses = [
        MesterServiceResponse(
            id=str(s.id),
            mester_id=str(s.mester_id),
            service_id=str(s.service_id),
            price_hour_min=s.price_hour_min,
            price_hour_max=s.price_hour_max,
            pricing_notes=s.pricing_notes,
            is_active=s.is_active,
            created_at=s.created_at,
            updated_at=s.updated_at,
        )
        for s in services
    ]

    return MesterDetailResponse(
        mester=mester_response,
        services=service_responses,
    )


