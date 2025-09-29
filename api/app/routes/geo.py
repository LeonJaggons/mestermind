"""
Geo search routes for Mestermind API
"""

import unicodedata

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models import City, County, District, PostalCode, GeoNormalizeRequest, GeoNormalizeResponse


router = APIRouter(prefix="/v1/geo", tags=["geo"])


def _normalize(text: str) -> str:
    """Lowercase and strip diacritics for simple matching."""
    if text is None:
        return ""
    text_lower = text.lower()
    nfkd = unicodedata.normalize("NFKD", text_lower)
    return "".join([c for c in nfkd if not unicodedata.combining(c)])


def _base_match_score(q_norm: str, name_norm: str) -> int:
    if name_norm == q_norm:
        return 100
    if name_norm.startswith(q_norm):
        return 80
    if q_norm in name_norm:
        return 60
    return 0


def _type_weight(result_type: str) -> float:
    if result_type == "postal_code":
        return 1.0
    if result_type == "district":
        return 0.9
    return 0.8  # city


@router.get("/search")
async def geo_search(
    q: str = Query(..., min_length=1, description="Free-text query for city, district or postal code"),
    limit: int = Query(10, ge=1, le=50, description="Max number of results")
    , db: Session = Depends(get_db)
):
    """
    Typeahead over cities, districts (Budapest), and postal codes.
    Response is a ranked union list with a common shape.
    """
    q_like = f"%{q}%"
    q_norm = _normalize(q)
    q_is_numeric = q.strip().isdigit()

    # Cities
    city_rows = (
        db.query(City, County)
        .join(County, City.county_id == County.id)
        .filter(City.is_active == True)  # noqa: E712
        .filter(func.lower(City.name).ilike(func.lower(q_like)))
        .order_by(City.sort_order, City.name)
        .limit(limit)
        .all()
    )

    # Districts - search in name and common_names via JSONB ILIKE
    from sqlalchemy import or_, text
    district_rows = (
        db.query(District, City, County)
        .join(City, District.city_id == City.id)
        .join(County, City.county_id == County.id)
        .filter(District.is_active == True)  # noqa: E712
        .filter(
            or_(
                func.lower(District.name).ilike(func.lower(q_like)),
                func.exists(
                    text("SELECT 1 FROM jsonb_array_elements_text(districts.common_names::jsonb) AS common_name WHERE LOWER(common_name) LIKE LOWER(:q_like)")
                ).params(q_like=q_like)
            )
        )
        .order_by(District.sort_order, District.name)
        .limit(limit)
        .all()
    )

    # Postal codes (match beginning or contains for convenience)
    postal_query = (
        db.query(PostalCode, City, County)
        .join(City, PostalCode.city_id == City.id)
        .join(County, City.county_id == County.id)
        .filter(PostalCode.is_active == True)  # noqa: E712
    )
    if q_is_numeric:
        postal_query = postal_query.filter(PostalCode.code.ilike(f"{q}%"))
    else:
        postal_query = postal_query.filter(PostalCode.code.ilike(q_like))
    postal_rows = (
        postal_query.order_by(PostalCode.sort_order, PostalCode.code).limit(limit).all()
    )

    results = []

    for city, county in city_rows:
        name_norm = _normalize(city.name)  # type: ignore
        base = _base_match_score(q_norm, name_norm)
        score = int(base * _type_weight("city"))
        if getattr(city, "is_capital", False):  # type: ignore
            score += 5
        results.append({
            "id": str(city.id),
            "type": "city",
            "name": city.name,  # type: ignore
            "county_name": county.name,  # type: ignore
            "city_name": city.name,  # type: ignore
            "postal_code": None,
            "district_code": None,
            "score": score
        })

    for district, city, county in district_rows:
        name_norm = _normalize(district.name)  # type: ignore
        base = _base_match_score(q_norm, name_norm)
        score = int(base * _type_weight("district"))
        results.append({
            "id": str(district.id),
            "type": "district",
            "name": district.name,  # type: ignore
            "county_name": county.name,  # type: ignore
            "city_name": city.name,  # type: ignore
            "postal_code": None,
            "district_code": district.code,  # type: ignore
            "score": score
        })

    for pc, city, county in postal_rows:
        # For postal code, ranking favors startswith
        code = pc.code  # type: ignore
        if code.startswith(q):
            base = 95
        elif q in code:
            base = 70
        else:
            base = 0
        score = int(base * _type_weight("postal_code"))
        results.append({
            "id": str(pc.id),
            "type": "postal_code",
            "name": code,
            "county_name": county.name,  # type: ignore
            "city_name": city.name,  # type: ignore
            "postal_code": code,
            "district_code": None,
            "score": score
        })

    # Sort by score desc, then by name asc
    results.sort(key=lambda r: (-r["score"], r["name"]))

    return results[:limit]


