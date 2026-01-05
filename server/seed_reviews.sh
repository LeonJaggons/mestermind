#!/bin/bash

# Seed sample reviews for pro_profile_id 1

echo "Creating review 1..."
curl -X POST "http://localhost:8000/api/v1/reviews/" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": 1,
    "pro_profile_id": 1,
    "user_id": 1,
    "rating": 5,
    "comment": "I needed an emergency clean for my Airbnb space. The Cleaning Chief responded promptly and catered to my needs. Kudos to the team!",
    "service_details": "2 bedrooms • 1 bathroom • Standard cleaning • Laundry • Fridge cleaning • Oven cleaning • No pets in home • Just once",
    "customer_name": "Muhan Z.",
    "hired_on_platform": true,
    "verified_hire": true
  }'

echo -e "\n\nCreating review 2..."
curl -X POST "http://localhost:8000/api/v1/reviews/" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": 1,
    "pro_profile_id": 1,
    "user_id": 2,
    "rating": 5,
    "comment": "Excellent service! They arrived on time, were very professional, and did an outstanding job. My house has never looked cleaner. Highly recommend!",
    "service_details": "3 bedrooms • 2 bathrooms • Deep cleaning • Window cleaning",
    "customer_name": "Sarah M.",
    "hired_on_platform": true,
    "verified_hire": true
  }'

echo -e "\n\nCreating review 3..."
curl -X POST "http://localhost:8000/api/v1/reviews/" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": 1,
    "pro_profile_id": 1,
    "user_id": 1,
    "rating": 4,
    "comment": "Great cleaning service overall. The team was thorough and efficient. Only minor issue was they arrived 15 minutes late, but they made up for it with quality work.",
    "service_details": "1 bedroom • 1 bathroom • Standard cleaning • Just once",
    "customer_name": "John D.",
    "hired_on_platform": true,
    "verified_hire": false
  }'

echo -e "\n\nCreating review 4..."
curl -X POST "http://localhost:8000/api/v1/reviews/" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": 1,
    "pro_profile_id": 1,
    "user_id": 2,
    "rating": 5,
    "comment": "Absolutely fantastic! Best cleaning service I have used. They pay attention to every detail and the results are consistently excellent. Worth every penny.",
    "service_details": "4 bedrooms • 3 bathrooms • Deep cleaning • Carpet cleaning • Just once",
    "customer_name": "Emily R.",
    "hired_on_platform": true,
    "verified_hire": true
  }'

echo -e "\n\nAdding mester reply to review 1..."
sleep 2
curl -X PUT "http://localhost:8000/api/v1/reviews/1" \
  -H "Content-Type: application/json" \
  -d '{
    "mester_reply": "Thank you, Muhan! We'\''re so glad we could jump in for your Airbnb on short notice and deliver exactly what you needed. Our team thrives on quick turnarounds and high-quality results, especially for hosts who need things spotless fast. We truly appreciate your kind words and look forward to helping again whenever your next guest is on the way.\n\n—Your Cleaning Chief crew"
  }'

echo -e "\n\nDone! Reviews created successfully."
