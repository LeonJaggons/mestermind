# Mestermind

Full-stack application with FastAPI backend and Next.js frontend.

## Project Structure

```
.
├── server/          # FastAPI backend with SQLite
├── client/          # Next.js frontend
├── Makefile         # Build and run commands
└── README.md        # This file
```

## Quick Start

### 1. Install Dependencies

```bash
# Install both API and client dependencies
make install
```

This will:
- Create a Python virtual environment in `server/venv`
- Install Python dependencies
- Install Node.js dependencies

### 2. Run the Application

```bash
# Start both API and client concurrently
make dev
```

Or start them separately:

```bash
# Terminal 1 - Start API server
make api

# Terminal 2 - Start Next.js client
make client
```

## Available Commands

- `make help` - Show all available commands
- `make install` - Install all dependencies (API + client)
- `make install-api` - Install API dependencies in venv
- `make install-client` - Install client dependencies
- `make venv` - Create Python virtual environment
- `make api` - Start the API server (port 8000)
- `make client` - Start the Next.js client (port 3000)
- `make dev` - Start both API and client concurrently
- `make clean` - Clean build artifacts and caches
- `make clean-all` - Clean everything including venv

## Accessing the Applications

- **API Server**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Next.js Client**: http://localhost:3000
- **Health Check**: http://localhost:8000/health

## Technology Stack

### Backend (Server)
- FastAPI - Modern Python web framework
- SQLite with WAL mode - Optimized for concurrent queries
- SQLAlchemy - SQL toolkit and ORM
- Pydantic v2 - Data validation
- Uvicorn - ASGI server

### Frontend (Client)
- Next.js 16 - React framework
- React 19 - UI library
- TypeScript - Type safety
- Tailwind CSS - Styling
- Radix UI - Component primitives

## Development Notes

### Virtual Environment

The Python virtual environment is automatically created in `server/venv` when you run `make install-api` or `make api`. All Python dependencies are isolated in this environment.

### Environment Variables

Copy the example environment file and customize as needed:

```bash
cd server
cp .env.example .env
```

### Database

The SQLite database (`app.db`) is automatically created in the `server` directory on first run. It uses WAL mode for better concurrent read/write performance.

## Production Deployment

For production deployment, see the individual README files:
- [Server README](server/README.md) - API deployment details
- [Client README](client/README.md) - Frontend deployment details

## License

MIT
