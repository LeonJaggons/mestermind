from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    PROJECT_NAME: str = "FastAPI SQLite App"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "sqlite:///./app.db"
    
    # SQLite optimizations for production
    SQLITE_POOL_SIZE: int = 20
    SQLITE_MAX_OVERFLOW: int = 0
    SQLITE_POOL_TIMEOUT: int = 30
    SQLITE_POOL_RECYCLE: int = 3600
    
    # Stripe
    STRIPE_SECRET_KEY: str = ""  # Set via environment variable
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
