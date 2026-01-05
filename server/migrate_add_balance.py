#!/usr/bin/env python3
"""
Migration script to add balance_huf column to pro_profiles table
and create balance_transactions table
"""
import sys
from pathlib import Path

# Add the server directory to the path
server_dir = Path(__file__).parent
sys.path.insert(0, str(server_dir))

from sqlalchemy import text, inspect
from app.db.session import engine, SessionLocal, Base

def migrate():
    """Add balance_huf column and create balance_transactions table"""
    print("Starting migration...")
    
    # Create a connection
    with engine.connect() as conn:
        # Check if balance_huf column exists
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('pro_profiles')]
        
        if 'balance_huf' not in columns:
            print("Adding balance_huf column to pro_profiles table...")
            conn.execute(text('ALTER TABLE pro_profiles ADD COLUMN balance_huf INTEGER DEFAULT 0 NOT NULL'))
            conn.commit()
            print("✓ Added balance_huf column")
        else:
            print("✓ balance_huf column already exists")
        
        # Create balance_transactions table if it doesn't exist
        if 'balance_transactions' not in inspector.get_table_names():
            print("Creating balance_transactions table...")
            from app.models.balance_transaction import BalanceTransaction
            BalanceTransaction.__table__.create(bind=engine, checkfirst=True)
            print("✓ Created balance_transactions table")
        else:
            print("✓ balance_transactions table already exists")
    
    print("\nMigration completed successfully!")

if __name__ == "__main__":
    migrate()

