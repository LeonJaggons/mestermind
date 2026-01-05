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
    workers = int(os.getenv("WORKERS", "4"))
    reload = os.getenv("RELOAD", "false").lower() == "true"
    
    print(f"Starting FastAPI server on {host}:{port}")
    print(f"Workers: {workers}")
    print(f"Reload: {reload}")
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        workers=workers if not reload else 1,  # Multiple workers not supported with reload
        reload=reload,
        log_level="info",
    )