@router.post("/normalize", response_model=GeoNormalizeResponse)
async def geo_normalize(payload: GeoNormalizeRequest, db: Session = Depends(get_db)):
    """
    Resolve a user-provided place to a canonical entity.
    Strategy (simple, deterministic):
    - If place_id + type provided, fetch by type/id.
    - Else if query provided:
      - Exact postal code match (prefix not allowed).
      - Exact district name match (normalized), then city.
      - Exact city name match (normalized).
    Returns 422 if no unique match.
    """
    # Resolve by explicit id+type
    if payload.place_id and payload.type:
        pid = payload.place_id
        if payload.type == "postal_code":
            pc = db.query(PostalCode, City).join(City, PostalCode.city_id == City.id).filter(PostalCode.id == pid).first()
            if not pc:
                raise_fastapi_422()
            pc_row, city = pc  # type: ignore
            return GeoNormalizeResponse(
                place_id=str(pc_row.id),
                type="postal_code",
                name=pc_row.code,  # type: ignore
                city_id=str(city.id),
                district_id=str(pc_row.district_id) if pc_row.district_id else None,
                postal_code=pc_row.code,  # type: ignore
                lat=None,
                lon=None
            )
        if payload.type == "district":
            row = db.query(District, City).join(City, District.city_id == City.id).filter(District.id == pid).first()
            if not row:
                raise_fastapi_422()
            district, city = row  # type: ignore
            return GeoNormalizeResponse(
                place_id=str(district.id),
                type="district",
                name=district.name,  # type: ignore
                city_id=str(city.id),
                district_id=str(district.id),
                postal_code=None,
                lat=None,
                lon=None
            )
        if payload.type == "city":
            city_row = db.query(City).filter(City.id == pid).first()
            if not city_row:
                raise_fastapi_422()
            return GeoNormalizeResponse(
                place_id=str(city_row.id),  # type: ignore
                type="city",
                name=city_row.name,  # type: ignore
                city_id=str(city_row.id),  # type: ignore
                district_id=None,
                postal_code=None,
                lat=None,
                lon=None
            )
        raise_fastapi_422()

    # Resolve by query
    q = (payload.query or "").strip()
    if not q:
        raise_fastapi_422()
    q_norm = _normalize(q)

    # Postal code exact
    if q.isdigit():
        pc = db.query(PostalCode, City).join(City, PostalCode.city_id == City.id).filter(PostalCode.code == q).first()
        if pc:
            pc_row, city = pc
            return GeoNormalizeResponse(
                place_id=str(pc_row.id),
                type="postal_code",
                name=pc_row.code,  # type: ignore
                city_id=str(city.id),
                district_id=str(pc_row.district_id) if pc_row.district_id else None,
                postal_code=pc_row.code,  # type: ignore
                lat=None,
                lon=None
            )

    # District exact - allow exact match on name or common_names (case-insensitive)
    district = (
        db.query(District, City)
        .join(City, District.city_id == City.id)
        .filter(
            or_(
                func.lower(District.name) == func.lower(q),
                func.exists(
                    text("SELECT 1 FROM jsonb_array_elements_text(districts.common_names::jsonb) AS common_name WHERE LOWER(common_name) = LOWER(:q)")
                ).params(q=q)
            )
        )
        .first()
    )
    if district:
        d, city = district
        return GeoNormalizeResponse(
            place_id=str(d.id),
            type="district",
            name=d.name,  # type: ignore
            city_id=str(city.id),
            district_id=str(d.id),
            postal_code=None,
            lat=None,
            lon=None
        )

    # City exact (normalized)
    city = (
        db.query(City)
        .filter(func.lower(func.unaccent(City.name)) == q_norm)
        .first()
    )
    if city:
        return GeoNormalizeResponse(
            place_id=str(city.id),
            type="city",
            name=city.name,  # type: ignore
            city_id=str(city.id),
            district_id=None,
            postal_code=None,
            lat=None,
            lon=None
        )

    # No unique resolution
    raise_fastapi_422()


def raise_fastapi_422():
    from fastapi import HTTPException
    raise HTTPException(status_code=422, detail="Unable to normalize place")
