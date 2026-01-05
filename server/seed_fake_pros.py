"""
Seed script to create fake pros with services and reviews for testing.

Usage:
  python seed_fake_pros.py            # creates 100 pros by default
  python seed_fake_pros.py 50         # creates 50 pros

Notes:
- Requires `faker` (pip install faker).
- Uses existing services from the database; ensure services are seeded first.
- Creates customer users + jobs to attach reviews.
"""

import sys
import random
from datetime import datetime, timedelta

from faker import Faker

from app.db.session import SessionLocal
from app.models import (
    User,
    UserRole,
    ProProfile,
    ProService,
    Service,
    Review,
    Job,
    JobStatus,
    City,
)


fake = Faker()


def get_services(session):
    services = session.query(Service).all()
    if not services:
        raise RuntimeError("No services found. Seed services first.")
    return services


def get_cities(session):
    cities = session.query(City).all()
    if not cities:
        raise RuntimeError("No cities found. Seed cities first.")
    return cities


def create_customer_with_job(session, service, cities):
    # Create a customer user
    customer_email = f"customer_{fake.unique.uuid4()}@example.com"
    customer_user = User(email=customer_email, role=UserRole.customer)
    session.add(customer_user)
    session.flush()

    city_choice = random.choice(cities)

    # Create a job to tie the review to
    job = Job(
        user_id=customer_user.id,
        service_id=service.id,
        description=fake.text(max_nb_chars=120),
        category=service.name or "Service",
        city=city_choice.name,
        district=city_choice.region,
        street=fake.street_address(),
        timing=random.choice(["As soon as possible", "Within a week", "Flexible"]),
        budget=f"{random.randint(20000, 120000)} HUF",
        status=JobStatus.open,
    )
    session.add(job)
    session.flush()

    return customer_user, job


def create_reviews(session, pro_profile_id, service, cities, count=2):
    reviews = []
    for _ in range(count):
        customer_user, job = create_customer_with_job(session, service, cities)
        review = Review(
            job_id=job.id,
            pro_profile_id=pro_profile_id,
            user_id=customer_user.id,
            rating=random.randint(4, 5),
            comment=fake.paragraph(nb_sentences=3),
            service_details=fake.sentence(nb_words=6),
            customer_name=customer_user.email.split("@")[0],
            customer_avatar_url=None,
            hired_on_platform=True,
            verified_hire=True,
        )
        session.add(review)
        reviews.append(review)
    return reviews


def create_pro(session, services, cities):
    pro_email = f"pro_{fake.unique.uuid4()}@example.com"
    user = User(email=pro_email, role=UserRole.mester)
    session.add(user)
    session.flush()

    city_choice = random.choice(cities)
    pro_profile = ProProfile(
        user_id=user.id,
        business_name=fake.company(),
        year_founded=random.randint(1995, 2022),
        number_of_employees=random.randint(1, 20),
        street_address=fake.street_address(),
        suite=None,
        city=city_choice.name,
        zip_code=fake.postcode(),
        profile_image_url=None,
        business_intro=fake.paragraph(nb_sentences=4),
        availability_type=random.choice(["flexible", "specific"]),
        schedule=None,
        lead_time_amount=random.randint(1, 5),
        lead_time_unit=random.choice(["days", "weeks"]),
        advance_booking_amount=random.randint(1, 6),
        advance_booking_unit=random.choice(["weeks", "months"]),
        time_zone="Europe/Budapest",
        travel_time=random.choice([15, 30, 45, 60]),
        service_distance=random.choice([10, 25, 50]),
        service_cities=None,
        onboarding_completed=True,
        balance_huf=random.randint(0, 50000),
    )
    session.add(pro_profile)
    session.flush()

    # Assign services (2–4 random)
    chosen_services = random.sample(services, k=min(len(services), random.randint(2, 4)))
    for s in chosen_services:
        session.add(ProService(pro_profile_id=pro_profile.id, service_id=s.id))

    # Create reviews tied to one of the chosen services
    if chosen_services:
        create_reviews(
            session,
            pro_profile.id,
            random.choice(chosen_services),
            cities,
            count=random.randint(1, 3),
        )

    return pro_profile


def seed_pros(count=100):
    session = SessionLocal()
    created = 0
    try:
        services = get_services(session)
        cities = get_cities(session)
        for _ in range(count):
            create_pro(session, services, cities)
            created += 1
            if created % 10 == 0:
                session.commit()
                print(f"Committed {created} pros...")
        session.commit()
        print(f"Done. Created {created} pros.")
    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    n = 100
    if len(sys.argv) > 1:
        try:
            n = int(sys.argv[1])
        except ValueError:
            pass
    seed_pros(n)
