#!/bin/bash
# Production-ready start script for FastAPI application with venv support

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VENV_DIR="$SCRIPT_DIR/venv"

# Find a suitable Python version (prefer 3.13, 3.12, 3.11, or 3.10)
PYTHON_CMD=$(command -v python3.13 2>/dev/null || command -v python3.12 2>/dev/null || command -v python3.11 2>/dev/null || command -v python3.10 2>/dev/null || command -v python3)

# Check if venv exists
if [ ! -d "$VENV_DIR" ]; then
    echo "Virtual environment not found at $VENV_DIR"
    echo "Using Python: $PYTHON_CMD"
    $PYTHON_CMD --version
    echo "Creating virtual environment..."
    $PYTHON_CMD -m venv "$VENV_DIR"
    echo "Installing dependencies..."
    "$VENV_DIR/bin/pip" install --upgrade pip
    "$VENV_DIR/bin/pip" install -r "$SCRIPT_DIR/requirements.txt"
fi

# Activate venv and run the Python start script
echo "Using Python from venv: $VENV_DIR/bin/python"
cd "$SCRIPT_DIR"
"$VENV_DIR/bin/python" start.py
