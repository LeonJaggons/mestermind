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
]
