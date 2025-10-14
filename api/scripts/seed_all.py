#!/usr/bin/env python3
"""
Central database seeding script for Mestermind API.
This script runs all necessary seed scripts in the correct order to populate the database.

Usage:
  python api/scripts/seed_all.py [--force] [--skip-migrations]

Options:
  --force: Force re-seeding even if data already exists
  --skip-migrations: Skip running database migrations (assumes tables exist)
"""

import os
import sys
import subprocess
import argparse
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Get the project root directory
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
API_DIR = PROJECT_ROOT


def run_command(cmd, description, cwd=None):
    """Run a command and handle errors"""
    logger.info(f"🔄 {description}")
    logger.debug(f"Running: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd, cwd=cwd or API_DIR, check=True, capture_output=True, text=True
        )
        logger.info(f"✅ {description} completed successfully")
        if result.stdout:
            logger.debug(f"Output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ {description} failed")
        logger.error(f"Error: {e.stderr}")
        if e.stdout:
            logger.error(f"Output: {e.stdout}")
        return False


def check_database_connection():
    """Check if database is accessible"""
    try:
        # Try to import and connect to database
        sys.path.insert(0, str(API_DIR))
        from app.core.database import engine

        with engine.connect() as connection:
            from sqlalchemy import text

            connection.execute(text("SELECT 1"))
        logger.info("✅ Database connection successful")
        return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False


def run_migrations():
    """Run database migrations"""
    logger.info("🔄 Running database migrations...")

    # Check if alembic is available
    alembic_cmd = ["python", "-m", "alembic", "upgrade", "head"]
    if run_command(alembic_cmd, "Database migrations"):
        return True
    else:
        logger.warning("⚠️  Migrations failed, but continuing...")
        return False


def seed_initial_data():
    """Seed initial categories and subcategories"""
    script_path = API_DIR / "scripts" / "init_db.py"
    cmd = ["python", str(script_path)]
    return run_command(cmd, "Initial database setup")


def seed_categories_from_json():
    """Seed categories and subcategories from JSON files if they exist"""
    logger.info("🔄 Checking for category JSON files...")

    categories_file = API_DIR / "data" / "categories.json"
    subcategories_file = API_DIR / "data" / "subcategories_by_category.json"

    if not categories_file.exists() and not subcategories_file.exists():
        logger.info("⏭️  No category JSON files found, skipping")
        return True

    try:
        sys.path.insert(0, str(API_DIR))
        from app.core.database import SessionLocal
        from app.models.database import Category, Subcategory
        import json
        import uuid

        db = SessionLocal()
        try:
            # Check if categories already exist
            existing_categories = db.query(Category).count()
            if existing_categories > 0:
                logger.info("📋 Categories already exist, skipping JSON import")
                return True

            # Load categories
            if categories_file.exists():
                with open(categories_file, "r", encoding="utf-8") as f:
                    categories_data = json.load(f)
                logger.info(f"📄 Loaded {len(categories_data)} categories from JSON")
            else:
                categories_data = []

            # Load subcategories
            if subcategories_file.exists():
                with open(subcategories_file, "r", encoding="utf-8") as f:
                    subcategories_data = json.load(f)
                logger.info(
                    f"📄 Loaded subcategories for {len(subcategories_data)} categories from JSON"
                )
            else:
                subcategories_data = {}

            # Create categories
            category_objects = {}
            for i, category_name in enumerate(categories_data):
                category = Category(
                    id=uuid.uuid4(),
                    name=category_name,
                    description=f"Services related to {category_name.lower()}",
                    icon=category_name.lower().replace(" ", "-").replace("/", "-"),
                    sort_order=i + 1,
                )
                db.add(category)
                db.flush()
                category_objects[category_name] = category

            # Create subcategories
            subcategory_count = 0
            for category_name, subcategory_names in subcategories_data.items():
                if category_name in category_objects:
                    category = category_objects[category_name]
                    for j, subcategory_name in enumerate(subcategory_names):
                        subcategory = Subcategory(
                            id=uuid.uuid4(),
                            category_id=category.id,
                            name=subcategory_name,
                            description=f"{subcategory_name} services within {category_name.lower()}",
                            sort_order=j + 1,
                        )
                        db.add(subcategory)
                        subcategory_count += 1

            db.commit()
            logger.info(
                f"✅ Created {len(category_objects)} categories and {subcategory_count} subcategories from JSON"
            )
            return True

        finally:
            db.close()

    except Exception as e:
        logger.error(f"❌ Failed to seed categories from JSON: {e}")
        return False


