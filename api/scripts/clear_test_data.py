#!/usr/bin/env python3
"""
Script to delete ALL users and mesters from the database
Use with caution!
"""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Create engine from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ Error: DATABASE_URL not found in environment")
    print(f"   Looked for .env file at: {env_path}")
    sys.exit(1)

engine = create_engine(DATABASE_URL)


def clear_all_users_and_mesters():
    """Delete all users and mesters from the database"""
    print("⚠️  WARNING: This will delete ALL users and mesters from the database!")
    print("   This action cannot be undone.")
    
    response = input("\nAre you sure you want to continue? (yes/no): ")
    
    if response.lower() != 'yes':
        print("❌ Operation cancelled")
        sys.exit(0)
    
    print("\n🗑️  Deleting all users and mesters...")
    
    try:
        with engine.connect() as conn:
            # Start a transaction
            trans = conn.begin()
            
            try:
                # Use TRUNCATE CASCADE to delete everything related to mesters and users
                # This handles all foreign key constraints automatically
                
                print("   Truncating mester-related tables...")
                conn.execute(text("TRUNCATE TABLE mesters CASCADE"))
                
                print("   Truncating user-related tables...")
                conn.execute(text("TRUNCATE TABLE users CASCADE"))
                
                # Commit the transaction
                trans.commit()
                
                # Get counts of what was deleted
                result = conn.execute(text("SELECT 0"))  # Dummy query to ensure connection is good
                
                print("\n✅ Successfully deleted all users and mesters!")
                print("   All related data has been removed via CASCADE")
                
            except Exception as e:
                trans.rollback()
                raise e
            
    except Exception as e:
        print(f"\n❌ Error during deletion: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    clear_all_users_and_mesters()
