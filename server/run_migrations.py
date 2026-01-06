#!/usr/bin/env python3
"""
Run Alembic migrations with fallback for manual column additions
"""
import os
import sys
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv
import subprocess

load_dotenv()

def check_and_add_missing_columns(engine):
    """
    Fallback: Check for known missing columns and add them manually
    This handles cases where alembic state is out of sync
    """
    with engine.connect() as conn:
        inspector = inspect(engine)
        
        # Check pro_profiles table
        try:
            columns = [col['name'] for col in inspector.get_columns('pro_profiles')]
            print(f"Current columns in pro_profiles: {columns}")
            
            # Known migrations that might be out of sync
            fixes_applied = False
            
            if 'phone' not in columns:
                print("Adding missing 'phone' column...")
                conn.execute(text("ALTER TABLE pro_profiles ADD COLUMN phone VARCHAR NULL"))
                conn.commit()
                print("✓ Added 'phone' column")
                fixes_applied = True
            
            if 'website' not in columns:
                print("Adding missing 'website' column...")
                conn.execute(text("ALTER TABLE pro_profiles ADD COLUMN website VARCHAR NULL"))
                conn.commit()
                print("✓ Added 'website' column")
                fixes_applied = True
            
            if not fixes_applied:
                print("✓ No missing columns detected")
                
        except Exception as e:
            print(f"Note: Could not check pro_profiles columns: {e}")

def main():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)
    
    print("="*60)
    print("Running database migrations")
    print("="*60)
    
    engine = create_engine(database_url)
    
    # First, run standard Alembic migrations
    print("\n[1/2] Running Alembic migrations...")
    result = subprocess.run(
        ["alembic", "upgrade", "head"], 
        capture_output=True, 
        text=True,
        cwd=os.path.dirname(os.path.abspath(__file__))
    )
    
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    
    alembic_success = result.returncode == 0
    
    if alembic_success:
        print("✓ Alembic migrations completed successfully")
    else:
        print("⚠ Alembic had issues, attempting manual fixes...")
    
    # Then check for any missing columns as a fallback
    print("\n[2/2] Checking for missing columns...")
    check_and_add_missing_columns(engine)
    
    print("\n" + "="*60)
    print("Migration process complete")
    print("="*60)
    
    sys.exit(0 if alembic_success else 1)

if __name__ == "__main__":
    main()
