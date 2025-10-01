#!/bin/bash

# Mestermind API - Virtual Environment Setup Script
# This script creates and sets up a Python virtual environment for the FastAPI backend

set -e

echo "🚀 Setting up Mestermind API virtual environment..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "📋 Python version: $PYTHON_VERSION"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install packages individually for better compatibility
echo "📚 Installing packages individually..."

echo "Installing FastAPI..."
pip install fastapi==0.115.0

echo "Installing Uvicorn..."
pip install "uvicorn[standard]==0.32.0"

echo "Installing Pydantic..."
pip install pydantic==2.10.0

echo "Installing other dependencies..."
pip install python-dotenv==1.0.1
pip install httpx==0.28.1

echo "✅ Virtual environment setup complete!"
echo ""
echo "To activate the virtual environment, run:"
echo "  source venv/bin/activate"
echo ""
echo "To start the FastAPI server, run:"
echo "  python main.py"
echo ""
echo "The API will be available at:"
echo "  http://localhost:8000"
echo "  http://localhost:8000/docs (Swagger UI)"
echo "  http://localhost:8000/redoc (ReDoc)"
