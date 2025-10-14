"""
Main entry point for Mestermind API
"""

from dotenv import load_dotenv
import uvicorn
from app import app

# Load environment variables from .env file
load_dotenv()

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )