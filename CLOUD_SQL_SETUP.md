# Cloud SQL PostgreSQL Setup Guide

This guide will help you set up Cloud SQL PostgreSQL for the Mestermind API.

## Prerequisites

- Google Cloud Project with billing enabled
- `gcloud` CLI installed and authenticated
- Cloud SQL Admin API enabled

## Step 1: Enable Required APIs

```bash
gcloud services enable sqladmin.googleapis.com
gcloud services enable compute.googleapis.com
```

## Step 2: Create Cloud SQL PostgreSQL Instance

```bash
# Set your project ID
export PROJECT_ID=$(gcloud config get-value project)
export REGION="europe-west1"  # Match your Cloud Run region
export INSTANCE_NAME="mestermind-db"

# Create the instance
gcloud sql instances create $INSTANCE_NAME \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --root-password=CHANGE_THIS_ROOT_PASSWORD \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=03:00

# Note: For production, use a larger tier like db-custom-2-7680 (2 vCPU, 7.5GB RAM)
```

## Step 3: Create Database and User

```bash
# Create the database
gcloud sql databases create mestermind \
  --instance=$INSTANCE_NAME

# Create a user for the application
gcloud sql users create mestermind_user \
  --instance=$INSTANCE_NAME \
  --password=YOUR_SECURE_PASSWORD_HERE

# IMPORTANT: Save this password securely!
```

## Step 4: Store Database Password in Secret Manager

```bash
# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Create a secret for the database password
echo -n "YOUR_SECURE_PASSWORD_HERE" | gcloud secrets create db-password --data-file=-

# Grant Cloud Run service account access to the secret
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 5: Update Cloud Build Configuration

Your `cloudbuild.yaml` has been configured with:
- Cloud SQL instance connection: `$PROJECT_ID:europe-west1:mestermind-db`
- Database URL format: `postgresql+psycopg2://mestermind_user:PASSWORD@/mestermind?host=/cloudsql/...`

**Important:** You need to either:

### Option A: Use Secret Manager (Recommended)

1. Store the complete DATABASE_URL in Secret Manager:
```bash
# Create the DATABASE_URL secret
gcloud secrets create database-url \
  --data-file=- <<EOF
postgresql+psycopg2://mestermind_user:YOUR_PASSWORD@/mestermind?host=/cloudsql/$PROJECT_ID:europe-west1:mestermind-db
EOF
```

2. Update `cloudbuild.yaml` to use secrets:
```yaml
- '--set-secrets'
- 'DATABASE_URL=database-url:latest'
```

### Option B: Set Environment Variable Manually

After deployment, update the Cloud Run service:
```bash
gcloud run services update mestermind-server \
  --region=europe-west1 \
  --set-env-vars="DATABASE_URL=postgresql+psycopg2://mestermind_user:YOUR_PASSWORD@/mestermind?host=/cloudsql/$PROJECT_ID:europe-west1:mestermind-db"
```

## Step 6: Run Database Migrations

After deploying, you'll need to run migrations to create tables:

### Option 1: Run from Cloud Shell
```bash
# Install Cloud SQL Proxy
wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy
chmod +x cloud_sql_proxy

# Start the proxy
./cloud_sql_proxy -instances=$PROJECT_ID:europe-west1:mestermind-db=tcp:5432 &

# Set environment variable
export DATABASE_URL="postgresql+psycopg2://mestermind_user:YOUR_PASSWORD@localhost:5432/mestermind"

# Run migrations (if you have Alembic) or let FastAPI create tables on first request
```

### Option 2: Let FastAPI Auto-Create Tables
The application is configured to create tables automatically on startup using:
```python
Base.metadata.create_all(bind=engine)
```

This will happen when the Cloud Run service starts.

## Step 7: Seed Data

If you need to seed initial data:

```bash
# Connect via Cloud SQL Proxy
./cloud_sql_proxy -instances=$PROJECT_ID:europe-west1:mestermind-db=tcp:5432 &

# Run your seed script
cd server
python seed.py
```

## Step 8: Verify Connection

After deployment, check the logs:
```bash
gcloud run services logs read mestermind-server --region=europe-west1
```

You should see:
- "Starting FastAPI server on 0.0.0.0:8000"
- "Application startup complete"

## Connection String Format

### Cloud Run (Unix Socket - Recommended)
```
postgresql+psycopg2://username:password@/database_name?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
```

### Local Development via Cloud SQL Proxy (TCP)
```
postgresql+psycopg2://username:password@localhost:5432/database_name
```

### Public IP (Not Recommended)
```
postgresql+psycopg2://username:password@PUBLIC_IP:5432/database_name
```

## Security Best Practices

1. ✅ **Never commit passwords** to version control
2. ✅ **Use Secret Manager** for sensitive data
3. ✅ **Enable SSL** for public IP connections
4. ✅ **Use Private IP** when possible
5. ✅ **Regular backups** (configured with --backup-start-time)
6. ✅ **Restrict network access** to only necessary services

## Monitoring

Enable Cloud SQL monitoring:
```bash
# View instance details
gcloud sql instances describe $INSTANCE_NAME

# View operations
gcloud sql operations list --instance=$INSTANCE_NAME
```

## Troubleshooting

### Issue: Connection timeout
- Check Cloud SQL instance is running
- Verify Cloud Run has Cloud SQL connection configured
- Check service account permissions

### Issue: Authentication failed
- Verify username and password
- Check user exists: `gcloud sql users list --instance=$INSTANCE_NAME`

### Issue: Database doesn't exist
- Create database: `gcloud sql databases create mestermind --instance=$INSTANCE_NAME`

## Cost Optimization

- **Development:** Use `db-f1-micro` (~$7/month)
- **Production:** Use `db-custom-1-3840` or higher
- Enable **automatic storage increase**
- Set up **maintenance windows** during low-traffic periods

## Next Steps

1. Create the Cloud SQL instance
2. Store secrets in Secret Manager
3. Update cloudbuild.yaml with correct instance name
4. Deploy using Cloud Build
5. Verify application can connect to database
6. Run seed data if needed
