#!/bin/bash
# Script to run migrations from Cloud Shell
# Upload this to Cloud Shell and run it there

set -e

echo "🗄️  Running migrations on CloudSQL..."

# Set the DATABASE_URL environment variable
export DATABASE_URL="postgresql://mestermind_user:MestermindUser2024!@/mestermind?host=/cloudsql/mestermind-474514:europe-west1:mestermind-postgres"

# Install dependencies if needed
if [ ! -d "venv" ]; then
    echo "Setting up Python environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Run migrations
echo "Running Alembic migrations..."
alembic upgrade head

echo "✅ Migrations completed successfully!"

