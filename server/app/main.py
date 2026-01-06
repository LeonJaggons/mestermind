from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import RedirectResponse
from contextlib import asynccontextmanager
from pathlib import Path
from app.core.config import get_settings
from app.db.session import engine, Base
from app.api import users, categories, services, cities, pro_profiles, pro_services, jobs, search, invitations, reviews, projects, messages, lead_pricing, lead_purchases, stripe_payments, appointments, subscriptions, opportunities, faqs, profile_views, archived_conversations, starred_conversations

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create database tables
    Base.metadata.create_all(bind=engine)
    
    # Load pricing configuration
    pricing_config_path = Path(__file__).parent.parent / "pricing_config.json"
    try:
        lead_pricing.initialize_pricing_config(str(pricing_config_path))
        print(f"✓ Pricing configuration loaded from {pricing_config_path}")
    except Exception as e:
        print(f"⚠ Warning: Failed to load pricing config: {e}")
    
    yield
    # Shutdown: Clean up resources if needed
    engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)


# Middleware to force HTTPS redirects
class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # If this is a redirect response, ensure it uses HTTPS
        if isinstance(response, RedirectResponse) and 300 <= response.status_code < 400:
            location = response.headers.get("location", "")
            # Check if we have X-Forwarded-Proto header indicating HTTPS from proxy
            forwarded_proto = request.headers.get("x-forwarded-proto", "")
            
            if forwarded_proto == "https" and location.startswith("http://"):
                # Convert HTTP redirect to HTTPS
                response.headers["location"] = location.replace("http://", "https://", 1)
        
        return response


# Add HTTPS redirect middleware first
app.add_middleware(HTTPSRedirectMiddleware)

# CORS middleware
# Split the comma-separated origins string into a list
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.VERSION}


# Include routers
app.include_router(
    users.router,
    prefix=f"{settings.API_V1_STR}/users",
    tags=["users"]
)

app.include_router(
    categories.router,
    prefix=f"{settings.API_V1_STR}/categories",
    tags=["categories"]
)

app.include_router(
    services.router,
    prefix=f"{settings.API_V1_STR}/services",
    tags=["services"]
)

app.include_router(
    cities.router,
    prefix=f"{settings.API_V1_STR}/cities",
    tags=["cities"]
)

app.include_router(
    pro_profiles.router,
    prefix=f"{settings.API_V1_STR}/pro-profiles",
    tags=["pro-profiles"]
)

app.include_router(
    pro_services.router,
    prefix=f"{settings.API_V1_STR}/pro-services",
    tags=["pro-services"]
)

app.include_router(
    jobs.router,
    prefix=f"{settings.API_V1_STR}/jobs",
    tags=["jobs"]
)

app.include_router(
    search.router,
    prefix=f"{settings.API_V1_STR}/search",
    tags=["search"]
)

app.include_router(
    invitations.router,
    prefix=f"{settings.API_V1_STR}/invitations",
    tags=["invitations"]
)

app.include_router(
    reviews.router,
    prefix=f"{settings.API_V1_STR}/reviews",
    tags=["reviews"]
)

app.include_router(
    projects.router,
    prefix=f"{settings.API_V1_STR}/projects",
    tags=["projects"]
)

app.include_router(
    messages.router,
    prefix=f"{settings.API_V1_STR}/messages",
    tags=["messages"]
)

app.include_router(
    lead_pricing.router,
    prefix=f"{settings.API_V1_STR}",
    tags=["lead-pricing"]
)

app.include_router(
    lead_purchases.router,
    prefix=f"{settings.API_V1_STR}/lead-purchases",
    tags=["lead-purchases"]
)

app.include_router(
    stripe_payments.router,
    prefix=f"{settings.API_V1_STR}/stripe",
    tags=["stripe-payments"]
)

app.include_router(
    appointments.router,
    prefix=f"{settings.API_V1_STR}/appointments",
    tags=["appointments"]
)

app.include_router(
    subscriptions.router,
    prefix=f"{settings.API_V1_STR}/subscriptions",
    tags=["subscriptions"]
)

app.include_router(
    opportunities.router,
    prefix=f"{settings.API_V1_STR}/opportunities",
    tags=["opportunities"]
)

app.include_router(
    faqs.router,
    prefix=f"{settings.API_V1_STR}/faqs",
    tags=["faqs"]
)

app.include_router(
    profile_views.router,
    prefix=f"{settings.API_V1_STR}/profile-views",
    tags=["profile-views"]
)

app.include_router(
    archived_conversations.router,
    prefix=f"{settings.API_V1_STR}/archived-conversations",
    tags=["archived-conversations"]
)

app.include_router(
    starred_conversations.router,
    prefix=f"{settings.API_V1_STR}/starred-conversations",
    tags=["starred-conversations"]
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Disable in production
    )
