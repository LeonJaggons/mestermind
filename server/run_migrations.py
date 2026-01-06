#!/usr/bin/env python3
"""
Run migrations and ensure columns are added even if alembic state is incorrect
"""
import os
import sys
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv

load_dotenv()

def main():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)
    
    print(f"Connecting to database...")
    engine = create_engine(database_url)
    
    with engine.connect() as conn:
        # Check if columns exist
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('pro_profiles')]
        
        print(f"Current columns in pro_profiles: {columns}")
        
        needs_phone = 'phone' not in columns
        needs_website = 'website' not in columns
        
        if needs_phone or needs_website:
            print("Missing columns detected, adding them...")
            
            if needs_phone:
                print("Adding 'phone' column...")
                conn.execute(text("ALTER TABLE pro_profiles ADD COLUMN phone VARCHAR NULL"))
                conn.commit()
                print("✓ Added 'phone' column")
            
            if needs_website:
                print("Adding 'website' column...")
                conn.execute(text("ALTER TABLE pro_profiles ADD COLUMN website VARCHAR NULL"))
                conn.commit()
                print("✓ Added 'website' column")
        else:
            print("✓ All columns already exist")
    
    # Now run alembic to update state
    print("\nRunning alembic migrations...")
    import subprocess
    result = subprocess.run(["alembic", "upgrade", "head"], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    
    if result.returncode != 0:
        print("Warning: Alembic migration had issues, but columns were added directly")
    else:
        print("✓ Alembic state updated")

if __name__ == "__main__":
    main()
