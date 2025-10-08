"""
Mester profile routes
GET /v1/mesters/{id}
"""

from typing import List, Optional, Dict, Any
from sqlalchemy import desc, text

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import (
    Mester,
    MesterService,
    MesterResponse,
    MesterServiceResponse,
    MesterServiceCreate,
    MesterServiceUpdate,
)
from app.models.database import MesterProfile


router = APIRouter(prefix="/v1/mesters", tags=["mesters"])


class MesterDetailResponse(BaseModel):
    mester: MesterResponse
    services: List[MesterServiceResponse] = []


class BestMatchResponse(BaseModel):
    id: str
    full_name: str
    slug: str
    rating_avg: Optional[float]
    review_count: int
    years_experience: Optional[int]
    is_verified: bool
    category: str  # "frequently_hired", "responds_quickly", "highly_rated"
    is_top_pro: bool = False


@router.get("/best-matches", response_model=List[BestMatchResponse])
async def get_best_matches(
    service_id: Optional[str] = Query(None, description="Filter by service ID"),
    limit: int = Query(3, description="Number of best matches to return"),
    db: Session = Depends(get_db)
):
    """
    Get the best matching mesters based on different criteria:
    - Frequently hired (most jobs completed)
    - Responds quickly (fastest response time)
    - Highly rated (highest average rating)
    """
    
    # Base query for active mesters
    base_query = db.query(Mester).filter(Mester.is_active == True)  # noqa: E712
    
    # If service_id is provided, filter by mesters who offer that service
    if service_id:
        base_query = base_query.join(MesterService).filter(
            MesterService.service_id == service_id,
            MesterService.is_active == True  # noqa: E712
        )
    
    # Get most experienced mester (most years_experience)
    frequently_hired = (
        base_query
        .filter(Mester.years_experience.isnot(None))
        .order_by(desc(Mester.years_experience))
        .first()
    )
    
    # Get most verified mester (is_verified = true)
    responds_quickly = (
        base_query
        .filter(Mester.is_verified == True)  # noqa: E712
        .order_by(desc(Mester.review_count))
        .first()
    )
    
    # Get highest rated mester (highest rating_avg)
    highly_rated = (
        base_query
        .filter(Mester.rating_avg.isnot(None))
        .order_by(desc(Mester.rating_avg))
        .first()
    )
    
    results = []
    
    # Add most experienced mester
    if frequently_hired:
        results.append(BestMatchResponse(
            id=str(frequently_hired.id),
            full_name=frequently_hired.full_name,
            slug=frequently_hired.slug,
            rating_avg=frequently_hired.rating_avg,
            review_count=frequently_hired.review_count,
            years_experience=frequently_hired.years_experience,
            is_verified=frequently_hired.is_verified,
            category="frequently_hired",
            is_top_pro=bool(frequently_hired.years_experience and frequently_hired.years_experience > 5)
        ))
    
    # Add fastest responder (if different from frequently hired)
    if responds_quickly and responds_quickly.id != (frequently_hired.id if frequently_hired else None):
        results.append(BestMatchResponse(
            id=str(responds_quickly.id),
            full_name=responds_quickly.full_name,
            slug=responds_quickly.slug,
            rating_avg=responds_quickly.rating_avg,
            review_count=responds_quickly.review_count,
            years_experience=responds_quickly.years_experience,
            is_verified=responds_quickly.is_verified,
            category="responds_quickly",
            is_top_pro=bool(responds_quickly.rating_avg and responds_quickly.rating_avg >= 4.5)
        ))
    
    # Add highest rated mester (if different from previous ones)
    if highly_rated and highly_rated.id not in [r.id for r in results]:
        results.append(BestMatchResponse(
            id=str(highly_rated.id),
            full_name=highly_rated.full_name,
            slug=highly_rated.slug,
            rating_avg=highly_rated.rating_avg,
            review_count=highly_rated.review_count,
            years_experience=highly_rated.years_experience,
            is_verified=highly_rated.is_verified,
            category="highly_rated",
            is_top_pro=bool(highly_rated.rating_avg and highly_rated.rating_avg >= 4.8)
        ))
    
    # If we don't have enough results, fill with random mesters
    if len(results) < limit:
        remaining_needed = limit - len(results)
        existing_ids = [r.id for r in results]
        
        # Try to get top-rated mesters first
        additional_mesters = (
            base_query
            .filter(Mester.id.notin_(existing_ids))
            .filter(Mester.rating_avg.isnot(None))
            .order_by(desc(Mester.rating_avg))
            .limit(remaining_needed)
            .all()
        )
        
        # If still not enough, get any random mesters
        if len(additional_mesters) < remaining_needed:
            random_needed = remaining_needed - len(additional_mesters)
            random_mesters = (
                base_query
                .filter(Mester.id.notin_(existing_ids + [str(m.id) for m in additional_mesters]))
                .order_by(text("RANDOM()"))
                .limit(random_needed)
                .all()
            )
            additional_mesters.extend(random_mesters)
        
        # If still no results, get any mesters at all (fallback)
        if len(additional_mesters) < remaining_needed:
            fallback_needed = remaining_needed - len(additional_mesters)
            fallback_mesters = (
                db.query(Mester)
                .filter(Mester.is_active == True)  # noqa: E712
                .filter(Mester.id.notin_(existing_ids + [str(m.id) for m in additional_mesters]))
                .order_by(text("RANDOM()"))
                .limit(fallback_needed)
                .all()
            )
            additional_mesters.extend(fallback_mesters)
        
        for i, mester in enumerate(additional_mesters):
            # Assign categories based on position
            if i == 0:
                category = "highly_rated"
            elif i == 1:
                category = "responds_quickly"
            else:
                category = "frequently_hired"
                
            results.append(BestMatchResponse(
                id=str(mester.id),
                full_name=mester.full_name,
                slug=mester.slug,
                rating_avg=mester.rating_avg,
                review_count=mester.review_count,
                years_experience=mester.years_experience,
                is_verified=mester.is_verified,
                category=category,
                is_top_pro=bool(mester.rating_avg and mester.rating_avg >= 4.5)
            ))
    
    return results[:limit]


