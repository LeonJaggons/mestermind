#!/usr/bin/env python
"""
Migration script to add name_hu columns to categories and services tables
"""
import sys
import os

# Add the server directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, engine
from sqlalchemy import text


def migrate():
    """Add name_hu columns to categories and services tables"""
    db = SessionLocal()
    
    try:
        print("Starting migration to add name_hu columns...")
        
        # Check if columns already exist
        with engine.connect() as conn:
            # Check categories table
            result = conn.execute(text("PRAGMA table_info(categories)"))
            categories_columns = [row[1] for row in result]
            
            # Check services table
            result = conn.execute(text("PRAGMA table_info(services)"))
            services_columns = [row[1] for row in result]
        
        # Add name_hu to categories if it doesn't exist
        if "name_hu" not in categories_columns:
            print("Adding name_hu column to categories table...")
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE categories ADD COLUMN name_hu VARCHAR"))
                conn.commit()
            print("✓ Added name_hu column to categories")
        else:
            print("✓ name_hu column already exists in categories")
        
        # Add name_hu to services if it doesn't exist
        if "name_hu" not in services_columns:
            print("Adding name_hu column to services table...")
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE services ADD COLUMN name_hu VARCHAR"))
                conn.commit()
            print("✓ Added name_hu column to services")
        else:
            print("✓ name_hu column already exists in services")
        
        print("\nMigration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
