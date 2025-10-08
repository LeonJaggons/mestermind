# Mestermind API - Cloud Run Deployment

This directory contains the Docker configuration and deployment scripts for deploying the Mestermind API to Google Cloud Run.

## Prerequisites

1. **Google Cloud SDK**: Install and configure the Google Cloud SDK
   ```bash
   # Install gcloud CLI
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   
   # Authenticate
   gcloud auth login
   gcloud auth application-default login
   ```

2. **Docker**: Install Docker Desktop or Docker Engine
   ```bash
   # macOS with Homebrew
   brew install --cask docker
   
   # Or download from https://www.docker.com/products/docker-desktop
   ```

3. **Google Cloud Project**: Create a new project or use an existing one
   ```bash
   gcloud projects create your-project-id
   gcloud config set project your-project-id
   ```

## Quick Deployment

1. **Set your project ID**:
   ```bash
   export PROJECT_ID=your-gcp-project-id
   ```

2. **Run the deployment script**:
   ```bash
   ./deploy.sh
   ```

## Manual Deployment Steps

### 1. Enable Required APIs
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 2. Create Secrets
```bash
# Create the secret
gcloud secrets create mestermind-secrets --replication-policy="automatic"

# Add secret versions (replace with your actual values)
echo "postgresql://user:pass@host:port/db" | gcloud secrets versions add mestermind-secrets --data-file=-
echo "redis://user:pass@host:port" | gcloud secrets versions add mestermind-secrets --data-file=-
echo "your-secret-key" | gcloud secrets versions add mestermind-secrets --data-file=-
echo "your-firebase-credentials-json" | gcloud secrets versions add mestermind-secrets --data-file=-
```

### 3. Build and Push Docker Image
```bash
# Build the image
docker build -t gcr.io/$PROJECT_ID/mestermind-api:latest .

# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/mestermind-api:latest
```

### 4. Deploy to Cloud Run
```bash
gcloud run deploy mestermind-api \
  --image gcr.io/$PROJECT_ID/mestermind-api:latest \
  --platform managed \
  --region europe-west1 \
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
```

## Configuration

### Environment Variables

The following environment variables are required for production:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string  
- `SECRET_KEY`: Secret key for JWT tokens
- `FIREBASE_CREDENTIALS`: Firebase service account JSON

### Database Setup

For production, you'll need to set up:

1. **Cloud SQL PostgreSQL** or external PostgreSQL database
2. **Cloud Memorystore Redis** or external Redis instance

### CORS Configuration

Update the CORS origins in your environment variables to include your production domains:

```bash
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Local Development with Docker

To run the API locally with Docker:

```bash
# Build and run with docker-compose
docker-compose -f docker-compose.prod.yml up --build

# Or run individual services
docker-compose up postgres redis
docker build -t mestermind-api .
docker run -p 8080:8080 --env-file .env mestermind-api
```

## Monitoring and Logs

### View Logs
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=mestermind-api" --limit 50
```

### Monitor Performance
```bash
# View service details
gcloud run services describe mestermind-api --region=europe-west1

# View metrics in Cloud Console
# https://console.cloud.google.com/run
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Make sure you're authenticated with `gcloud auth login`
2. **Permission Errors**: Ensure your account has the necessary IAM roles
3. **Build Failures**: Check that all dependencies are properly installed
4. **Runtime Errors**: Check logs for specific error messages

### Debug Commands

```bash
# Check service status
gcloud run services list

# View detailed service info
gcloud run services describe mestermind-api --region=europe-west1

# Test health endpoint
curl https://your-service-url/health

# View recent logs
gcloud logging read "resource.type=cloud_run_revision" --limit 20
```

## Security Considerations

1. **Secrets Management**: All sensitive data is stored in Google Secret Manager
2. **Network Security**: Cloud Run provides automatic HTTPS and DDoS protection
3. **Access Control**: Configure IAM roles appropriately for your team
4. **Database Security**: Use Cloud SQL with private IP and SSL connections

## Cost Optimization

1. **Instance Scaling**: Configure appropriate min/max instances based on traffic
2. **Resource Limits**: Monitor CPU and memory usage to optimize resource allocation
3. **Cold Starts**: Consider keeping at least 1 instance warm for better performance

## Support

For issues or questions:
1. Check the Cloud Run documentation: https://cloud.google.com/run/docs
2. Review the FastAPI documentation: https://fastapi.tiangolo.com/
3. Check the application logs for specific error messages

