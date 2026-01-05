#!/usr/bin/env python3
"""
Script to delete all leads, jobs, invitations, and messages from the database
"""
import sys
from pathlib import Path

# Add the server directory to the path
server_dir = Path(__file__).parent
sys.path.insert(0, str(server_dir))

from app.db.session import SessionLocal
# Import all models to ensure relationships are properly initialized
from app.models.user import User
from app.models.pro_profile import ProProfile
from app.models.pro_service import ProService
from app.models.lead_purchase import LeadPurchase
from app.models.job import Job
from app.models.invitation import Invitation
from app.models.message import Message

def cleanup_data():
    """Delete all leads, jobs, invitations, and messages"""
    print("Starting data cleanup...")
    
    db = SessionLocal()
    
    try:
        # Count records before deletion
        lead_count = db.query(LeadPurchase).count()
        job_count = db.query(Job).count()
        invitation_count = db.query(Invitation).count()
        message_count = db.query(Message).count()
        
        print(f"\nCurrent records:")
        print(f"  - Lead Purchases: {lead_count}")
        print(f"  - Jobs: {job_count}")
        print(f"  - Invitations: {invitation_count}")
        print(f"  - Messages: {message_count}")
        
        if lead_count == 0 and job_count == 0 and invitation_count == 0 and message_count == 0:
            print("\n✓ No records to delete. Database is already clean.")
            return
        
        # Delete in order (respecting foreign key constraints)
        # Note: Due to CASCADE relationships, deleting jobs will also delete
        # messages, invitations, and lead_purchases, but we'll delete explicitly for clarity
        
        print("\nDeleting records...")
        
        # Delete lead purchases
        if lead_count > 0:
            deleted_leads = db.query(LeadPurchase).delete()
            print(f"✓ Deleted {deleted_leads} lead purchases")
        
        # Delete messages
        if message_count > 0:
            deleted_messages = db.query(Message).delete()
            print(f"✓ Deleted {deleted_messages} messages")
        
        # Delete invitations
        if invitation_count > 0:
            deleted_invitations = db.query(Invitation).delete()
            print(f"✓ Deleted {deleted_invitations} invitations")
        
        # Delete jobs (this will cascade delete related records if any remain)
        if job_count > 0:
            deleted_jobs = db.query(Job).delete()
            print(f"✓ Deleted {deleted_jobs} jobs")
        
        db.commit()
        
        print("\n✓ Data cleanup completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"\n✗ Error during cleanup: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_data()

