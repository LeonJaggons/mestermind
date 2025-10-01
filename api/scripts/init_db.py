#!/usr/bin/env python3
"""
Database initialization script for Mestermind API
This script creates tables and seeds initial data for categories and subcategories
"""

import os
import sys

# Add the parent directory to Python path so we can import from app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import sessionmaker
from app.core.database import engine, create_tables
from app.models.database import Category, Subcategory
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def seed_initial_data():
    """Seed initial data into the database"""
    db = SessionLocal()
    try:
        # Check if categories already exist
        existing_categories = db.query(Category).count()
        if existing_categories > 0:
            logger.info("📋 Categories already exist, skipping seed data")
            return

        # Create initial service categories
        categories_data = [
            {
                "name": "Home Repair",
                "description": "General home maintenance and repair services",
                "icon": "home-repair",
                "sort_order": 1,
                "subcategories": [
                    {"name": "Plumbing", "description": "Plumbing installation, repair, and maintenance", "sort_order": 1},
                    {"name": "Electrical", "description": "Electrical installation, repair, and maintenance", "sort_order": 2},
                    {"name": "HVAC", "description": "Heating, ventilation, and air conditioning services", "sort_order": 3},
                    {"name": "General Handyman", "description": "General home repair and maintenance", "sort_order": 4}
                ]
            },
            {
                "name": "Cleaning Services",
                "description": "Residential and commercial cleaning services",
                "icon": "cleaning",
                "sort_order": 2,
                "subcategories": [
                    {"name": "House Cleaning", "description": "Regular and deep house cleaning", "sort_order": 1},
                    {"name": "Office Cleaning", "description": "Commercial office cleaning services", "sort_order": 2},
                    {"name": "Carpet Cleaning", "description": "Professional carpet and upholstery cleaning", "sort_order": 3},
                    {"name": "Window Cleaning", "description": "Interior and exterior window cleaning", "sort_order": 4}
                ]
            },
            {
                "name": "Landscaping",
                "description": "Garden maintenance and landscaping services",
                "icon": "landscaping",
                "sort_order": 3,
                "subcategories": [
                    {"name": "Lawn Care", "description": "Lawn mowing, fertilizing, and maintenance", "sort_order": 1},
                    {"name": "Garden Design", "description": "Garden planning and design services", "sort_order": 2},
                    {"name": "Tree Services", "description": "Tree trimming, removal, and maintenance", "sort_order": 3},
                    {"name": "Irrigation", "description": "Sprinkler system installation and repair", "sort_order": 4}
                ]
            },
            {
                "name": "Event Planning",
                "description": "Complete event planning and coordination services",
                "icon": "event-planning",
                "sort_order": 4,
                "subcategories": [
                    {"name": "Wedding Planning", "description": "Complete wedding planning and coordination", "sort_order": 1},
                    {"name": "Corporate Events", "description": "Business event planning and management", "sort_order": 2},
                    {"name": "Birthday Parties", "description": "Birthday party planning and coordination", "sort_order": 3},
                    {"name": "Holiday Events", "description": "Holiday party planning and decoration", "sort_order": 4}
                ]
            },
            {
                "name": "Moving Services",
                "description": "Professional moving and relocation services",
                "icon": "moving",
                "sort_order": 5,
                "subcategories": [
                    {"name": "Local Moving", "description": "Local residential and office moving", "sort_order": 1},
                    {"name": "Long Distance Moving", "description": "Interstate and long-distance moving", "sort_order": 2},
                    {"name": "Packing Services", "description": "Professional packing and unpacking", "sort_order": 3},
                    {"name": "Storage Solutions", "description": "Temporary and long-term storage options", "sort_order": 4}
                ]
            }
        ]

        for category_data in categories_data:
            # Create category
            category = Category(
                name=category_data["name"],
                description=category_data["description"],
                icon=category_data["icon"],
                sort_order=category_data["sort_order"]
            )
            db.add(category)
            db.flush()  # Get the ID
            
            # Create subcategories
            for subcategory_data in category_data["subcategories"]:
                subcategory = Subcategory(
                    category_id=category.id,
                    name=subcategory_data["name"],
                    description=subcategory_data["description"],
                    sort_order=subcategory_data["sort_order"]
                )
                db.add(subcategory)

        db.commit()
        logger.info("✅ Initial categories and subcategories seeded successfully")

    except Exception as e:
        logger.error(f"❌ Error seeding initial data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def check_database_connection():
    """Check if database is accessible"""
    try:
        with engine.connect() as connection:
            from sqlalchemy import text
            connection.execute(text("SELECT 1"))
        logger.info("✅ Database connection successful")
        return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False


def main():
    """Main initialization function"""
    logger.info("🚀 Starting Mestermind database initialization...")

    # Check database connection
    if not check_database_connection():
        logger.error("❌ Cannot connect to database. Make sure PostgreSQL is running.")
        sys.exit(1)

    # Create tables
    create_tables()

    # Seed initial data
    seed_initial_data()

    logger.info("🎉 Database initialization completed successfully!")


if __name__ == "__main__":
    main()