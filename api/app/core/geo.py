"""
Lightweight geospatial helpers for Mestermind.

Includes:
- Haversine distance (meters / kilometers)
- Bounding box helper for quick pre-filtering
- SQLAlchemy expression helpers for Haversine in SQL (no PostGIS required)

If PostGIS is available, prefer ST_DistanceSphere. We include a helper
to use it when you pass `use_postgis=True` and the extension is installed.
"""

from math import radians, sin, cos, asin, sqrt
from typing import Tuple

from sqlalchemy.sql import func, literal


# ---- Pure Python helpers ----

EARTH_RADIUS_M = 6371008.8  # meters (mean Earth radius)


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute Haversine distance in meters between two WGS84 coordinates.
    Inputs and outputs are floats; caller validates ranges.
    """
    lat1_r, lon1_r, lat2_r, lon2_r = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2_r - lat1_r
    dlon = lon2_r - lon1_r
    a = sin(dlat / 2) ** 2 + cos(lat1_r) * cos(lat2_r) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))
    return EARTH_RADIUS_M * c


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute Haversine distance in kilometers."""
    return haversine_distance_meters(lat1, lon1, lat2, lon2) / 1000.0


def bounding_box(lat: float, lon: float, radius_km: float) -> Tuple[float, float, float, float]:
    """Approximate bounding box around point for radius_km.
    Returns (min_lat, min_lon, max_lat, max_lon). Good for coarse prefilter.
    """
    # 1 deg latitude ~ 111.32 km; longitude scales with cos(lat)
    lat_delta = radius_km / 111.32
    lon_delta = radius_km / (111.32 * max(0.000001, cos(radians(lat))))
    return lat - lat_delta, lon - lon_delta, lat + lat_delta, lon + lon_delta


# ---- SQLAlchemy expression helpers ----

def haversine_sql_expr(lat_col, lon_col, lat_param: float, lon_param: float):
    """Return a SQLAlchemy expression computing Haversine distance (meters) between
    row columns (lat_col, lon_col) and a given point (lat_param, lon_param).
    Works on PostgreSQL without PostGIS, using SQL functions.
    """
    # Convert deg -> rad in SQL and compute
    lat1 = func.radians(lat_col)
    lon1 = func.radians(lon_col)
    lat2 = func.radians(literal(lat_param))
    lon2 = func.radians(literal(lon_param))

    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = func.pow(func.sin(dlat / 2.0), 2) + func.cos(lat1) * func.cos(lat2) * func.pow(func.sin(dlon / 2.0), 2)
    c = 2.0 * func.asin(func.sqrt(a))
    return literal(EARTH_RADIUS_M) * c


def st_distance_sphere_expr(geom_point_col, lat_param: float, lon_param: float):
    """If PostGIS is available and you store geography/geometry points,
    this returns ST_DistanceSphere between row point and given lat/lon.
    Expects `geom_point_col` to be a geography/geometry point in SRID 4326.
    """
    return func.ST_DistanceSphere(
        geom_point_col,
        func.ST_SetSRID(func.ST_MakePoint(lon_param, lat_param), 4326)
    )


