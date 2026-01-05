# FastAPI SQLite Production Boilerplate

A production-ready FastAPI application with SQLite database optimized for parallel query handling.

## Features

- **FastAPI** framework with async support
- **SQLite** database with WAL mode for concurrent reads/writes
- **SQLAlchemy** ORM with connection pooling
- **Pydantic** v2 for data validation
- Production-optimized SQLite configuration
- RESTful API with CRUD operations
- Health check endpoint
- CORS middleware configured

## Project Structure

```
.
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── api/                 # API endpoints
│   │   ├── __init__.py
│   │   └── items.py         # Example CRUD endpoints
│   ├── core/                # Core configuration
│   │   ├── __init__.py
│   │   └── config.py        # Settings and configuration
│   ├── db/                  # Database configuration
│   │   ├── __init__.py
│   │   └── session.py       # Database session and engine
│   ├── models/              # SQLAlchemy models
│   │   ├── __init__.py
│   │   └── item.py          # Example model
│   └── schemas/             # Pydantic schemas
│       ├── __init__.py
│       └── item.py          # Example schemas
├── requirements.txt
├── .env.example
└── README.md
```

## SQLite Production Optimizations

This boilerplate includes several optimizations for SQLite in production:

1. **WAL Mode (Write-Ahead Logging)**: Enables concurrent reads during writes
2. **StaticPool**: Optimized connection pooling for SQLite
3. **Busy Timeout**: 30-second timeout to handle concurrent access
4. **Cache Size**: 64MB cache for better performance
5. **Synchronous=NORMAL**: Balanced durability and performance
6. **Foreign Keys**: Enabled for data integrity

## Installation

### Using Make (Recommended - from project root)
```bash
# Install both API and client dependencies
make install

# Or install just API dependencies (creates venv automatically)
make install-api
```

### Manual Installation
1. Create a virtual environment:
```bash
cd server
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

3. Copy environment variables:
```bash
cp .env.example .env
```

## Running the Application

### Using Make (Recommended - from project root)
```bash
# Start API server (uses venv automatically)
make api

# Start both API and client concurrently
make dev
```

### Using the shell script
```bash
# Auto-creates venv if needed and runs the server
cd server
./start.sh

# With environment variables
RELOAD=true HOST=0.0.0.0 PORT=8000 ./start.sh
```

### Using the Python script (with venv)
```bash
cd server
source venv/bin/activate  # Activate venv first

# Development mode with auto-reload
RELOAD=true python start.py

# Production mode with 4 workers
python start.py

# Custom configuration
HOST=0.0.0.0 PORT=8000 WORKERS=4 python start.py
```

### Direct execution
```bash
cd server
source venv/bin/activate

# Development mode
python app/main.py

# Production mode with Uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### Health Check
- `GET /health` - Returns application health status

### Items CRUD
- `POST /api/v1/items/` - Create a new item
- `GET /api/v1/items/` - List all items (with pagination)
- `GET /api/v1/items/{item_id}` - Get a specific item
- `PUT /api/v1/items/{item_id}` - Update an item
- `DELETE /api/v1/items/{item_id}` - Delete an item

## API Documentation

Once the application is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Example Usage

Create an item:
```bash
curl -X POST "http://localhost:8000/api/v1/items/" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Item", "description": "A test item", "is_active": true}'
```

Get all items:
```bash
curl "http://localhost:8000/api/v1/items/"
```

## Configuration

Environment variables can be set in `.env` file:

- `PROJECT_NAME`: Application name
- `VERSION`: API version
- `API_V1_STR`: API version prefix
- `DATABASE_URL`: SQLite database path
- `SQLITE_POOL_SIZE`: Connection pool size
- `SQLITE_POOL_TIMEOUT`: Connection timeout
- `SQLITE_POOL_RECYCLE`: Connection recycle time

## Production Deployment Tips

1. **Use multiple workers**: Run with 4+ workers for better concurrency
2. **WAL mode**: Already configured for concurrent read/write operations
3. **Monitor database size**: SQLite WAL files can grow; consider periodic checkpointing
4. **Backup strategy**: Implement regular database backups
5. **CORS**: Update CORS origins in production for security
6. **HTTPS**: Always use HTTPS in production
7. **Environment variables**: Use proper secrets management

## License

MIT
