#!/bin/bash

# Mestermind API - Complete startup script
# This script starts the database and API server

set -e

echo "🚀 Starting Mestermind API with PostgreSQL database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Start PostgreSQL and Redis with Docker Compose
echo "📦 Starting PostgreSQL and Redis containers..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Virtual environment not found. Creating it..."
    ./setup_venv.sh
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Initialize database
echo "🗄️  Initializing database..."
python scripts/init_db.py

# Kill any existing processes on port 8000
echo "🔍 Checking for existing processes on port 8000..."
if lsof -ti:8000 > /dev/null 2>&1; then
    echo "⚠️  Found existing processes on port 8000. Terminating them..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    sleep 2
    echo "✅ Existing processes terminated"
else
    echo "✅ Port 8000 is available"
fi

# Start the FastAPI server
echo "🌐 Starting FastAPI server..."
echo ""
echo "✅ Mestermind API is now running!"
echo "📍 API: http://localhost:8000"
echo "📖 Docs: http://localhost:8000/docs"
echo "📋 ReDoc: http://localhost:8000/redoc"
echo "🗄️  Database: PostgreSQL on localhost:5432"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python main.py
