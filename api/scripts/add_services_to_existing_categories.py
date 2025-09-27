#!/usr/bin/env python3
"""
Script to add services from JSON to existing database categories by intelligent mapping.
"""

import requests
import json
from pathlib import Path

API_BASE_URL = "http://localhost:8000"

def load_json_data():
    """Load data from JSON files"""
    data_dir = Path(__file__).parent.parent / "data"
    
    with open(data_dir / "services.json", "r") as f:
        services_data = json.load(f)
    
    return services_data

def get_database_categories():
    """Get all categories from the database"""
    response = requests.get(f"{API_BASE_URL}/categories/")
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error getting categories: {response.status_code}")
        return []

def get_database_subcategories():
    """Get all subcategories from the database"""
    categories = get_database_categories()
    all_subcategories = []
    
    for category in categories:
        response = requests.get(f"{API_BASE_URL}/categories/{category['id']}")
        if response.status_code == 200:
            category_data = response.json()
            all_subcategories.extend(category_data.get("subcategories", []))
    
    return all_subcategories

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

def map_service_to_category(service_name, service_description):
    """Map a service to the best matching category"""
    service_lower = service_name.lower()
    desc_lower = service_description.lower()
    
    # Define mapping rules
    if any(word in service_lower for word in ['cleaning', 'carpet', 'window', 'house', 'office']):
        return "Cleaning Services"
    elif any(word in service_lower for word in ['moving', 'packing', 'hauling', 'storage']):
        return "Moving Services"
    elif any(word in service_lower for word in ['lawn', 'tree', 'garden', 'landscaping', 'outdoor']):
        return "Landscaping"
    elif any(word in service_lower for word in ['wedding', 'event', 'party', 'catering']):
        return "Event Planning"
    elif any(word in service_lower for word in ['repair', 'installation', 'electrical', 'plumbing', 'hvac', 'handyman']):
        return "Home Repair"
    else:
        return "Home Repair"  # Default fallback

def main():
    """Main function"""
    print("🚀 Adding services from JSON to existing database categories...")
    
    # Load JSON data
    services_json = load_json_data()
    print(f"📁 Loaded {len(services_json)} services from JSON")
    
    # Get database categories and subcategories
    db_categories = get_database_categories()
    db_subcategories = get_database_subcategories()
    
    print(f"📊 Found {len(db_categories)} categories and {len(db_subcategories)} subcategories in database")
    
    # Create category name to ID mapping
    category_mapping = {cat["name"]: cat["id"] for cat in db_categories}
    
    # Group subcategories by category
    subcategories_by_category = {}
    for sub in db_subcategories:
        cat_id = sub["category_id"]
        if cat_id not in subcategories_by_category:
            subcategories_by_category[cat_id] = []
        subcategories_by_category[cat_id].append(sub)
    
    # Add services
    added_count = 0
    skipped_count = 0
    
    print(f"\n📝 Adding services...")
    
    for i, service_data in enumerate(services_json):
        # Map service to category
        mapped_category = map_service_to_category(service_data["name"], service_data["description"])
        category_id = category_mapping.get(mapped_category)
        
        if not category_id:
            print(f"  ⚠️  Skipping service '{service_data['name']}' - no matching category")
            skipped_count += 1
            continue
        
        # Get subcategories for this category
        available_subcategories = subcategories_by_category.get(category_id, [])
        if not available_subcategories:
            print(f"  ⚠️  Skipping service '{service_data['name']}' - no subcategories")
            skipped_count += 1
            continue
        
        # Use the first subcategory (or distribute evenly)
        subcategory = available_subcategories[i % len(available_subcategories)]
        
        # Add the service
        result = add_service_via_api(service_data, category_id, subcategory["id"])
        if result:
            added_count += 1
            if added_count % 50 == 0:
                print(f"  📊 Progress: {added_count}/{len(services_json)} services added")
        else:
            skipped_count += 1
    
    # Final summary
    print(f"\n🎉 Service addition complete!")
    print(f"✅ Successfully added: {added_count} services")
    print(f"⚠️  Skipped: {skipped_count} services")
    
    # Check total services in database
    response = requests.get(f"{API_BASE_URL}/services/")
    if response.status_code == 200:
        services = response.json()
        print(f"📊 Total services in database: {len(services)}")

if __name__ == "__main__":
    main()