def seed_hungary_locations():
    """Seed Hungary location data"""
    script_path = API_DIR / "scripts" / "seed_hungary_locations.py"
    data_file = API_DIR / "data" / "hungary_location_seed_data.json"

    if not data_file.exists():
        logger.warning(f"⚠️  Location data file not found: {data_file}")
        logger.warning("Skipping Hungary locations seeding")
        return True

    cmd = ["python", str(script_path), "--file", str(data_file)]
    return run_command(cmd, "Hungary locations seeding")


def import_services():
    """Import services from JSON"""
    script_path = API_DIR / "scripts" / "seed_services.py"

    # Check for different possible service data files
    possible_files = [
        "thumbtack_handyman_services_full.json",
        "mestermind-services-taxonomy.json",
    ]

    data_file = None
    for filename in possible_files:
        file_path = API_DIR / "data" / filename
        if file_path.exists():
            data_file = file_path
            break

    if not data_file:
        logger.warning(f"⚠️  No services data file found. Checked: {possible_files}")
        logger.warning("Skipping services import")
        return True

    # Update the import script to use the found file
    logger.info(f"📄 Using services data file: {data_file.name}")

    cmd = ["python", str(script_path)]
    return run_command(cmd, "Services import")


def seed_price_bands():
    """Seed price bands and mappings"""
    script_path = API_DIR / "scripts" / "seed_price_bands.py"
    cmd = ["python", str(script_path)]
    return run_command(cmd, "Price bands seeding")


def seed_question_sets():
    """Seed question sets for services"""
    script_path = API_DIR / "scripts" / "seed_question_sets.py"

    # Check if cleaning service templates exist
    templates_file = API_DIR / "data" / "cleaning_service_templates.json"
    if templates_file.exists():
        logger.info(f"📄 Found question templates: {templates_file.name}")
        cmd = ["python", str(script_path), "--templates", str(templates_file)]
    else:
        cmd = ["python", str(script_path)]

    return run_command(cmd, "Question sets seeding")


def generate_taxonomy_derivatives():
    """Generate taxonomy derivative files"""
    script_path = API_DIR / "scripts" / "generate_taxonomy_derivatives.py"
    cmd = ["python", str(script_path)]
    return run_command(cmd, "Taxonomy derivatives generation")


def create_dev_user():
    """Create development user and mester"""
    logger.info("🔄 Creating development user and mester...")

    try:
        sys.path.insert(0, str(API_DIR))
        from app.core.database import SessionLocal
        from app.models.database import User, Mester
        from sqlalchemy import func
        import uuid

        db = SessionLocal()
        try:
            # Check if dev user already exists
            dev_email = "dev-mester@gmail.com"
            user = (
                db.query(User)
                .filter(func.lower(User.email) == dev_email.lower())
                .first()
            )

            if user:
                logger.info(f"✅ Dev user already exists: {user.email}")

                # Check if mester exists for this user
                mester = db.query(Mester).filter(Mester.user_id == user.id).first()
                if mester:
                    logger.info(f"✅ Dev mester already exists: {mester.id}")
                else:
                    # Create mester for existing user
                    mester = Mester(
                        id=uuid.uuid4(),
                        user_id=user.id,
                        full_name="Dev Mester",
                        slug="dev-mester",
                        email=user.email,
                        is_active=True,
                    )
                    db.add(mester)
                    db.commit()
                    logger.info(f"✅ Created dev mester: {mester.id}")
            else:
                # Create new user and mester
                user = User(
                    id=uuid.uuid4(),
                    first_name="Dev",
                    last_name="Mester",
                    email=dev_email,
                    firebase_uid="dev-user-uid",
                )
                db.add(user)
                db.flush()

                mester = Mester(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    full_name="Dev Mester",
                    slug="dev-mester",
                    email=user.email,
                    is_active=True,
                )
                db.add(mester)
                db.commit()
                logger.info(
                    f"✅ Created dev user and mester: {user.email}, {mester.id}"
                )

        finally:
            db.close()

        return True

    except Exception as e:
        logger.error(f"❌ Failed to create dev user: {e}")
        return False


