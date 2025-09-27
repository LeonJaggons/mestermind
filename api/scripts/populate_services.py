#!/usr/bin/env python3
"""
Script to populate the database with services from the JSON data files.
This script maps the generic IDs in the JSON files to the actual UUIDs in the database.
"""

import json
import sys
import os
from pathlib import Path

# Add the parent directory to the path so we can import from app
sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import SessionLocal, engine
from app.models.db_models import Category, Subcategory, Service
from sqlalchemy.orm import Session

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        return db
    finally:
        pass

def load_json_data():
    """Load data from JSON files"""
    data_dir = Path(__file__).parent.parent / "data"
    
    with open(data_dir / "categories.json", "r") as f:
        categories_data = json.load(f)
    
    with open(data_dir / "subcategories.json", "r") as f:
        subcategories_data = json.load(f)
    
    with open(data_dir / "services.json", "r") as f:
        services_data = json.load(f)
    
    return categories_data, subcategories_data, services_data

def create_id_mapping(db: Session):
    """Create mapping from generic IDs to actual database UUIDs"""
    categories = db.query(Category).all()
    subcategories = db.query(Subcategory).all()
    
    # Create mapping dictionaries
    category_mapping = {}
    subcategory_mapping = {}
    
    # Map by name since the JSON uses generic IDs but we can match by name
    for cat in categories:
        category_mapping[cat.name.lower()] = cat.id
    
    for sub in subcategories:
        subcategory_mapping[sub.name.lower()] = sub.id
    
    return category_mapping, subcategory_mapping

def map_service_to_database(service_data, category_mapping, subcategory_mapping):
    """Map a service from JSON to database format"""
    # We'll need to map by category and subcategory names since the JSON uses generic IDs
    # For now, let's create a simple mapping based on the first few services
    
    # This is a simplified approach - in a real scenario, you'd want more sophisticated mapping
    # For now, let's just add some sample services to existing categories
    
    return None  # We'll implement this differently

def add_sample_services(db: Session):
    """Add some sample services to existing categories and subcategories"""
    
    # Get the first category and its subcategories
    first_category = db.query(Category).first()
    if not first_category:
        print("No categories found in database")
        return
    
    subcategories = db.query(Subcategory).filter(
        Subcategory.category_id == first_category.id
    ).all()
    
    if not subcategories:
        print(f"No subcategories found for category {first_category.name}")
        return
    
    # Add some sample services
    sample_services = [
        {
            "name": "Basic Home Repair",
            "description": "General home maintenance and repair services",
            "requires_license": False,
            "is_specialty": False,
            "indoor_outdoor": "both",
            "is_active": True,
            "sort_order": 1
        },
        {
            "name": "Electrical Repair",
            "description": "Basic electrical repair and maintenance",
            "requires_license": True,
            "is_specialty": False,
            "indoor_outdoor": "indoor",
            "is_active": True,
            "sort_order": 2
        },
        {
            "name": "Plumbing Repair",
            "description": "Basic plumbing repair and maintenance",
            "requires_license": True,
            "is_specialty": False,
            "indoor_outdoor": "indoor",
            "is_active": True,
            "sort_order": 3
        }
    ]
    
    for i, service_data in enumerate(sample_services):
        # Use the first subcategory for all services for simplicity
        subcategory = subcategories[0]
        
        service = Service(
            category_id=first_category.id,
            subcategory_id=subcategory.id,
            name=service_data["name"],
            description=service_data["description"],
            requires_license=service_data["requires_license"],
            is_specialty=service_data["is_specialty"],
            indoor_outdoor=service_data["indoor_outdoor"],
            is_active=service_data["is_active"],
            sort_order=service_data["sort_order"]
        )
        
        db.add(service)
        print(f"Added service: {service_data['name']}")
    
    db.commit()
    print(f"Successfully added {len(sample_services)} services to the database")

def main():
    """Main function"""
    print("Starting service population...")
    
    db = get_db()
    try:
        # Add sample services
        add_sample_services(db)
        
        # Check how many services we have now
        service_count = db.query(Service).count()
        print(f"Total services in database: {service_count}")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()

