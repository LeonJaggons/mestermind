# Mestermind - Top Level Makefile
# This Makefile provides convenient commands to start, stop, and manage the Mestermind application

.PHONY: help install-api install-client start-api start-client start-all stop-all clean-api clean-client clean-all logs-api logs-client logs-all

# Default target
help:
	@echo "🚀 Mestermind - Budapest Marketplace Platform"
	@echo ""
	@echo "Available commands:"
	@echo ""
	@echo "📦 Installation:"
	@echo "  install-api     Install API dependencies (Python virtual environment)"
	@echo "  install-client  Install client dependencies (Node.js)"
	@echo "  install-all     Install all dependencies"
	@echo ""
	@echo "🚀 Starting Services:"
	@echo "  start-api       Start the FastAPI backend server"
	@echo "  start-client    Start the Next.js frontend development server"
	@echo "  start-all       Start both API and client services"
	@echo ""
	@echo "🛑 Stopping Services:"
	@echo "  stop-api        Stop the API server"
	@echo "  stop-client     Stop the client server"
	@echo "  stop-all        Stop all services"
	@echo ""
	@echo "📋 Monitoring:"
	@echo "  logs-api        Show API server logs"
	@echo "  logs-client     Show client server logs"
	@echo "  logs-all        Show logs for all services"
	@echo ""
	@echo "🧹 Cleanup:"
	@echo "  clean-api       Clean API dependencies and virtual environment"
	@echo "  clean-client    Clean client dependencies and build files"
	@echo "  clean-all       Clean all dependencies and build files"
	@echo ""
	@echo "🔧 Development:"
	@echo "  setup-db        Initialize the database with sample data"
	@echo "  reset-db        Reset the database (WARNING: destroys all data)"
	@echo ""

# Installation targets
install-api:
	@echo "📦 Installing API dependencies..."
	@cd api && \
	if [ ! -d "venv" ]; then \
		echo "Creating Python virtual environment..."; \
		./setup_venv.sh; \
	fi && \
	source venv/bin/activate && \
	pip install -r requirements.txt
	@echo "✅ API dependencies installed"

install-client:
	@echo "📦 Installing client dependencies..."
	@cd client && npm install
	@echo "✅ Client dependencies installed"

install-all: install-api install-client
	@echo "✅ All dependencies installed"

# Starting services
start-api:
	@echo "🚀 Starting Mestermind API..."
	@cd api && ./start.sh

start-client:
	@echo "🚀 Starting Mestermind Client..."
	@cd client && npm run dev

start-all:
	@echo "🚀 Starting all Mestermind services..."
	@echo "Starting API in background..."
	@cd api && ./start.sh &
	@sleep 5
	@echo "Starting client..."
	@cd client && npm run dev

# Stopping services
stop-api:
	@echo "🛑 Stopping API server..."
	@lsof -ti:8000 | xargs kill -9 2>/dev/null || echo "No API server running on port 8000"

stop-client:
	@echo "🛑 Stopping client server..."
	@lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "No client server running on port 3000"

stop-all: stop-api stop-client
	@echo "🛑 All services stopped"

# Logging
logs-api:
	@echo "📋 API server logs:"
	@cd api && tail -f logs/api.log 2>/dev/null || echo "No API logs found"

logs-client:
	@echo "📋 Client server logs:"
	@cd client && tail -f .next/trace 2>/dev/null || echo "No client logs found"

logs-all:
	@echo "📋 All service logs:"
	@echo "=== API Logs ==="
	@cd api && tail -f logs/api.log 2>/dev/null || echo "No API logs found"
	@echo "=== Client Logs ==="
	@cd client && tail -f .next/trace 2>/dev/null || echo "No client logs found"

# Cleanup targets
clean-api:
	@echo "🧹 Cleaning API dependencies..."
	@cd api && \
	if [ -d "venv" ]; then \
		echo "Removing virtual environment..."; \
		rm -rf venv; \
	fi && \
	if [ -d "__pycache__" ]; then \
		echo "Removing Python cache..."; \
		find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true; \
	fi
	@echo "✅ API cleaned"

clean-client:
	@echo "🧹 Cleaning client dependencies..."
	@cd client && \
	if [ -d "node_modules" ]; then \
		echo "Removing node_modules..."; \
		rm -rf node_modules; \
	fi && \
	if [ -d ".next" ]; then \
		echo "Removing build files..."; \
		rm -rf .next; \
	fi
	@echo "✅ Client cleaned"

clean-all: clean-api clean-client
	@echo "✅ All cleaned"

# Database management
setup-db:
	@echo "🗄️  Setting up database..."
	@cd api && \
	if [ ! -d "venv" ]; then \
		echo "Creating virtual environment first..."; \
		./setup_venv.sh; \
	fi && \
	source venv/bin/activate && \
	python scripts/init_db.py
	@echo "✅ Database initialized"

reset-db:
	@echo "⚠️  WARNING: This will destroy all data in the database!"
	@read -p "Are you sure? (y/N): " confirm && \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		echo "🗄️  Resetting database..."; \
		cd api && docker-compose down -v && docker-compose up -d && \
		sleep 10 && \
		if [ ! -d "venv" ]; then \
			./setup_venv.sh; \
		fi && \
		source venv/bin/activate && \
		python scripts/init_db.py; \
		echo "✅ Database reset complete"; \
	else \
		echo "❌ Database reset cancelled"; \
	fi

# Development helpers
dev-setup: install-all setup-db
	@echo "🎉 Development environment ready!"
	@echo "Run 'make start-all' to start both services"

# Quick start for new developers
quick-start: dev-setup start-all
	@echo "🚀 Mestermind is now running!"
	@echo "📍 API: http://localhost:8000"
	@echo "📍 Client: http://localhost:3000"
	@echo "📖 API Docs: http://localhost:8000/docs"
