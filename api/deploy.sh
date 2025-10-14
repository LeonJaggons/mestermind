#!/bin/bash

# Mestermind API Cloud Run Deployment Script
# This script builds and deploys the Mestermind API to Google Cloud Run

set -e  # Exit on any error

# Configuration
PROJECT_ID=${PROJECT_ID:-"mestermind-474514"}
SERVICE_NAME="mestermind"
REGION=${REGION:-"europe-west1"}
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
# Cloud SQL instance (for /cloudsql/... socket in DATABASE_URL)
CLOUD_SQL_INSTANCE=${CLOUD_SQL_INSTANCE:-"mestermind-474514:europe-west1:mestermind-postgres"}

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
    
    # Prefer buildx to produce an amd64/linux image for Cloud Run
    if command -v docker &> /dev/null && docker buildx version &> /dev/null; then
        log_info "Using docker buildx to build linux/amd64 image"
        docker buildx build --platform linux/amd64 -t $IMAGE_NAME:latest --push .
        log_success "Image built and pushed (linux/amd64) via buildx: $IMAGE_NAME:latest"
    else
        log_warning "docker buildx not available; falling back to docker build (may be slower)"
        DOCKER_DEFAULT_PLATFORM=linux/amd64 docker build -t $IMAGE_NAME:latest .
        log_info "Pushing image to Google Container Registry..."
        docker push $IMAGE_NAME:latest
        log_success "Image built and pushed (linux/amd64): $IMAGE_NAME:latest"
    fi
}

# Ensure required secrets exist and grant access
ensure_secrets() {
    log_info "Ensuring required secrets exist and access is configured..."

    # Required secret names
    REQUIRED_SECRETS=(
        "database-url"
        "stripe-secret-key"
        "stripe-publishable-key"
    )

    for secret in "${REQUIRED_SECRETS[@]}"; do
        if ! gcloud secrets describe "$secret" --project "$PROJECT_ID" &> /dev/null; then
            log_info "Creating secret: $secret"
            gcloud secrets create "$secret" --replication-policy="automatic" --project "$PROJECT_ID"
            log_warning "Add a version for $secret, e.g.: echo 'VALUE' | gcloud secrets versions add $secret --data-file=- --project $PROJECT_ID"
        fi
    done

    # Grant Secret Accessor role to Cloud Run service account
    PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
    CR_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
    for secret in "${REQUIRED_SECRETS[@]}"; do
        gcloud secrets add-iam-policy-binding "$secret" \
            --member "serviceAccount:${CR_SA}" \
            --role roles/secretmanager.secretAccessor \
            --project "$PROJECT_ID" >/dev/null 2>&1 || true
    done

    log_success "Secrets checked and access configured"
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
        --add-cloudsql-instances "$CLOUD_SQL_INSTANCE" \
        --memory 2Gi \
        --cpu 2 \
        --min-instances 1 \
        --max-instances 10 \
        --concurrency 100 \
        --timeout 300 \
        --set-secrets DATABASE_URL=PROD_DB_URL:latest \
        --set-secrets STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest \
        --set-secrets STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLIC_KEY:latest
    
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

