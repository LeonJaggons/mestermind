from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    PROJECT_NAME: str = "FastAPI SQLite App"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    # For local dev: sqlite:///./app.db
    # For Cloud SQL: postgresql+psycopg2://user:password@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE
    # For Cloud SQL with Unix socket: postgresql+psycopg2://user:password@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE
    # For Cloud SQL with TCP: postgresql+psycopg2://user:password@HOST:5432/dbname
    DATABASE_URL: str = "sqlite:///./app.db"
    
    # Database pool settings (for PostgreSQL)
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600
    DB_POOL_PRE_PING: bool = True  # Enable connection health checks
    
    # Stripe
    STRIPE_SECRET_KEY: str = ""  # Set via environment variable
    STRIPE_PUBLISHABLE_KEY: str = ""  # Set via environment variable (public key for frontend)
    STRIPE_WEBHOOK_SECRET: str = ""  # Will be set after creating webhook in Stripe dashboard
    
    # Frontend URL (for redirects, emails, etc.)
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Email Configuration
    SITE_URL: str = "https://mestermind.com"  # Frontend URL for email links
    POSTMARK_API_KEY: str = ""  # Postmark server token
    POSTMARK_FROM_EMAIL: str = "noreply@mestermind.com"  # Default sender
    
    # CORS Configuration
    CORS_ORIGINS: str = "http://localhost:3000,https://www.mestermind.com,https://mestermind.com"
    
    class Config:
        case_sensitive = True
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
