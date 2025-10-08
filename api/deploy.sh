#!/bin/bash

# Mestermind API Cloud Run Deployment Script
# This script builds and deploys the Mestermind API to Google Cloud Run

set -e  # Exit on any error

# Configuration
PROJECT_ID=${PROJECT_ID:-"your-gcp-project-id"}
SERVICE_NAME="mestermind-api"
REGION=${REGION:-"europe-west1"}
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Authenticate with Google Cloud
authenticate() {
    log_info "Authenticating with Google Cloud..."
    
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_info "No active authentication found. Please run: gcloud auth login"
        gcloud auth login
    fi
    
    gcloud config set project $PROJECT_ID
    log_success "Authenticated with project: $PROJECT_ID"
}

# Enable required APIs
enable_apis() {
    log_info "Enabling required Google Cloud APIs..."
    
    gcloud services enable cloudbuild.googleapis.com
    gcloud services enable run.googleapis.com
    gcloud services enable containerregistry.googleapis.com
    
    log_success "APIs enabled"
}

# Build and push Docker image
build_and_push() {
    log_info "Building Docker image..."
    
    # Build the image
    docker build -t $IMAGE_NAME:latest .
    
    log_info "Pushing image to Google Container Registry..."
    docker push $IMAGE_NAME:latest
    
    log_success "Image built and pushed: $IMAGE_NAME:latest"
}

# Deploy to Cloud Run
deploy() {
    log_info "Deploying to Cloud Run..."
    
    # Deploy the service
    gcloud run deploy $SERVICE_NAME \
        --image $IMAGE_NAME:latest \
        --platform managed \
        --region $REGION \
        --allow-unauthenticated \
        --port 8080 \
        --memory 2Gi \
        --cpu 2 \
        --min-instances 1 \
        --max-instances 10 \
        --concurrency 100 \
        --timeout 300 \
        --set-env-vars PORT=8080 \
        --set-secrets DATABASE_URL=mestermind-secrets:database-url \
        --set-secrets REDIS_URL=mestermind-secrets:redis-url \
        --set-secrets SECRET_KEY=mestermind-secrets:secret-key \
        --set-secrets FIREBASE_CREDENTIALS=mestermind-secrets:firebase-credentials
    
    log_success "Service deployed successfully!"
    
    # Get the service URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
    log_success "Service URL: $SERVICE_URL"
}

# Create secrets (if they don't exist)
create_secrets() {
    log_info "Creating secrets..."
    
    # Check if secret exists
    if ! gcloud secrets describe mestermind-secrets &> /dev/null; then
        log_info "Creating secret: mestermind-secrets"
        gcloud secrets create mestermind-secrets --replication-policy="automatic"
    fi
    
    # Add secret versions (you'll need to update these with actual values)
    log_warning "Please update the following secrets with your actual values:"
    log_warning "gcloud secrets versions add mestermind-secrets --data-file=- <<< 'your-database-url'"
    log_warning "gcloud secrets versions add mestermind-secrets --data-file=- <<< 'your-redis-url'"
    log_warning "gcloud secrets versions add mestermind-secrets --data-file=- <<< 'your-secret-key'"
    log_warning "gcloud secrets versions add mestermind-secrets --data-file=- <<< 'your-firebase-credentials'"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
    
    if curl -f "$SERVICE_URL/health" > /dev/null 2>&1; then
        log_success "Health check passed!"
    else
        log_error "Health check failed!"
        exit 1
    fi
}

# Main deployment function
main() {
    log_info "Starting Mestermind API deployment to Cloud Run..."
    
    # Validate PROJECT_ID
    if [ "$PROJECT_ID" = "your-gcp-project-id" ]; then
        log_error "Please set PROJECT_ID environment variable or update the script with your actual project ID"
        exit 1
    fi
    
    check_prerequisites
    authenticate
    enable_apis
    create_secrets
    build_and_push
    deploy
    health_check
    
    log_success "Deployment completed successfully!"
    log_info "Next steps:"
    log_info "1. Update your secrets with actual values"
    log_info "2. Configure your database and Redis instances"
    log_info "3. Test your API endpoints"
}

# Run main function
main "$@"

