#!/usr/bin/env python3
"""
Script to replace current categories with JSON data and add all 241 services.
This will clear existing data and populate with the complete dataset.
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

def clear_existing_data():
    """Clear existing services, subcategories, and categories"""
    print("🧹 Clearing existing data...")
    
    # Delete all services first (due to foreign key constraints)
    services_response = requests.get(f"{API_BASE_URL}/services/")
    if services_response.status_code == 200:
        services = services_response.json()
        for service in services:
            requests.delete(f"{API_BASE_URL}/services/{service['id']}")
        print(f"  Deleted {len(services)} existing services")
    
    # Note: We can't easily delete categories/subcategories via API
    # The database will need to be reset or we'll work with existing structure
    print("  ⚠️  Note: Existing categories/subcategories will remain")

def create_category_via_api(category_data):
    """Create a category via API"""
    payload = {
        "name": category_data["name"],
        "description": category_data["description"],
        "icon": category_data["icon"],
        "is_active": category_data["is_active"],
        "sort_order": category_data["sort_order"]
    }
    
    response = requests.post(f"{API_BASE_URL}/categories/", json=payload)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error creating category {category_data['name']}: {response.status_code} - {response.text}")
        return None

def create_subcategory_via_api(subcategory_data, category_id):
    """Create a subcategory via API"""
    payload = {
        "category_id": category_id,
        "name": subcategory_data["name"],
        "description": subcategory_data["description"],
        "icon": subcategory_data.get("icon"),
        "is_active": subcategory_data["is_active"],
        "sort_order": subcategory_data["sort_order"]
    }
    
    response = requests.post(f"{API_BASE_URL}/categories/{category_id}/subcategories", json=payload)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error creating subcategory {subcategory_data['name']}: {response.status_code} - {response.text}")
        return None

def add_service_via_api(service_data, category_id, subcategory_id):
    """Add a service via API"""
    payload = {
        "category_id": category_id,
        "subcategory_id": subcategory_id,
        "name": service_data["name"],
        "description": service_data["description"],
        "requires_license": service_data["requires_license"],
        "is_specialty": service_data["is_specialty"],
        "indoor_outdoor": service_data["indoor_outdoor"],
        "is_active": service_data["is_active"],
        "sort_order": service_data["sort_order"]
    }
    
    response = requests.post(f"{API_BASE_URL}/services/", json=payload)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error adding service {service_data['name']}: {response.status_code} - {response.text}")
        return None

def main():
    """Main function"""
    print("🚀 Starting complete data replacement with JSON data...")
    
    # Load JSON data
    categories_json, subcategories_json, services_json = load_json_data()
    print(f"📁 Loaded {len(categories_json)} categories, {len(subcategories_json)} subcategories, {len(services_json)} services from JSON")
    
    # Clear existing data
    clear_existing_data()
    
    # Create mapping from JSON IDs to database IDs
    category_mapping = {}
    subcategory_mapping = {}
    
    print(f"\n📝 Creating {len(categories_json)} categories...")
    
    # Create categories
    for category_data in categories_json:
        result = create_category_via_api(category_data)
        if result:
            category_mapping[category_data["id"]] = result["id"]
            print(f"  ✅ Created category: {category_data['name']}")
        else:
            print(f"  ❌ Failed to create category: {category_data['name']}")
    
    print(f"\n📝 Creating {len(subcategories_json)} subcategories...")
    
    # Create subcategories
    for subcategory_data in subcategories_json:
        category_id = category_mapping.get(subcategory_data["category_id"])
        if category_id:
            result = create_subcategory_via_api(subcategory_data, category_id)
            if result:
                subcategory_mapping[subcategory_data["id"]] = result["id"]
                print(f"  ✅ Created subcategory: {subcategory_data['name']}")
            else:
                print(f"  ❌ Failed to create subcategory: {subcategory_data['name']}")
        else:
            print(f"  ⚠️  Skipped subcategory {subcategory_data['name']} - no parent category")
    
    print(f"\n📝 Adding {len(services_json)} services...")
    
    # Add services
    added_count = 0
    skipped_count = 0
    
    for i, service_data in enumerate(services_json):
        category_id = category_mapping.get(service_data["category_id"])
        subcategory_id = subcategory_mapping.get(service_data["subcategory_id"])
        
        if category_id and subcategory_id:
            result = add_service_via_api(service_data, category_id, subcategory_id)
            if result:
                added_count += 1
                if added_count % 50 == 0:
                    print(f"  📊 Progress: {added_count}/{len(services_json)} services added")
            else:
                skipped_count += 1
        else:
            skipped_count += 1
    
    # Final summary
    print(f"\n🎉 Data replacement complete!")
    print(f"✅ Successfully added: {added_count} services")
    print(f"⚠️  Skipped: {skipped_count} services")
    
    # Check totals
    response = requests.get(f"{API_BASE_URL}/categories/")
    if response.status_code == 200:
        categories = response.json()
        print(f"📊 Total categories in database: {len(categories)}")
    
    response = requests.get(f"{API_BASE_URL}/services/")
    if response.status_code == 200:
        services = response.json()
        print(f"📊 Total services in database: {len(services)}")

if __name__ == "__main__":
    main()
