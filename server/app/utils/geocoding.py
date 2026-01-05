"""
Geocoding service for converting addresses to coordinates and implementing location privacy.

This module handles:
1. Geocoding addresses to exact latitude/longitude coordinates
2. Location obfuscation for privacy protection (until appointment confirmation)
"""

import httpx
import random
from typing import Optional, Tuple
from sqlalchemy.orm import Session


async def geocode_address(city: str, district: Optional[str] = None, street: Optional[str] = None) -> Optional[Tuple[float, float]]:
    """
    Convert an address to latitude/longitude coordinates using Nominatim (OpenStreetMap).
    
    Args:
        city: City name (required)
        district: District/neighborhood name (optional)
        street: Street address (optional)
    
    Returns:
        Tuple of (latitude, longitude) or None if geocoding fails
    
    Note:
        Uses Nominatim API with rate limiting (1 request per second recommended).
        For production, consider using a paid service like Google Maps Geocoding API.
    """
    if not city:
        return None
    
    # Build address string from most specific to least specific
    address_parts = []
    if street:
        address_parts.append(street)
    if district:
        address_parts.append(district)
    address_parts.append(city)
    
    address_query = ", ".join(address_parts)
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": address_query,
                    "format": "json",
                    "limit": 1,
                    "addressdetails": 1
                },
                headers={
                    "User-Agent": "MesterMind-Job-Platform/1.0"  # Required by Nominatim
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                results = response.json()
                if results and len(results) > 0:
                    lat = float(results[0]["lat"])
                    lon = float(results[0]["lon"])
                    return (lat, lon)
            
            return None
            
    except Exception as e:
        print(f"Geocoding error for '{address_query}': {e}")
        return None


def obfuscate_location(exact_lat: float, exact_lon: float, radius_meters: float = 500) -> Tuple[float, float]:
    """
    Obfuscate exact location by adding random offset within a radius.
    
    This protects user privacy by showing an approximate area instead of exact address
    until the appointment is confirmed.
    
    Args:
        exact_lat: Exact latitude
        exact_lon: Exact longitude
        radius_meters: Radius in meters for obfuscation (default: 500m ~ 0.3 miles)
    
    Returns:
        Tuple of (obfuscated_latitude, obfuscated_longitude)
    
    Note:
        Uses uniform distribution within a circle to avoid bias toward center.
        At 500m radius, the obfuscated point will be anywhere within ~0.3 miles.
    """
    # Convert radius from meters to degrees (approximate)
    # 1 degree latitude ≈ 111,320 meters
    # 1 degree longitude ≈ 111,320 * cos(latitude) meters
    
    import math
    
    # Random angle and distance for uniform distribution in circle
    angle = random.uniform(0, 2 * math.pi)
    # Use sqrt for uniform distribution (not clustered at center)
    distance_ratio = math.sqrt(random.uniform(0, 1))
    distance = radius_meters * distance_ratio
    
    # Convert distance to degrees
    lat_offset = (distance / 111320) * math.cos(angle)
    lon_offset = (distance / (111320 * math.cos(math.radians(exact_lat)))) * math.sin(angle)
    
    obfuscated_lat = exact_lat + lat_offset
    obfuscated_lon = exact_lon + lon_offset
    
    return (obfuscated_lat, obfuscated_lon)


def get_job_display_location(
    job,
    has_confirmed_appointment: bool
) -> Optional[Tuple[float, float]]:
    """
    Get the appropriate location to display for a job based on appointment status.
    
    Args:
        job: Job model instance with exact_latitude and exact_longitude
        has_confirmed_appointment: Whether the job has a confirmed appointment
    
    Returns:
        Tuple of (latitude, longitude) to display, or None if no location available
        - If appointment confirmed: returns exact location
        - If not confirmed: returns obfuscated location for privacy
    """
    if not job.exact_latitude or not job.exact_longitude:
        return None
    
    if has_confirmed_appointment:
        # Show exact location for confirmed appointments
        return (float(job.exact_latitude), float(job.exact_longitude))
    else:
        # Show obfuscated location to protect privacy
        return obfuscate_location(
            float(job.exact_latitude),
            float(job.exact_longitude),
            radius_meters=500  # ~0.3 miles radius
        )