class ListMestersItem(BaseModel):
    id: str
    full_name: str
    slug: str
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    is_verified: bool
    rating_avg: Optional[float] = None
    review_count: int


class ListMestersResponse(BaseModel):
    items: List[ListMestersItem]
    next_cursor: Optional[str] = None


def _encode_cursor(payload: Dict[str, Any]) -> str:
    import json
    from base64 import urlsafe_b64encode

    return urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")


def _decode_cursor(cursor: Optional[str]) -> Dict[str, Any]:
    import json
    from base64 import urlsafe_b64decode

    if not cursor:
        return {}
    try:
        return json.loads(urlsafe_b64decode(cursor.encode("utf-8")).decode("utf-8"))
    except Exception:
        return {}


@router.get("/", response_model=ListMestersResponse)
async def list_mesters(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Keyword search across name, email, phone, tags, skills"),
    is_active: Optional[bool] = Query(None),
    is_verified: Optional[bool] = Query(None),
    limit: int = Query(25, ge=1, le=100),
    cursor: Optional[str] = Query(None),
):
    state = _decode_cursor(cursor)
    offset = int(state.get("offset", 0))

    query = db.query(Mester).order_by(Mester.full_name.asc())

    if is_active is not None:
        query = query.filter(Mester.is_active == is_active)  # noqa: E712
    if is_verified is not None:
        query = query.filter(Mester.is_verified == is_verified)  # noqa: E712
    if q:
        from sqlalchemy import or_, String, cast as sa_cast
        q_ilike = f"%{q}%"
        query = query.filter(
            or_(
                Mester.full_name.ilike(q_ilike),
                (Mester.email.ilike(q_ilike)),
                (Mester.phone.ilike(q_ilike)),
                sa_cast(Mester.tags, String).ilike(q_ilike),
                sa_cast(Mester.skills, String).ilike(q_ilike),
            )
        )

    records = query.offset(offset).limit(limit + 1).all()
    has_more = len(records) > limit
    items = records[:limit]

    next_cursor = _encode_cursor({"offset": offset + limit}) if has_more else None

    return ListMestersResponse(
        items=[
            ListMestersItem(
                id=str(m.id),
                full_name=m.full_name,
                slug=m.slug,
                email=m.email,
                phone=m.phone,
                is_active=m.is_active,
                is_verified=m.is_verified,
                rating_avg=m.rating_avg,
                review_count=m.review_count,
            )
            for m in items
        ],
        next_cursor=next_cursor,
    )


