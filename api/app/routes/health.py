"""
Health check routes
"""

from fastapi import APIRouter
from app.models.schemas import HealthResponse
from app.core.database import get_database_health

router = APIRouter()


@router.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint with health check"""
    return HealthResponse(
        status="healthy",
        message="Mestermind API is running successfully"
    )


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        message="API is operational"
    )


@router.get("/health/database")
async def database_health():
    """Database health check endpoint"""
    return get_database_health()
