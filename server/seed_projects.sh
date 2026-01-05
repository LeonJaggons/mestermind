#!/bin/bash

# Seed sample projects for pro_profile_id 1

echo "Creating project 1: Kitchen Remodel..."
curl -X POST "http://localhost:8000/api/v1/projects?pro_profile_id=1" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Modern Kitchen Remodel",
    "description": "Complete kitchen renovation with new cabinets, countertops, and appliances. Transformed outdated space into a modern, functional kitchen.",
    "media": [
      {
        "media_url": "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800",
        "media_type": "image",
        "caption": "Before - Old kitchen",
        "display_order": 0
      },
      {
        "media_url": "https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=800",
        "media_type": "image",
        "caption": "After - Modern kitchen with new cabinets",
        "display_order": 1
      },
      {
        "media_url": "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=800",
        "media_type": "image",
        "caption": "Detail - New countertops and backsplash",
        "display_order": 2
      }
    ]
  }'

echo -e "\n\nCreating project 2: Bathroom Renovation..."
curl -X POST "http://localhost:8000/api/v1/projects?pro_profile_id=1" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Luxury Bathroom Renovation",
    "description": "High-end bathroom remodel featuring marble tiles, custom vanity, and walk-in shower with glass enclosure.",
    "media": [
      {
        "media_url": "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800",
        "media_type": "image",
        "caption": "Completed luxury bathroom",
        "display_order": 0
      },
      {
        "media_url": "https://images.unsplash.com/photo-1564540583246-934409427776?w=800",
        "media_type": "image",
        "caption": "Walk-in shower with marble tiles",
        "display_order": 1
      }
    ]
  }'

echo -e "\n\nCreating project 3: Outdoor Deck..."
curl -X POST "http://localhost:8000/api/v1/projects?pro_profile_id=1" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Custom Outdoor Deck",
    "description": "Built a 300 sq ft composite deck with built-in seating and lighting. Perfect for entertaining.",
    "media": [
      {
        "media_url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
        "media_type": "image",
        "caption": "Completed deck with seating",
        "display_order": 0
      }
    ]
  }'

echo -e "\n\nDone! Projects created successfully."
