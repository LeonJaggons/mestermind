#!/usr/bin/env python
"""
Script to delete all non-seed data from the database
Preserves: categories, services, cities (seed data)
Deletes: all user-generated data
"""
import sys
import os

# Add the server directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
# Import all models
from app.models.category import Category
from app.models.service import Service
from app.models.city import City
from app.models.user import User
from app.models.pro_profile import ProProfile
from app.models.pro_service import ProService
from app.models.customer_profile import CustomerProfile
from app.models.job import Job
from app.models.invitation import Invitation
from app.models.review import Review
from app.models.project import Project
from app.models.message import Message
from app.models.balance_transaction import BalanceTransaction
from app.models.appointment import Appointment
from app.models.subscription import Subscription
from app.models.faq import FAQ
from app.models.profile_view import ProfileView
from app.models.archived_conversation import ArchivedConversation
from app.models.starred_conversation import StarredConversation
from app.models.lead_purchase import LeadPurchase


def clear_non_seed_data():
    """Delete all non-seed data while preserving categories, services, and cities"""
    db = SessionLocal()
    
    try:
        print("Starting to clear non-seed data...")
        
        # Delete in order to respect foreign key constraints
        # Start with tables that have foreign keys to other user-generated tables
        
        print("Deleting archived conversations...")
        db.query(ArchivedConversation).delete()
        
        print("Deleting starred conversations...")
        db.query(StarredConversation).delete()
        
        print("Deleting messages...")
        db.query(Message).delete()
        
        print("Deleting appointments...")
        db.query(Appointment).delete()
        
        print("Deleting reviews...")
        db.query(Review).delete()
        
        print("Deleting projects...")
        db.query(Project).delete()
        
        print("Deleting FAQs...")
        db.query(FAQ).delete()
        
        print("Deleting profile views...")
        db.query(ProfileView).delete()
        
        print("Deleting lead purchases...")
        db.query(LeadPurchase).delete()
        
        print("Deleting balance transactions...")
        db.query(BalanceTransaction).delete()
        
        print("Deleting subscriptions...")
        db.query(Subscription).delete()
        
        print("Deleting invitations...")
        db.query(Invitation).delete()
        
        print("Deleting jobs...")
        db.query(Job).delete()
        
        print("Deleting pro services (relationships)...")
        db.query(ProService).delete()
        
        print("Deleting pro profiles...")
        db.query(ProProfile).delete()
        
        print("Deleting customer profiles...")
        db.query(CustomerProfile).delete()
        
        print("Deleting users...")
        db.query(User).delete()
        
        # Commit all deletions
        db.commit()
        
        print("\n✅ Successfully cleared all non-seed data!")
        print("Preserved: Categories, Services, Cities (seed data)")
        
        # Show counts of preserved data
        category_count = db.query(Category).count()
        service_count = db.query(Service).count()
        city_count = db.query(City).count()
        
        print(f"\nPreserved seed data:")
        print(f"  - Categories: {category_count}")
        print(f"  - Services: {service_count}")
        print(f"  - Cities: {city_count}")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error clearing data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    # Confirm before proceeding
    print("⚠️  WARNING: This will delete ALL non-seed data from the database!")
    print("This includes:")
    print("  - All users")
    print("  - All pro profiles")
    print("  - All jobs")
    print("  - All messages")
    print("  - All reviews")
    print("  - All appointments")
    print("  - And all other user-generated data")
    print("\nSeed data (categories, services, cities) will be preserved.")
    
    response = input("\nAre you sure you want to proceed? (yes/no): ")
    if response.lower() == "yes":
        clear_non_seed_data()
    else:
        print("Operation cancelled.")







