#!/usr/bin/env python
"""
Seed script to populate database with categories, services, and cities
"""
import sys
import os
import json

# Add the server directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, engine, Base
# Import all models to ensure relationships are properly configured
from app.models.category import Category
from app.models.service import Service
from app.models.city import City
from app.models.user import User
from app.models.pro_profile import ProProfile
from app.models.pro_service import ProService
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
from app.models.customer_profile import CustomerProfile
from app.models.lead_purchase import LeadPurchase


def load_json_file(filename):
    """Load data from JSON file in app/data directory"""
    json_path = os.path.join(os.path.dirname(__file__), "app", "data", filename)
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def seed_database():
    """Seed the database with categories, services, and cities"""
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    db = SessionLocal()
    
    try:
        # Check if data already exists
        existing_categories = db.query(Category).count()
        existing_cities = db.query(City).count()
        
        if existing_categories > 0 or existing_cities > 0:
            print(f"Database already contains {existing_categories} categories and {existing_cities} cities.")
            response = input("Do you want to clear and reseed? (yes/no): ")
            if response.lower() != "yes":
                print("Seeding cancelled.")
                return
            
            # Clear existing data
            print("Clearing existing data...")
            db.query(Service).delete()
            db.query(Category).delete()
            db.query(City).delete()
            db.commit()
        
        print("Seeding database with categories, services, and cities...")
        
        # Seed cities
        print("\n--- Seeding Cities ---")
        cities_data = load_json_file("cities.json")
        for city_data in cities_data:
            city = City(**city_data)
            db.add(city)
        
        db.commit()
        print(f"✓ Added {len(cities_data)} cities")
        
        # Seed categories
        print("\n--- Seeding Categories ---")
        categories_data = load_json_file("categories.json")
        category_name_to_id = {}
        
        for category_data in categories_data:
            category = Category(**category_data)
            db.add(category)
            category_name_to_id[category.name] = category.id
            print(f"✓ Added category: {category.name}")
        
        db.commit()
        
        # Seed services
        print("\n--- Seeding Services ---")
        services_data = load_json_file("services_with_hu.json")
        services_by_category = {}
        
        for service_data in services_data:
            category_name = service_data.pop("category", None)
            
            if not category_name:
                print(f"⚠ Warning: Service '{service_data.get('name')}' has no category, skipping")
                continue
            
            category_id = category_name_to_id.get(category_name)
            
            if category_id is None:
                print(f"⚠ Warning: Category '{category_name}' not found, skipping service '{service_data.get('name')}'")
                continue
            
            service = Service(
                category_id=category_id,
                **service_data
            )
            db.add(service)
            
            services_by_category[category_name] = services_by_category.get(category_name, 0) + 1
        
        db.commit()
        
        for category_name, count in services_by_category.items():
            print(f"✓ Added {count} services to {category_name}")
        
        # Commit all changes
        db.commit()
        
        # Print summary
        total_categories = db.query(Category).count()
        total_services = db.query(Service).count()
        total_cities = db.query(City).count()
        
        print("\n" + "="*50)
        print("Seeding completed successfully!")
        print(f"Total cities: {total_cities}")
        print(f"Total categories: {total_categories}")
        print(f"Total services: {total_services}")
        print("="*50)
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
