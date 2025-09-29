#!/usr/bin/env python3
"""
Seed Hungary location data (counties, cities, districts, postal codes) from JSON.

Usage:
  python api/scripts/seed_hungary_locations.py [--file api/data/hungary_location_seed_data.json]
"""

import os
import sys
import json
import argparse
import logging
from typing import Any, Dict, List, Optional, Tuple
import uuid

from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SessionLocal = None  # initialized in main after importing engine


def load_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def upsert_counties(db, counties: List[Dict[str, Any]]):
    created = skipped = 0
    for item in counties:
        from app.models.database import County  # local import for linter compatibility
        raw_id = item.get("id")
        county_id = uuid.UUID(raw_id) if raw_id else None
        county = db.get(County, county_id)
        if county:
            skipped += 1
            continue
        county = County(
            id=county_id or uuid.uuid4(),
            name=item["name"],
            code=item.get("code"),
            is_active=item.get("is_active", True),
            sort_order=item.get("sort_order", 0),
        )
        db.add(county)
        created += 1
    db.commit()
    logger.info("Counties: created=%s, skipped=%s", created, skipped)


FALLBACK_CITY_COORDS: Dict[str, Tuple[float, float]] = {
    # name -> (lat, lon)
    "Budapest": (47.4979, 19.0402),
    "Debrecen": (47.5316, 21.6273),
    "Szeged": (46.2530, 20.1414),
    "Miskolc": (48.1030, 20.7784),
    "Pécs": (46.0727, 18.2323),
    "Győr": (47.6875, 17.6504),
    "Nyíregyháza": (47.9554, 21.7167),
    "Kecskemét": (46.9062, 19.6913),
    "Székesfehérvár": (47.1860, 18.4221),
    "Szombathely": (47.2307, 16.6218),
    "Szolnok": (47.1720, 20.1807),
    "Tatabánya": (47.5868, 18.3933),
    "Salgótarján": (48.1046, 19.7895),
    "Kaposvár": (46.3590, 17.7968),
    "Békéscsaba": (46.6736, 21.0878),
    "Zalaegerszeg": (46.8417, 16.8439),
    "Veszprém": (47.0933, 17.9115),
    "Érd": (47.3917, 18.9136),
    "Sopron": (47.6817, 16.5845),
    "Dunaújváros": (46.9642, 18.9396),
    "Hódmezővásárhely": (46.4181, 20.3309),
    "Nagykanizsa": (46.4540, 16.9890),
    "Szekszárd": (46.3476, 18.7060),
    "Eger": (47.9025, 20.3772),
}


def upsert_cities(db, cities: List[Dict[str, Any]]):
    created = skipped = 0
    for item in cities:
        from app.models.database import City  # local import for linter compatibility
        raw_id = item.get("id")
        city_id = uuid.UUID(raw_id) if raw_id else None
        city = db.get(City, city_id)
        if city:
            # Update lat/lon if missing and we have values either in JSON or fallback
            json_lat: Optional[float] = item.get("lat")
            json_lon: Optional[float] = item.get("lon")
            if (getattr(city, "lat", None) is None or getattr(city, "lon", None) is None):
                if json_lat is not None and json_lon is not None:
                    city.lat = json_lat
                    city.lon = json_lon
                else:
                    coords = FALLBACK_CITY_COORDS.get(item["name"])  # type: ignore[index]
                    if coords:
                        city.lat, city.lon = coords
            skipped += 1
            continue
        city = City(
            id=city_id or uuid.uuid4(),
            county_id=uuid.UUID(item["county_id"]),
            name=item["name"],
            is_capital=item.get("is_capital", False),
            is_active=item.get("is_active", True),
            sort_order=item.get("sort_order", 0),
            lat=item.get("lat") if item.get("lat") is not None else (FALLBACK_CITY_COORDS.get(item["name"], (None, None))[0] if item.get("name") in FALLBACK_CITY_COORDS else None),
            lon=item.get("lon") if item.get("lon") is not None else (FALLBACK_CITY_COORDS.get(item["name"], (None, None))[1] if item.get("name") in FALLBACK_CITY_COORDS else None),
        )
        db.add(city)
        created += 1
    db.commit()
    logger.info("Cities: created=%s, skipped=%s", created, skipped)


def upsert_districts(db, districts: List[Dict[str, Any]]):
    created = skipped = 0
    for item in districts:
        from app.models.database import District  # local import for linter compatibility
        raw_id = item.get("id")
        district_id = uuid.UUID(raw_id) if raw_id else None
        district = db.get(District, district_id)
        if district:
            # Update common_names if provided
            if item.get("common_names") is not None:
                district.common_names = item.get("common_names")
            skipped += 1
            continue
        district = District(
            id=district_id or uuid.uuid4(),
            city_id=uuid.UUID(item["city_id"]),
            name=item["name"],
            code=item.get("code"),
            number=item.get("number"),
            common_names=item.get("common_names"),
            is_active=item.get("is_active", True),
            sort_order=item.get("sort_order", 0),
        )
        db.add(district)
        created += 1
    db.commit()
    logger.info("Districts: created=%s, skipped=%s", created, skipped)


def upsert_postal_codes(db, postal_codes: List[Dict[str, Any]]):
    created = skipped = 0
    for item in postal_codes:
        from app.models.database import PostalCode  # local import for linter compatibility
        raw_id = item.get("id")
        postal_id = uuid.UUID(raw_id) if raw_id else None
        postal_code = db.get(PostalCode, postal_id)
        if postal_code:
            skipped += 1
            continue
        postal_code = PostalCode(
            id=postal_id or uuid.uuid4(),
            city_id=uuid.UUID(item["city_id"]),
            district_id=uuid.UUID(item["district_id"]) if item.get("district_id") else None,
            code=item["code"],
            is_po_box=item.get("is_po_box", False),
            is_active=item.get("is_active", True),
            sort_order=item.get("sort_order", 0),
        )
        db.add(postal_code)
        created += 1
    db.commit()
    logger.info("Postal codes: created=%s, skipped=%s", created, skipped)


def main():
    parser = argparse.ArgumentParser(description="Seed Hungary location data from JSON")
    default_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "hungary_location_seed_data.json")
    parser.add_argument("--file", "-f", default=default_path, help="Path to the JSON seed file")
    args = parser.parse_args()

    # Ensure we can import from app by injecting repo root into sys.path
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)

    # Import DB after sys.path fix
    from app.core.database import engine, create_tables

    global SessionLocal
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    data = load_json(args.file)
    db = SessionLocal()
    try:
        logger.info("Ensuring tables exist via create_tables()")
        create_tables()
        logger.info("Seeding from %s", args.file)
        upsert_counties(db, data.get("counties", []))
        upsert_cities(db, data.get("cities", []))
        upsert_districts(db, data.get("districts", []))
        upsert_postal_codes(db, data.get("postal_codes", []))
        logger.info("✅ Hungary locations seeded successfully")
    except IntegrityError as e:
        db.rollback()
        logger.error("Integrity error during seeding: %s", e)
        raise
    except Exception as e:
        db.rollback()
        logger.error("Unexpected error during seeding: %s", e)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()


