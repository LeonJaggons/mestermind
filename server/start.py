#!/usr/bin/env python
"""
Production-ready start script for FastAPI application
"""
import os
import sys

# Add the server directory to Python path
server_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, server_dir)
os.chdir(server_dir)

if __name__ == "__main__":
    import uvicorn
    
    # Get configuration from environment or use defaults
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    # Use single worker for Cloud Run - Cloud Run handles scaling
    workers = int(os.getenv("WORKERS", "1"))
    reload = os.getenv("RELOAD", "false").lower() == "true"
    
    print(f"Starting FastAPI server on {host}:{port}")
    print(f"Workers: {workers}")
    print(f"Reload: {reload}")
    
    # For Cloud Run, always use single worker (no workers parameter)
    # Cloud Run manages scaling at container level
    if workers == 1 or os.getenv("K_SERVICE"):  # K_SERVICE is Cloud Run indicator
        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            log_level="info",
            timeout_keep_alive=30,
        )
    else:
        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            workers=workers,
            log_level="info",
        )
