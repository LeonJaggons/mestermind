#!/usr/bin/env python3
"""
Script to import services from thumbtack_handyman_services_full.json
This script will:
1. Clear existing services, subcategories, and categories
2. Create new categories and subcategories from the JSON data
3. Import all services with proper categorization
"""

import json
import sys
import os
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import text

# Add the parent directory to the path so we can import our modules
sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import get_db
from app.models.database import Service, Category, Subcategory, MesterService, MesterProfileService, QuestionSet, Question, Request, RequestAvailability, Offer, MessageThread, Message, Notification, NotificationLog
from app.core.database import engine
from sqlalchemy.orm import sessionmaker

def load_services_data():
    """Load services data from JSON file"""
    data_dir = Path(__file__).parent.parent / "data"
    
    # Try different possible service data files
    possible_files = [
        "thumbtack_handyman_services_full.json",
        "mestermind-services-taxonomy.json"
    ]
    
    json_path = None
    for filename in possible_files:
        file_path = data_dir / filename
        if file_path.exists():
            json_path = file_path
            break
    
    if not json_path:
        raise FileNotFoundError(f"No services JSON file found. Checked: {possible_files}")
    
    print(f"📄 Loading services data from: {json_path.name}")
    
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def clear_existing_data(db: Session):
    """Clear existing services, subcategories, and categories"""
    print("🗑️  Clearing existing data...")
    
    # Delete in order due to foreign key constraints
    # First delete questions that reference question_sets
    deleted_questions = db.query(Question).delete()
    print(f"   Deleted {deleted_questions} questions")
    
    # Delete notification_logs that reference notifications
    deleted_notification_logs = db.query(NotificationLog).delete()
    print(f"   Deleted {deleted_notification_logs} notification logs")
    
    # Delete notifications that reference requests
    deleted_notifications = db.query(Notification).delete()
    print(f"   Deleted {deleted_notifications} notifications")
    
    # Delete messages that reference message_threads
    deleted_messages = db.query(Message).delete()
    print(f"   Deleted {deleted_messages} messages")
    
    # Delete message_threads that reference requests
    deleted_message_threads = db.query(MessageThread).delete()
    print(f"   Deleted {deleted_message_threads} message threads")
    
    # Delete offers that reference requests
    deleted_offers = db.query(Offer).delete()
    print(f"   Deleted {deleted_offers} offers")
    
    # Delete request_availability that reference requests
    deleted_request_availability = db.query(RequestAvailability).delete()
    print(f"   Deleted {deleted_request_availability} request availability records")
    
    # Delete requests that reference question_sets
    deleted_requests = db.query(Request).delete()
    print(f"   Deleted {deleted_requests} requests")
    
    # Delete question sets that reference services
    deleted_question_sets = db.query(QuestionSet).delete()
    print(f"   Deleted {deleted_question_sets} question sets")
    
    # Delete mester service relationships
    deleted_mester_services = db.query(MesterService).delete()
    print(f"   Deleted {deleted_mester_services} mester service relationships")
    
    # Delete mester profile service relationships
    deleted_profile_services = db.query(MesterProfileService).delete()
    print(f"   Deleted {deleted_profile_services} mester profile service relationships")
    
    # Now delete services (they reference subcategories)
    deleted_services = db.query(Service).delete()
    print(f"   Deleted {deleted_services} services")
    
    # Delete subcategories (they reference categories)
    deleted_subcategories = db.query(Subcategory).delete()
    print(f"   Deleted {deleted_subcategories} subcategories")
    
    # Finally delete categories
    deleted_categories = db.query(Category).delete()
    print(f"   Deleted {deleted_categories} categories")
    
    db.commit()
    print("✅ Existing data cleared successfully")