def verify_seeding():
    """Verify that seeding was successful"""
    logger.info("🔍 Verifying database seeding...")

    try:
        sys.path.insert(0, str(API_DIR))
        from app.core.database import SessionLocal
        from app.models.database import (
            Category,
            Subcategory,
            Service,
            County,
            City,
            District,
            PostalCode,
            PriceBand,
            PriceBandMapping,
            QuestionSet,
            Question,
            User,
            Mester,
        )

        db = SessionLocal()
        try:
            # Count records
            counts = {
                "Categories": db.query(Category).count(),
                "Subcategories": db.query(Subcategory).count(),
                "Services": db.query(Service).count(),
                "Counties": db.query(County).count(),
                "Cities": db.query(City).count(),
                "Districts": db.query(District).count(),
                "Postal Codes": db.query(PostalCode).count(),
                "Price Bands": db.query(PriceBand).count(),
                "Price Band Mappings": db.query(PriceBandMapping).count(),
                "Question Sets": db.query(QuestionSet).count(),
                "Questions": db.query(Question).count(),
                "Users": db.query(User).count(),
                "Mesters": db.query(Mester).count(),
            }

            logger.info("📊 Database seeding verification:")
            for table, count in counts.items():
                logger.info(f"   {table}: {count}")

            # Check for critical data
            if counts["Categories"] == 0:
                logger.error("❌ No categories found - seeding may have failed")
                return False
            if counts["Services"] == 0:
                logger.error("❌ No services found - seeding may have failed")
                return False
            if counts["Users"] == 0:
                logger.error("❌ No users found - dev user creation may have failed")
                return False

            logger.info("✅ Database seeding verification passed")
            return True

        finally:
            db.close()

    except Exception as e:
        logger.error(f"❌ Verification failed: {e}")
        return False


def main():
    """Main seeding function"""
    parser = argparse.ArgumentParser(
        description="Seed all database data for Mestermind"
    )
    parser.add_argument(
        "--force", action="store_true", help="Force re-seeding even if data exists"
    )
    parser.add_argument(
        "--skip-migrations", action="store_true", help="Skip database migrations"
    )
    parser.add_argument(
        "--skip-locations", action="store_true", help="Skip Hungary locations seeding"
    )
    parser.add_argument(
        "--skip-services", action="store_true", help="Skip services import"
    )
    parser.add_argument(
        "--skip-price-bands", action="store_true", help="Skip price bands seeding"
    )
    parser.add_argument(
        "--skip-question-sets", action="store_true", help="Skip question sets seeding"
    )
    parser.add_argument(
        "--skip-dev-user", action="store_true", help="Skip dev user creation"
    )
    parser.add_argument(
        "--skip-categories-json",
        action="store_true",
        help="Skip categories from JSON seeding",
    )

    args = parser.parse_args()

    logger.info("🚀 Starting Mestermind database seeding...")
    logger.info("=" * 60)

    # Check database connection
    if not check_database_connection():
        logger.error("❌ Cannot connect to database. Make sure PostgreSQL is running.")
        sys.exit(1)

    # Run migrations unless skipped
    if not args.skip_migrations:
        if not run_migrations():
            logger.warning("⚠️  Migrations failed, but continuing with seeding...")
    else:
        logger.info("⏭️  Skipping migrations")

    # Seed data in order
    seeding_steps = [
        ("Initial data", seed_initial_data),
        (
            "Categories from JSON",
            seed_categories_from_json if not args.skip_categories_json else None,
        ),
        (
            "Hungary locations",
            seed_hungary_locations if not args.skip_locations else None,
        ),
        ("Services import", import_services if not args.skip_services else None),
        ("Price bands", seed_price_bands if not args.skip_price_bands else None),
        ("Question sets", seed_question_sets if not args.skip_question_sets else None),
        ("Taxonomy derivatives", generate_taxonomy_derivatives),
        ("Dev user creation", create_dev_user if not args.skip_dev_user else None),
    ]

    failed_steps = []

    for step_name, step_func in seeding_steps:
        if step_func is None:
            logger.info(f"⏭️  Skipping {step_name}")
            continue

        if not step_func():
            failed_steps.append(step_name)
            if not args.force:
                logger.error(
                    f"❌ {step_name} failed. Use --force to continue despite errors."
                )
                break

    # Verify seeding
    if not verify_seeding():
        failed_steps.append("Verification")

    # Summary
    logger.info("=" * 60)
    if failed_steps:
        logger.error(f"❌ Seeding completed with errors in: {', '.join(failed_steps)}")
        sys.exit(1)
    else:
        logger.info("🎉 Database seeding completed successfully!")
        logger.info("")
        logger.info("Next steps:")
        logger.info("1. Start the API server: python main.py")
        logger.info("2. Start the client: cd ../client && npm run dev")
        logger.info("3. Login with dev-mester@gmail.com")


if __name__ == "__main__":
    main()
