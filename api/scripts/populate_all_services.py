#!/usr/bin/env python3
"""
Script to populate the database with ALL services from the JSON data files.
This script maps the generic IDs in the JSON files to the actual UUIDs in the database.
"""

import requests
import json
from pathlib import Path

API_BASE_URL = "http://localhost:8000"

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

def get_database_categories():
    """Get all categories from the database"""
    response = requests.get(f"{API_BASE_URL}/categories/")
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error getting categories: {response.status_code}")
        return []

def get_database_subcategories():
    """Get all subcategories from the database by fetching each category"""
    categories = get_database_categories()
    all_subcategories = []
    
    for category in categories:
        response = requests.get(f"{API_BASE_URL}/categories/{category['id']}")
        if response.status_code == 200:
            category_data = response.json()
            all_subcategories.extend(category_data.get("subcategories", []))
    
    return all_subcategories

def create_mapping():
    """Create mapping from JSON data to database UUIDs"""
    print("Creating ID mappings...")
    
    # Load JSON data
    categories_json, subcategories_json, services_json = load_json_data()
    
    # Get database data
    db_categories = get_database_categories()
    db_subcategories = get_database_subcategories()
    
    # Create mappings by name (since JSON uses generic IDs)
    category_mapping = {}
    subcategory_mapping = {}
    
    # Map categories by name
    for cat_json in categories_json:
        for cat_db in db_categories:
            if cat_json["name"].lower() == cat_db["name"].lower():
                category_mapping[cat_json["id"]] = cat_db["id"]
                print(f"  Mapped category: {cat_json['name']} ({cat_json['id']} -> {cat_db['id']})")
                break
    
    # Map subcategories by name
    for sub_json in subcategories_json:
        for sub_db in db_subcategories:
            if sub_json["name"].lower() == sub_db["name"].lower():
                subcategory_mapping[sub_json["id"]] = sub_db["id"]
                print(f"  Mapped subcategory: {sub_json['name']} ({sub_json['id']} -> {sub_db['id']})")
                break
    
    print(f"Created mappings for {len(category_mapping)} categories and {len(subcategory_mapping)} subcategories")
    return category_mapping, subcategory_mapping

def add_service(service_data):
    """Add a service using the API"""
    response = requests.post(f"{API_BASE_URL}/services/", json=service_data)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error adding service: {response.status_code} - {response.text}")
        return None

def main():
    """Main function"""
    print("🚀 Starting to populate ALL services from JSON data...")
    
    # Load JSON data
    categories_json, subcategories_json, services_json = load_json_data()
    print(f"📁 Loaded {len(categories_json)} categories, {len(subcategories_json)} subcategories, {len(services_json)} services from JSON")
    
    # Create mappings
    category_mapping, subcategory_mapping = create_mapping()
    
    if not category_mapping or not subcategory_mapping:
        print("❌ Failed to create proper mappings. Exiting.")
        return
    
    # Add services
    added_count = 0
    skipped_count = 0
    
    print(f"\n📝 Adding {len(services_json)} services...")
    
    for i, service_json in enumerate(services_json):
        # Map the service to database IDs
        category_id = category_mapping.get(service_json["category_id"])
        subcategory_id = subcategory_mapping.get(service_json["subcategory_id"])
        
        if not category_id or not subcategory_id:
            print(f"  ⚠️  Skipping service '{service_json['name']}' - missing mapping")
            skipped_count += 1
            continue
        
        # Create service payload
        service_payload = {
            "category_id": category_id,
            "subcategory_id": subcategory_id,
            "name": service_json["name"],
            "description": service_json["description"],
            "requires_license": service_json["requires_license"],
            "is_specialty": service_json["is_specialty"],
            "indoor_outdoor": service_json["indoor_outdoor"],
            "is_active": service_json["is_active"],
            "sort_order": service_json["sort_order"]
        }
        
        # Add the service
        result = add_service(service_payload)
        if result:
            added_count += 1
            if added_count % 50 == 0:  # Progress update every 50 services
                print(f"  📊 Progress: {added_count}/{len(services_json)} services added")
        else:
            skipped_count += 1
    
    # Final summary
    print(f"\n🎉 Population complete!")
    print(f"✅ Successfully added: {added_count} services")
    print(f"⚠️  Skipped: {skipped_count} services")
    
    # Check total services in database
    response = requests.get(f"{API_BASE_URL}/services/")
    if response.status_code == 200:
        services = response.json()
        print(f"📊 Total services in database: {len(services)}")

if __name__ == "__main__":
    main()

