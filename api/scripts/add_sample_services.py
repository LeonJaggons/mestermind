#!/usr/bin/env python3
"""
Simple script to add sample services using the FastAPI endpoints
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
    print("Adding sample services...")
    
    # Get categories
    categories = get_categories()
    if not categories:
        print("No categories found")
        return
    
    print(f"Found {len(categories)} categories")
    
    # Get the first category with its subcategories
    first_category = categories[0]
    category_data = get_category_with_subcategories(first_category["id"])
    
    if not category_data or not category_data.get("subcategories"):
        print("No subcategories found")
        return
    
    subcategories = category_data["subcategories"]
    print(f"Found {len(subcategories)} subcategories in {first_category['name']}")
    
    # Add some sample services
    sample_services = [
        {
            "category_id": first_category["id"],
            "subcategory_id": subcategories[0]["id"],
            "name": "Basic Home Repair",
            "description": "General home maintenance and repair services",
            "requires_license": False,
            "is_specialty": False,
            "indoor_outdoor": "both",
            "is_active": True,
            "sort_order": 1
        },
        {
            "category_id": first_category["id"],
            "subcategory_id": subcategories[0]["id"],
            "name": "Electrical Repair",
            "description": "Basic electrical repair and maintenance",
            "requires_license": True,
            "is_specialty": False,
            "indoor_outdoor": "indoor",
            "is_active": True,
            "sort_order": 2
        },
        {
            "category_id": first_category["id"],
            "subcategory_id": subcategories[0]["id"],
            "name": "Plumbing Repair",
            "description": "Basic plumbing repair and maintenance",
            "requires_license": True,
            "is_specialty": False,
            "indoor_outdoor": "indoor",
            "is_active": True,
            "sort_order": 3
        }
    ]
    
    # Add services to different subcategories
    for i, service_data in enumerate(sample_services):
        if i < len(subcategories):
            service_data["subcategory_id"] = subcategories[i]["id"]
        
        result = add_service(service_data)
        if result:
            print(f"✅ Added service: {service_data['name']}")
        else:
            print(f"❌ Failed to add service: {service_data['name']}")
    
    # Check total services
    response = requests.get(f"{API_BASE_URL}/services/")
    if response.status_code == 200:
        services = response.json()
        print(f"\nTotal services in database: {len(services)}")

if __name__ == "__main__":
    main()

