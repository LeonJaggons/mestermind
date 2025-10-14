#!/bin/bash
# Deploy and run database migrations as a Cloud Run Job

set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"your-gcp-project-id"}
REGION=${REGION:-"europe-west1"}
JOB_NAME="mestermind-migrations"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${JOB_NAME}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}[INFO]${NC} Building migration image..."
docker build -f Dockerfile.migrations -t $IMAGE_NAME:latest .

echo -e "${BLUE}[INFO]${NC} Pushing image to Google Container Registry..."
docker push $IMAGE_NAME:latest

echo -e "${BLUE}[INFO]${NC} Creating/Updating Cloud Run Job..."
gcloud run jobs deploy $JOB_NAME \
    --image $IMAGE_NAME:latest \
    --region $REGION \
    --set-secrets DATABASE_URL=mestermind-secrets:database-url \
    --memory 512Mi \
    --cpu 1 \
    --max-retries 1 \
    --task-timeout 600

echo -e "${BLUE}[INFO]${NC} Running migration job..."
gcloud run jobs execute $JOB_NAME --region $REGION --wait

echo -e "${GREEN}[SUCCESS]${NC} Migrations completed successfully!"

