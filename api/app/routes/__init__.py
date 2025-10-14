"""
Routes package for Mestermind API
"""

from .categories import router as categories_router
from .health import router as health_router
from .services import router as services_router
from .geo import router as geo_router
from .question_sets import router as question_sets_router
from .questions import router as questions_router
from .requests import router as requests_router
from .search import router as search_router
from .mesters import router as mesters_router
from .onboarding import router as onboarding_router
from .users import router as users_router
from .messages import router as messages_router
from .offers import router as offers_router
from .notifications import router as notifications_router
from .admin import router as admin_router
from .pricing import router as pricing_router
from .payments import router as payments_router
from .appointments import router as appointments_router
from .jobs import router as jobs_router
from .websocket import router as websocket_router

__all__ = [
    "categories_router",
    "health_router",
    "services_router",
    "question_sets_router",
    "questions_router",
    "geo_router",
    "requests_router",
    "search_router",
    "mesters_router",
    "onboarding_router",
    "users_router",
    "messages_router",
    "offers_router",
    "notifications_router",
    "admin_router",
    "pricing_router",
    "payments_router",
    "appointments_router",
    "jobs_router",
    "websocket_router",
]
