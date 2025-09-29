"""
Mestermind API Application
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import create_tables
from app.routes import categories_router, health_router, services_router, question_sets_router, questions_router


@asynccontextmanager
async def lifespan(_fastapi_app: FastAPI):
    """Manage application lifespan events"""
    # Startup
    try:
        create_tables()
        print("✅ Database tables initialized")
    except Exception as e:  # noqa: BLE001
        print(f"❌ Database initialization failed: {e}")
    
    yield
    
    # Shutdown (if needed in the future)
    # Add any cleanup code here


# Create FastAPI instance
app = FastAPI(
    title="Mestermind API",
    description="API for Mestermind - Budapest-based online marketplace connecting customers with local service professionals",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS - Allow any localhost URL for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,  # Set to False when using wildcard origins
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(categories_router)
app.include_router(services_router)
app.include_router(question_sets_router)
app.include_router(questions_router)