def create_categories_and_subcategories(db: Session, services_data):
    """Create categories and subcategories from the services data"""
    print("📁 Creating categories and subcategories...")
    
    # Extract unique categories and subcategories
    categories_map = {}
    
    for service in services_data:
        category_name = service["category"]
        subcategory_name = service["subcategory"]
        
        if category_name not in categories_map:
            categories_map[category_name] = {
                "subcategories": set(),
                "sort_order": len(categories_map) + 1
            }
        
        categories_map[category_name]["subcategories"].add(subcategory_name)
    
    # Create categories and subcategories
    category_objects = {}
    subcategory_objects = {}
    
    for category_name, category_data in categories_map.items():
        # Create category
        category = Category(
            name=category_name,
            description=f"Services related to {category_name.lower()}",
            icon=category_name.lower().replace(" ", "-").replace("/", "-"),
            sort_order=category_data["sort_order"]
        )
        db.add(category)
        db.flush()  # Get the ID
        category_objects[category_name] = category
        
        # Create subcategories for this category
        subcategory_sort_order = 1
        for subcategory_name in sorted(category_data["subcategories"]):
            subcategory = Subcategory(
                category_id=category.id,
                name=subcategory_name,
                description=f"{subcategory_name} services within {category_name.lower()}",
                sort_order=subcategory_sort_order
            )
            db.add(subcategory)
            db.flush()  # Get the ID
            subcategory_objects[(category_name, subcategory_name)] = subcategory
            subcategory_sort_order += 1
    
    db.commit()
    print(f"✅ Created {len(category_objects)} categories and {len(subcategory_objects)} subcategories")
    
    return category_objects, subcategory_objects

def import_services(db: Session, services_data, category_objects, subcategory_objects):
    """Import all services with proper categorization"""
    print("🔧 Importing services...")
    
    imported_count = 0
    skipped_count = 0
    
    for service_data in services_data:
        category_name = service_data["category"]
        subcategory_name = service_data["subcategory"]
        service_name = service_data["service"]
        
        # Get category and subcategory objects
        category = category_objects.get(category_name)
        subcategory = subcategory_objects.get((category_name, subcategory_name))
        
        if not category or not subcategory:
            print(f"⚠️  Skipping service '{service_name}' - category/subcategory not found")
            skipped_count += 1
            continue
        
        # Check if service already exists
        existing_service = db.query(Service).filter(
            Service.name == service_name,
            Service.category_id == category.id,
            Service.subcategory_id == subcategory.id
        ).first()
        
        if existing_service:
            print(f"⚠️  Skipping duplicate service '{service_name}'")
            skipped_count += 1
            continue
        
        # Create service
        service = Service(
            category_id=category.id,
            subcategory_id=subcategory.id,
            name=service_name,
            description=f"Professional {service_name.lower()} services",
            requires_license=service_data["requires_license"],
            is_specialty=service_data["is_specialty"],
            indoor_outdoor=service_data["indoor_outdoor"],
            is_active=True,
            sort_order=imported_count + 1
        )
        
        db.add(service)
        imported_count += 1
        
        if imported_count % 50 == 0:
            print(f"   Imported {imported_count} services...")
    
    db.commit()
    print(f"✅ Successfully imported {imported_count} services")
    if skipped_count > 0:
        print(f"⚠️  Skipped {skipped_count} services (duplicates or missing categories)")

def verify_import(db: Session):
    """Verify the import was successful"""
    print("🔍 Verifying import...")
    
    category_count = db.query(Category).count()
    subcategory_count = db.query(Subcategory).count()
    service_count = db.query(Service).count()
    
    print(f"📊 Final counts:")
    print(f"   Categories: {category_count}")
    print(f"   Subcategories: {subcategory_count}")
    print(f"   Services: {service_count}")
    
    # Show some sample data
    print(f"\n📋 Sample categories:")
    categories = db.query(Category).order_by(Category.sort_order).limit(5).all()
    for category in categories:
        subcategory_count = db.query(Subcategory).filter(Subcategory.category_id == category.id).count()
        service_count = db.query(Service).filter(Service.category_id == category.id).count()
        print(f"   - {category.name} ({subcategory_count} subcategories, {service_count} services)")
    
    print(f"\n📋 Sample services:")
    services = db.query(Service).join(Category).join(Subcategory).limit(5).all()
    for service in services:
        print(f"   - {service.name} ({service.category.name} → {service.subcategory.name})")

def main():
    """Main function to run the import process"""
    print("🚀 Starting services import process...")
    print("=" * 50)
    
    try:
        # Load services data
        services_data = load_services_data()
        print(f"📄 Loaded {len(services_data)} services from JSON file")
        
        # Get database session
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # Clear existing data
            clear_existing_data(db)
            
            # Create categories and subcategories
            category_objects, subcategory_objects = create_categories_and_subcategories(db, services_data)
            
            # Import services
            import_services(db, services_data, category_objects, subcategory_objects)
            
            # Verify import
            verify_import(db)
            
            print("\n" + "=" * 50)
            print("🎉 Services import completed successfully!")
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error during import: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
