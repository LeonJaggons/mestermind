"""
Search routes for service professionals (Mesters).
GET /v1/search/pros?q=&service_id=&lat=&lon=&radius_km=&cursor=
Ranking: service match > distance > rating
"""

from typing import List, Optional, Dict, Any
from base64 import urlsafe_b64decode, urlsafe_b64encode
import json

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, literal, String, cast as sa_cast, func

from app.core.database import get_db
from app.core.geo import haversine_sql_expr, haversine_distance_km
from app.models import (
    Mester,
    MesterService,
    SearchProsItem,
    SearchProsResponse,
    MesterResponse,
    MesterServiceResponse,
    City,
)
from app.models.database import MesterProfile


router = APIRouter(prefix="/v1/search", tags=["search"])


def _encode_cursor(payload: Dict[str, Any]) -> str:
    return urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")


def _decode_cursor(cursor: Optional[str]) -> Dict[str, Any]:
    if not cursor:
        return {}
    try:
        return json.loads(urlsafe_b64decode(cursor.encode("utf-8")).decode("utf-8"))
    except json.JSONDecodeError:
        return {}


@router.get("/pros", response_model=SearchProsResponse)
async def search_pros(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Keyword search across name, skills, tags"),
    service_id: Optional[str] = Query(None, description="Specific service ID to match"),
    lat: Optional[float] = Query(None, description="User latitude for distance sort"),
    lon: Optional[float] = Query(None, description="User longitude for distance sort"),
    radius_km: Optional[float] = Query(25.0, ge=0.1, le=200.0, description="Radius in KM for geo prefilter"),
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = Query(None),
):
    """Search professionals with ranking and cursor pagination.

    Ranking priority:
      1) service match (exact service)
      2) distance (closer first) when lat/lon provided
      3) rating (higher first)
    """

    state = _decode_cursor(cursor)
    offset = int(state.get("offset", 0))

    # Base query of active mesters with profile join
    query = db.query(Mester, MesterProfile)
    query = query.outerjoin(MesterProfile, MesterProfile.mester_id == Mester.id)
    query = query.filter(Mester.is_active == True)  # noqa: E712

    # Keyword match across name, skills, tags
    if q:
        q_ilike = f"%{q}%"
        query = query.filter(
            or_(
                Mester.full_name.ilike(q_ilike),
                sa_cast(Mester.skills, String).ilike(q_ilike),
                sa_cast(Mester.tags, String).ilike(q_ilike),
            )
        )

    # Service join and scoring flag
    if service_id:
        query = query.join(MesterService, MesterService.mester_id == Mester.id)
        query = query.filter(MesterService.service_id == service_id, MesterService.is_active == True)  # noqa: E712

    # Compute distance expression if coordinates provided
    distance_expr = None
    if lat is not None and lon is not None:
        # Fallback: use home city coordinates when mester.lat/lon are missing
        query = query.outerjoin(City, City.id == Mester.home_city_id)
        coalesce_lat = func.coalesce(Mester.lat, City.lat)
        coalesce_lon = func.coalesce(Mester.lon, City.lon)
        distance_expr = haversine_sql_expr(coalesce_lat, coalesce_lon, lat, lon) / 1000.0  # km
        if radius_km:
            # Keep mesters even if we can't compute distance (null coords); include those inside radius
            query = query.filter((distance_expr <= radius_km) | (distance_expr.is_(None)))

    # Order by: service match desc, distance asc, rating desc, name asc
    service_match_score = literal(1 if service_id else 0)
    order_cols: List[Any] = []
    if service_id:
        order_cols.append(service_match_score.desc())  # type: ignore[arg-type]
    if distance_expr is not None:
        order_cols.append(distance_expr.asc().nullslast())  # type: ignore[arg-type]
    order_cols.append(Mester.rating_avg.desc().nullslast())  # type: ignore[arg-type]
    order_cols.append(Mester.full_name.asc())  # type: ignore[arg-type]

    query = query.order_by(*order_cols)

    # Pagination using offset in cursor to avoid unstable results; for production prefer keyset
    mester_results = query.offset(offset).limit(limit + 1).all()

    items: List[SearchProsItem] = []
    for m, profile in mester_results[:limit]:
        # Fetch services for the mester when filtering or useful for display
        svc_query = db.query(MesterService).filter(MesterService.mester_id == m.id)
        if service_id:
            svc_query = svc_query.filter(MesterService.service_id == service_id)
        m_services = svc_query.all()

        # Compute distance value if coordinates are available
        distance_km_val: Optional[float] = None
        if lat is not None and lon is not None and m.lat is not None and m.lon is not None:
            try:
                distance_km_val = haversine_distance_km(float(m.lat), float(m.lon), float(lat), float(lon))
            except Exception:
                distance_km_val = None

        # Score: service match priority + rating (normalize) with small tie-breaker
        score = (1.0 if service_id else 0.0) * 10.0 + (m.rating_avg or 0.0)

        items.append(
            SearchProsItem(
                mester=MesterResponse(
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
                ),
                services=[
                    MesterServiceResponse(
                        id=str(ms.id),
                        mester_id=str(ms.mester_id),
                        service_id=str(ms.service_id),
                        price_hour_min=ms.price_hour_min,
                        price_hour_max=ms.price_hour_max,
                        pricing_notes=ms.pricing_notes,
                        is_active=ms.is_active,
                        created_at=ms.created_at,
                        updated_at=ms.updated_at,
                    )
                    for ms in m_services
                ],
                distance_km=distance_km_val,
                score=score,
            )
        )

    next_cursor = None
    if len(mester_results) > limit:
        next_cursor = _encode_cursor({"offset": offset + limit})

    return SearchProsResponse(items=items, next_cursor=next_cursor)


