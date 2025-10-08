"""
Geo search routes for Mestermind API
"""

import unicodedata

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy import or_, text

from app.core.database import get_db
from app.models import City, County, District, PostalCode, GeoNormalizeRequest, GeoNormalizeResponse


router = APIRouter(prefix="/v1/geo", tags=["geo"])


def _normalize(input_text: str) -> str:
    """Lowercase and strip diacritics for simple matching."""
    if input_text is None:
        return ""
    text_lower = input_text.lower()
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
    if result_type == "district":
        return 0.9
    return 0.8  # city


@router.get("/search")
async def geo_search(
    q: str = Query(..., min_length=1, description="Free-text query for city or district; Budapest ZIP infers district"),
    limit: int = Query(10, ge=1, le=50, description="Max number of results")
    , db: Session = Depends(get_db)
):
    """
    Typeahead over cities and districts (Budapest).
    If the query is a 4-digit Budapest postal code (1XYZ), infer the district (XY) and return that as the top suggestion.
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

    # If Budapest postal code (1XYZ), infer district: XY -> 01..23
    inferred_district = None
    if q_is_numeric and len(q.strip()) == 4 and q.strip()[0] == "1":
        try:
            district_num = int(q.strip()[1:3])
            if 1 <= district_num <= 23:
                # Find Budapest city and the district with matching number
                budapest = db.query(City, County).join(County, City.county_id == County.id).filter(func.lower(City.name) == "budapest").first()
                if budapest:
                    bud_city, bud_county = budapest  # type: ignore
                    d_row = (
                        db.query(District)
                        .filter(District.city_id == bud_city.id)
                        .filter(District.is_active == True)  # noqa: E712
                        .filter(District.number == district_num)
                        .first()
                    )
                    if d_row:
                        inferred_district = (d_row, bud_city, bud_county)
        except ValueError:
            inferred_district = None

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

    if inferred_district:
        d, city, county = inferred_district
        # Prefer inferred district at top with high score
        results.append({
            "id": str(d.id),
            "type": "district",
            "name": d.name,  # type: ignore
            "county_name": county.name,  # type: ignore
            "city_name": city.name,  # type: ignore
            "postal_code": None,
            "district_code": d.code,  # type: ignore
            "score": 100
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
    # Resolve by explicit id+type (postal codes not supported)
    if payload.place_id and payload.type:
        pid = payload.place_id
        if payload.type == "postal_code":
            raise_fastapi_422()
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
                lat=getattr(city_row, "lat", None),
                lon=getattr(city_row, "lon", None)
            )
        raise_fastapi_422()

    # Resolve by query
    q = (payload.query or "").strip()
    if not q:
        raise_fastapi_422()
    q_norm = _normalize(q)

    # If Budapest postal code exact, normalize to the district
    if q.isdigit() and len(q) == 4 and q[0] == "1":
        try:
            district_num = int(q[1:3])
            if 1 <= district_num <= 23:
                budapest = db.query(City).filter(func.lower(City.name) == "budapest").first()
                if budapest:
                    d_row = (
                        db.query(District)
                        .filter(District.city_id == budapest.id)
                        .filter(District.is_active == True)  # noqa: E712
                        .filter(District.number == district_num)
                        .first()
                    )
                    if d_row:
                        return GeoNormalizeResponse(
                            place_id=str(d_row.id),
                            type="district",
                            name=d_row.name,  # type: ignore
                            city_id=str(budapest.id),
                            district_id=str(d_row.id),
                            postal_code=None,
                            lat=None,
                            lon=None
                        )
        except ValueError:
            pass

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
            lat=getattr(city, "lat", None),
            lon=getattr(city, "lon", None)
        )

    # No unique resolution
    raise_fastapi_422()


@router.get("/coordinates/{postal_code}")
async def get_coordinates_by_postal_code(
    postal_code: str,
    db: Session = Depends(get_db)
):
    """
    Get coordinates for a postal code.
    For Budapest postal codes (1XYZ), returns district coordinates.
    For other postal codes, returns city coordinates.
    """
    # Clean the postal code
    postal_code = postal_code.strip()
    
    # If Budapest postal code (1XYZ), get district coordinates
    if postal_code.isdigit() and len(postal_code) == 4 and postal_code[0] == "1":
        try:
            district_num = int(postal_code[1:3])
            if 1 <= district_num <= 23:
                budapest = db.query(City).filter(func.lower(City.name) == "budapest").first()
                if budapest:
                    district = (
                        db.query(District)
                        .filter(District.city_id == budapest.id)
                        .filter(District.is_active == True)  # noqa: E712
                        .filter(District.number == district_num)
                        .first()
                    )
                    if district:
                        # For Budapest districts, use city coordinates as fallback
                        lat = budapest.lat
                        lon = budapest.lon
                        return {
                            "postal_code": postal_code,
                            "type": "district",
                            "name": district.name,
                            "city_name": budapest.name,
                            "lat": lat,
                            "lon": lon,
                            "source": "city_fallback"
                        }
        except ValueError:
            pass
    
    # For other postal codes, find the city
    postal_code_row = (
        db.query(PostalCode, City)
        .join(City, PostalCode.city_id == City.id)
        .filter(PostalCode.code == postal_code)
        .filter(PostalCode.is_active == True)  # noqa: E712
        .first()
    )
    
    if postal_code_row:
        _, city = postal_code_row
        return {
            "postal_code": postal_code,
            "type": "city",
            "name": city.name,
            "city_name": city.name,
            "lat": city.lat,
            "lon": city.lon,
            "source": "city_coordinates"
        }
    
    # If no exact match, try to find by city name (fallback)
    # This is a simple fallback - in production you might want to use a geocoding service
    return {
        "postal_code": postal_code,
        "type": "unknown",
        "name": "Unknown location",
        "city_name": "Unknown",
        "lat": 47.4979,  # Budapest coordinates as fallback
        "lon": 19.0402,
        "source": "fallback"
    }


def raise_fastapi_422():
    from fastapi import HTTPException
    raise HTTPException(status_code=422, detail="Unable to normalize place")
