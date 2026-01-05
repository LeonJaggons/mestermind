.PHONY: help api client install-api install-client install dev clean venv seed

# Use Python 3.13, 3.12, 3.11, or 3.10 (prefer in that order)
PYTHON_CMD := $(shell command -v python3.13 2>/dev/null || command -v python3.12 2>/dev/null || command -v python3.11 2>/dev/null || command -v python3.10 2>/dev/null || echo python3)
VENV_DIR = server/venv
PYTHON = $(VENV_DIR)/bin/python
PIP = $(VENV_DIR)/bin/pip

help:
	@echo "Available commands:"
	@echo "  make install        - Install dependencies for both api and client"
	@echo "  make install-api    - Install Python dependencies for API in venv"
	@echo "  make install-client - Install Node dependencies for client"
	@echo "  make venv           - Create Python virtual environment"
	@echo "  make api            - Start the API server"
	@echo "  make client         - Start the Next.js client"
	@echo "  make dev            - Start both API and client concurrently"
	@echo "  make seed           - Seed the database with initial data"
	@echo "  make clean          - Clean build artifacts and caches"
	@echo "  make clean-db       - Remove database files"
	@echo "  make clean-all      - Clean everything including venv and database"

venv:
	@if [ ! -d "$(VENV_DIR)" ]; then \
		echo "Using Python: $(PYTHON_CMD)"; \
		$(PYTHON_CMD) --version; \
		echo "Creating virtual environment..."; \
		$(PYTHON_CMD) -m venv $(VENV_DIR); \
		echo "Virtual environment created at $(VENV_DIR)"; \
	else \
		echo "Virtual environment already exists"; \
	fi

install: install-api install-client

install-api: venv
	@echo "Installing API dependencies in venv..."
	$(PIP) install --upgrade pip
	$(PIP) install -r server/requirements.txt
	@echo "API dependencies installed!"

install-client:
	@echo "Installing client dependencies..."
	cd client && npm install
	@echo "Client dependencies installed!"

api: venv
	@echo "Starting API server..."
	@if [ ! -f "$(PYTHON)" ]; then \
		echo "Virtual environment not found. Run 'make install-api' first."; \
		exit 1; \
	fi
	cd server && PYTHONPATH=. ../$(PYTHON) app/main.py

client:
	@echo "Starting Next.js client..."
	cd client && npm run dev

dev:
	@echo "Starting API and client concurrently..."
	@make -j2 api client

seed: venv
	@echo "Seeding database with initial data..."
	@if [ ! -f "$(PYTHON)" ]; then \
		echo "Virtual environment not found. Run 'make install-api' first."; \
		exit 1; \
	fi
	cd server && PYTHONPATH=. ../$(PYTHON) seed.py

clean:
	@echo "Cleaning build artifacts..."
	cd server && rm -rf __pycache__ **/__pycache__
	cd client && rm -rf .next node_modules/.cache
	@echo "Clean complete!"

clean-db:
	@echo "Removing database files..."
	cd server && rm -rf *.db *.db-shm *.db-wal
	@echo "Database cleaned!"

clean-all: clean clean-db
	@echo "Removing virtual environment..."
	rm -rf $(VENV_DIR)
	@echo "Deep clean complete!"
