# Running Production Migrations on CloudSQL

## Quick Method: Using Google Cloud Shell (Recommended)

Since you're experiencing IAM permission issues locally, the easiest way to run migrations is directly from Cloud Shell:

### Steps:

1. **Open Google Cloud Shell**
   - Go to https://console.cloud.google.com
   - Click the Cloud Shell icon in the top right
   - Make sure you're in project `mestermind-474514`

2. **Clone your repository** (if not already done):
   ```bash
   git clone <your-repo-url> mestermind
   cd mestermind/api
   ```

3. **Set up Python environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Run the migration**:
   ```bash
   export DATABASE_URL="postgresql://mestermind_user:MestermindUser2024!@/mestermind?host=/cloudsql/mestermind-474514:europe-west1:mestermind-postgres"
   alembic upgrade head
   ```

That's it! Cloud Shell has built-in access to CloudSQL via Unix sockets and all necessary IAM permissions.

---

## Alternative: Fix Local Permissions

If you want to run migrations from your local machine, you need these IAM roles:

Ask your project owner to grant you:
```bash
gcloud projects add-iam-policy-binding mestermind-474514 \
  --member="user:leonojaggon@gmail.com" \
  --role="roles/cloudsql.client"
```

Then:
1. Re-authenticate: `gcloud auth application-default login`
2. Restart the proxy: `cloud-sql-proxy mestermind-474514:europe-west1:mestermind-postgres --port 5433`
3. Run migration:  
   ```bash
   cd api
   source venv/bin/activate
   alembic -x db_url="postgresql://mestermind_user:MestermindUser2024!@localhost:5433/mestermind" upgrade head
   ```

---

## Using the Makefile

Once permissions are fixed, you can use:

```bash
# For local development database
make migrate-local

# For production (after setting up permissions)
make migrate-prod

# To create a new migration
make new-migration
```

---

## Troubleshooting

**Error: "Permission denied" or "403: NOT_AUTHORIZED"**
- You need the `roles/cloudsql.client` IAM role
- Run from Cloud Shell instead

**Error: "Connection refused"**
- Cloud SQL Proxy might not be running
- Check with: `ps aux | grep cloud-sql-proxy`
- Restart proxy if needed

**Error: "Target database is not up to date"**
- This means migrations are already applied
- Check current version: `alembic current`
- Check pending migrations: `alembic history`

