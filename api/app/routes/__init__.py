"""
Routes package for Mestermind API
"""

from .categories import router as categories_router
from .health import router as health_router
from .services import router as services_router

__all__ = ["categories_router", "health_router", "services_router"]
