#!/bin/bash

# Cloud SQL Setup Script for Mestermind
# This script will configure your existing Cloud SQL instance for the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Mestermind Cloud SQL Setup ===${NC}\n"

# Configuration
PROJECT_ID="mestermind-474514"
REGION="europe-west1"
INSTANCE_NAME="mestermind-postgres"
CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"
DATABASE_NAME="mestermind"
DB_USER="mestermind_user"

echo "Configuration:"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Instance: $INSTANCE_NAME"
echo "  Database: $DATABASE_NAME"
echo "  User: $DB_USER"
echo ""

# Step 1: Check if database exists, if not create it
echo -e "${YELLOW}Step 1: Setting up database...${NC}"
if gcloud sql databases describe $DATABASE_NAME --instance=$INSTANCE_NAME --project=$PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✓ Database '$DATABASE_NAME' already exists${NC}"
    read -p "Do you want to DROP and recreate it? This will DELETE ALL DATA! (yes/no): " confirm
    if [ "$confirm" == "yes" ]; then
        echo "Dropping database..."
        gcloud sql databases delete $DATABASE_NAME --instance=$INSTANCE_NAME --project=$PROJECT_ID --quiet
        echo "Creating fresh database..."
        gcloud sql databases create $DATABASE_NAME --instance=$INSTANCE_NAME --project=$PROJECT_ID
        echo -e "${GREEN}✓ Database recreated${NC}"
    fi
else
    echo "Creating database..."
    gcloud sql databases create $DATABASE_NAME --instance=$INSTANCE_NAME --project=$PROJECT_ID
    echo -e "${GREEN}✓ Database created${NC}"
fi

# Step 2: Create or update user
echo -e "\n${YELLOW}Step 2: Setting up database user...${NC}"
read -sp "Enter password for user '$DB_USER' (will be hidden): " DB_PASSWORD
echo ""

if gcloud sql users describe $DB_USER --instance=$INSTANCE_NAME --project=$PROJECT_ID &>/dev/null; then
    echo "User exists, updating password..."
    gcloud sql users set-password $DB_USER \
        --instance=$INSTANCE_NAME \
        --password="$DB_PASSWORD" \
        --project=$PROJECT_ID
    echo -e "${GREEN}✓ User password updated${NC}"
else
    echo "Creating user..."
    gcloud sql users create $DB_USER \
        --instance=$INSTANCE_NAME \
        --password="$DB_PASSWORD" \
        --project=$PROJECT_ID
    echo -e "${GREEN}✓ User created${NC}"
fi

# Step 3: Store DATABASE_URL in Secret Manager
echo -e "\n${YELLOW}Step 3: Setting up Secret Manager...${NC}"

# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID

# Create the DATABASE_URL secret
DATABASE_URL="postgresql+psycopg2://${DB_USER}:${DB_PASSWORD}@/mestermind?host=/cloudsql/${CONNECTION_NAME}"

if gcloud secrets describe database-url --project=$PROJECT_ID &>/dev/null; then
    echo "Secret exists, creating new version..."
    echo -n "$DATABASE_URL" | gcloud secrets versions add database-url --data-file=- --project=$PROJECT_ID
    echo -e "${GREEN}✓ Secret updated${NC}"
else
    echo "Creating secret..."
    echo -n "$DATABASE_URL" | gcloud secrets create database-url --data-file=- --project=$PROJECT_ID
    echo -e "${GREEN}✓ Secret created${NC}"
fi

# Grant Cloud Run access to the secret
echo "Granting Cloud Run access to secret..."
gcloud secrets add-iam-policy-binding database-url \
    --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID
echo -e "${GREEN}✓ Permissions granted${NC}"

# Step 4: Update cloudbuild.yaml
echo -e "\n${YELLOW}Step 4: Updating cloudbuild.yaml...${NC}"
echo -e "${YELLOW}Please manually uncomment these lines in cloudbuild.yaml:${NC}"
echo "  # - '--set-secrets'"
echo "  # - 'DATABASE_URL=database-url:latest'"
echo ""

# Step 5: Summary
echo -e "\n${GREEN}=== Setup Complete! ===${NC}\n"
echo "Next steps:"
echo "1. Uncomment the --set-secrets lines in cloudbuild.yaml"
echo "2. Commit and push changes: git add -A && git commit -m 'Configure Cloud SQL' && git push"
echo "3. Deploy via Cloud Build or run: gcloud builds submit --config=cloudbuild.yaml"
echo ""
echo "Your DATABASE_URL has been stored in Secret Manager as 'database-url'"
echo "Connection name: $CONNECTION_NAME"
echo ""
echo -e "${YELLOW}Note: On first deployment, tables will be created automatically by FastAPI${NC}"
