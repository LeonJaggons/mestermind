#!/usr/bin/env python3
"""
Script to add more services to different categories and subcategories
"""

import requests
import json

API_BASE_URL = "http://localhost:8000"

def get_categories():
    """Get all categories from the API"""
    response = requests.get(f"{API_BASE_URL}/categories/")
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error getting categories: {response.status_code}")
        return []

def get_category_with_subcategories(category_id):
    """Get a category with its subcategories"""
    response = requests.get(f"{API_BASE_URL}/categories/{category_id}")
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error getting category {category_id}: {response.status_code}")
        return None

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
    print("Adding more services to different categories...")
    
    # Get categories
    categories = get_categories()
    if not categories:
        print("No categories found")
        return
    
    # Define services for each category
    services_by_category = {
        "Home Repair": [
            {"name": "Drywall Repair", "description": "Professional drywall repair services", "requires_license": False, "is_specialty": False, "indoor_outdoor": "indoor"},
            {"name": "Door Installation", "description": "Professional door installation services", "requires_license": False, "is_specialty": False, "indoor_outdoor": "indoor"},
            {"name": "Window Repair", "description": "Professional window repair services", "requires_license": False, "is_specialty": False, "indoor_outdoor": "indoor"},
            {"name": "Cabinet Installation", "description": "Professional cabinet installation services", "requires_license": False, "is_specialty": False, "indoor_outdoor": "indoor"},
        ],
        "Cleaning Services": [
            {"name": "House Cleaning", "description": "Professional house cleaning services", "requires_license": False, "is_specialty": False, "indoor_outdoor": "indoor"},
            {"name": "Office Cleaning", "description": "Professional office cleaning services", "requires_license": False, "is_specialty": False, "indoor_outdoor": "indoor"},
            {"name": "Carpet Cleaning", "description": "Professional carpet cleaning services", "requires_license": False, "is_specialty": False, "indoor_outdoor": "indoor"},
            {"name": "Window Cleaning", "description": "Professional window cleaning services", "requires_license": False, "is_specialty": False, "indoor_outdoor": "indoor"},
        ],
        "Landscaping": [
            {"name": "Lawn Mowing", "description": "Professional lawn mowing services", "requires_license": False, "is_specialty": False, "indoor_outdoor": "outdoor"},
            {"name": "Tree Trimming", "description": "Professional tree trimming services", "requires_license": False, "is_specialty": False, "indoor_outdoor": "outdoor"},
            {"name": "Garden Design", "description": "Professional garden design services", "requires_license": False, "is_specialty": True, "indoor_outdoor": "outdoor"},
            {"name": "Sprinkler Installation", "description": "Professional sprinkler installation services", "requires_license": False, "is_specialty": False, "indoor_outdoor": "outdoor"},
        ],
        "Event Planning": [
            {"name": "Wedding Planning", "description": "Professional wedding planning services", "requires_license": False, "is_specialty": True, "indoor_outdoor": "both"},
            {"name": "Corporate Events", "description": "Professional corporate event planning", "requires_license": False, "is_specialty": False, "indoor_outdoor": "both"},
            {"name": "Birthday Parties", "description": "Professional birthday party planning", "requires_license": False, "is_specialty": False, "indoor_outdoor": "both"},
            {"name": "Catering Services", "description": "Professional catering services", "requires_license": False, "is_specialty": False, "indoor_outdoor": "both"},
        ],
        "Moving Services": [
            {"name": "Local Moving", "description": "Professional local moving services", "requires_license": False, "is_specialty": False, "indoor_outdoor": "both"},
            {"name": "Long Distance Moving", "description": "Professional long distance moving services", "requires_license": False, "is_specialty": False, "indoor_outdoor": "both"},
            {"name": "Piano Moving", "description": "Professional piano moving services", "requires_license": False, "is_specialty": True, "indoor_outdoor": "both"},
            {"name": "Packing Services", "description": "Professional packing and unpacking services", "requires_license": False, "is_specialty": False, "indoor_outdoor": "both"},
        ]
    }
    
    total_added = 0
    
    for category in categories:
        category_name = category["name"]
        if category_name not in services_by_category:
            continue
            
        print(f"\n📁 Adding services to {category_name}...")
        
        # Get subcategories for this category
        category_data = get_category_with_subcategories(category["id"])
        if not category_data or not category_data.get("subcategories"):
            print(f"  No subcategories found for {category_name}")
            continue
            
        subcategories = category_data["subcategories"]
        services_to_add = services_by_category[category_name]
        
        for i, service_data in enumerate(services_to_add):
            # Distribute services across subcategories
            subcategory = subcategories[i % len(subcategories)]
            
            service_payload = {
                "category_id": category["id"],
                "subcategory_id": subcategory["id"],
                "name": service_data["name"],
                "description": service_data["description"],
                "requires_license": service_data["requires_license"],
                "is_specialty": service_data["is_specialty"],
                "indoor_outdoor": service_data["indoor_outdoor"],
                "is_active": True,
                "sort_order": i + 1
            }
            
            result = add_service(service_payload)
            if result:
                print(f"  ✅ Added: {service_data['name']} → {subcategory['name']}")
                total_added += 1
            else:
                print(f"  ❌ Failed: {service_data['name']}")
    
    # Check total services
    response = requests.get(f"{API_BASE_URL}/services/")
    if response.status_code == 200:
        services = response.json()
        print(f"\n🎉 Successfully added {total_added} services!")
        print(f"📊 Total services in database: {len(services)}")

if __name__ == "__main__":
    main()