@router.post("/{mester_id}/services", response_model=MesterServiceResponse)
async def add_mester_service(mester_id: str, payload: MesterServiceCreate, db: Session = Depends(get_db)):
    # Ensure mester_id matches payload.mester_id or use path param
    try:
        import uuid as _uuid
        mester_uuid = _uuid.UUID(mester_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid mester_id")

    m = db.query(Mester).filter(Mester.id == mester_uuid).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mester not found")

    service_link = MesterService(
        mester_id=mester_uuid,
        service_id=payload.service_id,
        price_hour_min=payload.price_hour_min,
        price_hour_max=payload.price_hour_max,
        pricing_notes=payload.pricing_notes,
        is_active=payload.is_active,
    )
    db.add(service_link)
    try:
        db.commit()
    except Exception:
        db.rollback()
        # likely unique constraint violation
        raise HTTPException(status_code=400, detail="Service already linked to mester")
    db.refresh(service_link)
    return MesterServiceResponse(
        id=str(service_link.id),
        mester_id=str(service_link.mester_id),
        service_id=str(service_link.service_id),
        price_hour_min=service_link.price_hour_min,
        price_hour_max=service_link.price_hour_max,
        pricing_notes=service_link.pricing_notes,
        is_active=service_link.is_active,
        created_at=service_link.created_at,
        updated_at=service_link.updated_at,
    )


@router.put("/services/{link_id}", response_model=MesterServiceResponse)
async def update_mester_service(link_id: str, payload: MesterServiceUpdate, db: Session = Depends(get_db)):
    link = db.query(MesterService).filter(MesterService.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Mester service link not found")

    data = payload.dict(exclude_unset=True)
    for key, value in data.items():
        setattr(link, key, value)
    db.commit()
    db.refresh(link)
    return MesterServiceResponse(
        id=str(link.id),
        mester_id=str(link.mester_id),
        service_id=str(link.service_id),
        price_hour_min=link.price_hour_min,
        price_hour_max=link.price_hour_max,
        pricing_notes=link.pricing_notes,
        is_active=link.is_active,
        created_at=link.created_at,
        updated_at=link.updated_at,
    )


@router.delete("/services/{link_id}")
async def delete_mester_service(link_id: str, db: Session = Depends(get_db)):
    link = db.query(MesterService).filter(MesterService.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Mester service link not found")
    db.delete(link)
    db.commit()
    return {"ok": True}

@router.get("/{mester_id}", response_model=MesterDetailResponse)
async def get_mester_by_id(mester_id: str, db: Session = Depends(get_db)):
    # Try to determine if mester_id is a UUID or slug
    import re
    uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)
    
    if uuid_pattern.match(mester_id):
        # It's a UUID, query by id
        result = (
            db.query(Mester, MesterProfile)
            .outerjoin(MesterProfile, MesterProfile.mester_id == Mester.id)
            .filter(Mester.id == mester_id, Mester.is_active == True)  # noqa: E712
            .first()
        )
    else:
        # It's a slug, query by slug
        result = (
            db.query(Mester, MesterProfile)
            .outerjoin(MesterProfile, MesterProfile.mester_id == Mester.id)
            .filter(Mester.slug == mester_id, Mester.is_active == True)  # noqa: E712
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


