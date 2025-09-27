# Mestermind API

FastAPI backend for Mestermind - Budapest-based online marketplace connecting customers with trusted local service professionals.

## Features

- **FastAPI Framework**: Modern, fast web framework for building APIs with Python
- **PostgreSQL Database**: Dockerized PostgreSQL with SQLAlchemy ORM
- **Automatic Documentation**: Interactive API docs with Swagger UI and ReDoc
- **CORS Support**: Configured for Next.js frontend integration
- **Pydantic Models**: Type-safe data validation and serialization
- **Database Migrations**: Alembic for database schema management
- **Health Checks**: Built-in health monitoring endpoints
- **Redis Cache**: Optional Redis for caching and sessions

## Quick Start

### 1. Quick Start (Recommended)

Start everything with one command:

```bash
./start.sh
```

This will:
- Start PostgreSQL and Redis containers
- Set up the virtual environment
- Install dependencies
- Initialize the database
- Start the FastAPI server

### 2. Manual Setup

#### Setup Virtual Environment

```bash
./setup_venv.sh
```

#### Start Database

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Wait for database to be ready
sleep 10
```

#### Initialize Database

```bash
# Activate virtual environment
source venv/bin/activate

# Initialize database tables and seed data
python scripts/init_db.py
```

#### Start API Server

```bash
python main.py
```

#### Troubleshooting Installation Issues

If you encounter build errors, try these solutions:

1. **Use Python 3.11 or 3.12** (recommended for best compatibility):
   ```bash
   # Install pyenv to manage Python versions
   brew install pyenv
   pyenv install 3.11.7
   pyenv local 3.11.7
   ```

2. **Install packages individually**:
   ```bash
   pip install fastapi uvicorn pydantic python-dotenv httpx
   ```

## Access Points

Once running, the API will be available at:
- **API**: http://localhost:8000
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Database Health**: http://localhost:8000/health/database
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## API Endpoints

### Health & Status
- `GET /` - Root endpoint with health check
- `GET /health` - Health check endpoint
- `GET /health/database` - Database health check

### Categories
- `GET /categories` - Get all categories with subcategory count
- `GET /categories/{category_id}` - Get specific category with subcategories
- `POST /categories` - Create new category
- `PUT /categories/{category_id}` - Update category
- `DELETE /categories/{category_id}` - Delete category (soft delete)

### Subcategories
- `POST /categories/{category_id}/subcategories` - Create new subcategory
- `PUT /categories/subcategories/{subcategory_id}` - Update subcategory
- `DELETE /categories/subcategories/{subcategory_id}` - Delete subcategory (soft delete)

## Project Structure

```
api/
├── main.py                  # FastAPI application entry point
├── app/                     # Main application package
│   ├── __init__.py         # FastAPI app configuration
│   ├── core/               # Core functionality
│   │   ├── __init__.py
│   │   └── database.py     # Database configuration
│   ├── models/             # Data models
│   │   ├── __init__.py
│   │   ├── database.py     # SQLAlchemy models
│   │   └── schemas.py      # Pydantic schemas
│   └── routes/             # API routes
│       ├── __init__.py
│       ├── health.py       # Health check routes
│       └── categories.py    # Category/subcategory routes
├── config/                 # Configuration files
│   ├── alembic.ini         # Alembic migration config
│   └── env.example         # Environment variables template
├── scripts/                # Utility scripts
│   ├── init_db.py          # Database initialization
│   └── init-db.sql         # Database initialization SQL
├── migrations/             # Database migration files
├── requirements.txt         # Python dependencies
├── docker-compose.yml       # Docker services (PostgreSQL, Redis)
├── setup_venv.sh           # Virtual environment setup script
├── start.sh                # Complete startup script
├── README.md               # This file
└── venv/                   # Virtual environment (created after setup)
```

## Development

### Adding New Dependencies

1. Add the package to `requirements.txt`
2. Install in your virtual environment:
   ```bash
   source venv/bin/activate
   pip install -r requirements.txt
   ```

### Environment Variables

Create a `.env` file in the api directory for environment-specific configuration:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost/mestermind

# Security
SECRET_KEY=your-secret-key-here

# External APIs
EXTERNAL_API_KEY=your-api-key
```

## Technology Stack

- **FastAPI**: Web framework
- **Uvicorn**: ASGI server
- **PostgreSQL**: Primary database
- **SQLAlchemy**: ORM and database toolkit
- **Alembic**: Database migrations
- **Redis**: Caching and sessions
- **Docker**: Containerization
- **Pydantic**: Data validation
- **Python 3.8+**: Programming language

## Next Steps

1. **Authentication**: Implement JWT-based authentication
2. **File Upload**: Add support for image/document uploads
3. **Testing**: Add comprehensive test suite
4. **Deployment**: Configure for production deployment
5. **API Rate Limiting**: Implement rate limiting with Redis
6. **Email Notifications**: Add email service for notifications

## Contributing

1. Activate the virtual environment
2. Make your changes
3. Test your changes locally
4. Submit a pull request

## Support

For questions or issues, please contact the development team.
