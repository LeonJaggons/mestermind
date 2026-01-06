#!/usr/bin/env python3
"""
Migration script to add phone and website columns to pro_profiles table.
"""

import sys
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def migrate():
    """Add phone and website columns to pro_profiles table."""
    print("Starting migration: Adding phone and website columns to pro_profiles")
    
    database_url = os.getenv('DATABASE_URL', 'sqlite:///./app.db')
    engine = create_engine(database_url)
    
    with engine.connect() as conn:
        # Check if columns already exist
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'pro_profiles' 
            AND column_name IN ('phone', 'website')
        """))
        existing_columns = [row[0] for row in result]
        
        # Add phone column if it doesn't exist
        if 'phone' not in existing_columns:
            print("Adding 'phone' column...")
            conn.execute(text("""
                ALTER TABLE pro_profiles 
                ADD COLUMN phone VARCHAR NULL
            """))
            conn.commit()
            print("✓ Added 'phone' column")
        else:
            print("'phone' column already exists")
        
        # Add website column if it doesn't exist
        if 'website' not in existing_columns:
            print("Adding 'website' column...")
            conn.execute(text("""
                ALTER TABLE pro_profiles 
                ADD COLUMN website VARCHAR NULL
            """))
            conn.commit()
            print("✓ Added 'website' column")
        else:
            print("'website' column already exists")
    
    print("Migration completed successfully!")


if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"Error during migration: {e}", file=sys.stderr)
        sys.exit(1)
