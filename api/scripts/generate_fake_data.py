#!/usr/bin/env python3
"""
Script to generate fake users and mesters for testing

Usage:
  python scripts/generate_fake_data.py --users 20 --mesters 10
  python scripts/generate_fake_data.py --users 50 --mesters 25 --clear

This script will:
1. Generate specified number of fake users
2. Generate specified number of fake mesters with profiles
3. Assign random services to mesters
4. Create coverage areas for mesters
5. Add fake reviews to mesters
"""

import argparse
import sys
import random
import uuid
import json
import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from faker import Faker

# Add the parent directory to the path so we can import our modules
sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import engine
from app.models.database import (
    User, 
    Mester, 
    MesterProfile, 
    MesterService, 
    MesterCoverageArea,
    MesterReview,
    Service,
    City,
    MesterCalendar,
    MesterProfileAddress,
    MesterProfileWorkingHour,
    MesterProfileCoverage,
)
from sqlalchemy.orm import sessionmaker

# Firebase imports
try:
    import firebase_admin
    from firebase_admin import credentials, auth as firebase_auth
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("⚠️  Warning: firebase-admin not installed. Auth accounts will not be created.")

# Initialize Faker with Hungarian locale
fake = Faker(['en_US', 'hu_HU'])

# Hungarian first and last names
HUNGARIAN_FIRST_NAMES = [
    'István', 'László', 'Zoltán', 'Gábor', 'Péter', 'János', 'András', 'Tamás',
    'Mária', 'Katalin', 'Éva', 'Anna', 'Erzsébet', 'Judit', 'Ágnes', 'Ilona',
    'Ferenc', 'József', 'Sándor', 'Balázs', 'Attila', 'Mihály', 'Róbert', 'Norbert',
    'Eszter', 'Zsófia', 'Viktória', 'Krisztina', 'Andrea', 'Mónika', 'Erika', 'Tünde'
]

HUNGARIAN_LAST_NAMES = [
    'Nagy', 'Kovács', 'Tóth', 'Szabó', 'Horváth', 'Varga', 'Kiss', 'Molnár',
    'Németh', 'Farkas', 'Balogh', 'Papp', 'Takács', 'Juhász', 'Lakatos', 'Mészáros',
    'Oláh', 'Simon', 'Rácz', 'Fekete', 'Szilágyi', 'Sándor', 'Bodnár', 'Lukács'
]

BUSINESS_TYPES = [
    'Szolgáltatások', 'Kft.', 'Bt.', 'Mester', 'Szakszerviz', 'Pro',
    'Szerviz', 'Expert', 'Master', 'Professional', 'Team'
]

SKILLS = [
    'Tapasztalt szakember', 'Gyors munkavégzés', 'Precíz munka', 'Rugalmas időbeosztás',
    'Minőségi anyagok', 'Garanciavállalás', 'Hétvégi munkavégzés', 'Sürgős esetek',
    'Ingyenes árajánlat', 'Kedvező árak', 'Személyes konzultáció', 'Számlát adok',
    'Biztosított', 'Referenciaképekkel', 'Több éves tapasztalat'
]

LANGUAGES = ['hu', 'en', 'de', 'sk', 'ro']

DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

# Default password for all test accounts
DEFAULT_PASSWORD = "TestPassword123!"

# Global Firebase app instance
_firebase_app = None


def init_firebase() -> bool:
    """Initialize Firebase Admin SDK"""
    global _firebase_app
    
    if not FIREBASE_AVAILABLE:
        return False
    
    if _firebase_app is not None:
        return True
    
    try:
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            print("✅ Firebase Admin SDK initialized")
            return True
        else:
            print("⚠️  FIREBASE_CREDENTIALS_PATH not set or file not found")
            print("   Auth accounts will not be created")
            return False
    except Exception as e:
        print(f"❌ Failed to initialize Firebase: {e}")
        return False


def create_firebase_user(email: str, password: str, display_name: str) -> Optional[str]:
    """Create a Firebase Auth user and return the UID"""
    if not FIREBASE_AVAILABLE or _firebase_app is None:
        return None
    
    try:
        user = firebase_auth.create_user(
            email=email,
            password=password,
            display_name=display_name,
            email_verified=True  # Auto-verify for test accounts
        )
        return user.uid
    except firebase_auth.EmailAlreadyExistsError:
        # User already exists, try to get it
        try:
            user = firebase_auth.get_user_by_email(email)
            # Update password to match
            firebase_auth.update_user(
                user.uid,
                password=password,
                display_name=display_name
            )
            return user.uid
        except Exception as e:
            print(f"   ⚠️  Could not update existing user {email}: {e}")
            return None
    except Exception as e:
        print(f"   ⚠️  Failed to create Firebase user {email}: {e}")
        return None


def generate_fake_users(db: Session, count: int, create_auth: bool = True) -> tuple[List[User], List[Dict]]:
    """Generate fake users with optional Firebase Auth accounts"""
    print(f"👥 Generating {count} fake users...")
    users = []
    credentials = []
    
    for i in range(count):
        # Use Hungarian names sometimes
        if random.random() > 0.5:
            first_name = random.choice(HUNGARIAN_FIRST_NAMES)
            last_name = random.choice(HUNGARIAN_LAST_NAMES)
        else:
            first_name = fake.first_name()
            last_name = fake.last_name()
        
        # Create a unique email
        email_base = f"{first_name.lower()}.{last_name.lower()}{i}"
        email = fake.unique.email().replace(fake.unique.email().split('@')[0], email_base)
        display_name = f"{first_name} {last_name}"
        
        # Create Firebase Auth user if requested
        firebase_uid = None
        if create_auth and _firebase_app:
            firebase_uid = create_firebase_user(email, DEFAULT_PASSWORD, display_name)
        
        # Fallback to test UID if Firebase not available
        if not firebase_uid:
            firebase_uid = f"test_user_{uuid.uuid4().hex[:20]}"
        
        user = User(
            first_name=first_name,
            last_name=last_name,
            email=email,
            firebase_uid=firebase_uid,
            created_at=datetime.now() - timedelta(days=random.randint(1, 365))
        )
        
        db.add(user)
        users.append(user)
        
        # Store credentials
        credentials.append({
            'type': 'user',
            'email': email,
            'password': DEFAULT_PASSWORD,
            'name': display_name,
            'firebase_uid': firebase_uid
        })
        
        if (i + 1) % 10 == 0:
            print(f"   Generated {i + 1} users...")
    
    db.commit()
    print(f"✅ Successfully generated {count} users")
    return users, credentials


def generate_fake_mesters(db: Session, count: int, users: List[User], create_auth: bool = True) -> tuple[List[Mester], List[Dict]]:
    """Generate fake mesters with full profiles"""
    print(f"🔨 Generating {count} fake mesters...")
    
    # Get available services and cities
    services = db.query(Service).filter(Service.is_active == True).all()
    cities = db.query(City).filter(City.is_active == True).all()
    
    if not services:
        print("⚠️  Warning: No services found in database. Run seed_services.py first!")
        return [], []
    
    if not cities:
        print("⚠️  Warning: No cities found in database. Run seed_hungary_locations.py first!")
        return [], []
    
    mesters = []
    credentials = []
    
    for i in range(count):
        # Use Hungarian names for mesters
        if random.random() > 0.3:
            first_name = random.choice(HUNGARIAN_FIRST_NAMES)
            last_name = random.choice(HUNGARIAN_LAST_NAMES)
        else:
            first_name = fake.first_name()
            last_name = fake.last_name()
        
        full_name = f"{first_name} {last_name}"
        slug = f"{first_name.lower()}-{last_name.lower()}-{i}".replace(' ', '-')
        
        # Create business name
        business_name = f"{last_name} {random.choice(BUSINESS_TYPES)}"
        
        # Pick a random user or None
        user = random.choice(users) if random.random() > 0.3 and users else None
        
        # Set home city to Budapest
        home_city = db.query(City).filter(City.name == 'Budapest').first()
        if not home_city:
            # Fallback to random city if Budapest not found
            home_city = random.choice(cities)
        
        # Create email
        email = f"{first_name.lower()}.{last_name.lower()}.mester{i}@example.com"
        display_name = full_name
        
        # Create Firebase Auth user for mester if requested
        firebase_uid = None
        if create_auth and _firebase_app and not user:
            # Only create Firebase account if not linked to existing user
            firebase_uid = create_firebase_user(email, DEFAULT_PASSWORD, display_name)
        elif user:
            # Use the linked user's Firebase UID
            firebase_uid = user.firebase_uid
        
        # Use Budapest coordinates for location-based search
        mester_lat = home_city.lat if home_city.lat else 47.4979  # Budapest default
        mester_lon = home_city.lon if home_city.lon else 19.0402  # Budapest default
        
        # Create mester
        mester = Mester(
            user_id=user.id if user else None,
            full_name=full_name,
            slug=slug,
            email=email,
            phone=fake.phone_number()[:50],
            bio=fake.text(max_nb_chars=300),
            skills=random.sample(SKILLS, k=random.randint(3, 8)),
            tags=random.sample(['professional', 'experienced', 'reliable', 'fast', 'quality', 'affordable'], k=random.randint(2, 4)),
            languages=random.sample(LANGUAGES, k=random.randint(1, 3)),
            years_experience=random.randint(1, 25),
            rating_avg=round(random.uniform(3.5, 5.0), 2),
            review_count=random.randint(5, 150),
            is_verified=random.random() > 0.3,
            is_active=True,
            home_city_id=home_city.id,
            lat=mester_lat,
            lon=mester_lon,
            created_at=datetime.now() - timedelta(days=random.randint(30, 730))
        )
        
        db.add(mester)
        db.flush()  # Get the mester ID
        
        # Create mester profile
        profile = MesterProfile(
            mester_id=mester.id,
            business_name=business_name,
            display_name=full_name,
            slug=slug,
            contact_email=email,
            contact_phone=mester.phone,
            year_founded=random.randint(1995, 2023),
            employees_count=random.randint(1, 20),
            intro=fake.text(max_nb_chars=200),
            languages=mester.languages,
            availability_mode=random.choice(['flexible', 'scheduled', 'on-demand']),
            budget_mode=random.choice(['weekly', 'monthly', 'project']),
            weekly_budget=random.randint(5, 50) * 1000 if random.random() > 0.5 else None,
            logo_url=f"https://ui-avatars.com/api/?name={first_name}+{last_name}&size=200" if random.random() > 0.5 else None
        )
        db.add(profile)
        db.flush()
        
        # Create address
        address = MesterProfileAddress(
            profile_id=profile.id,
            street=fake.street_address(),
            city=home_city.name,
            zip=fake.postcode()[:20],
            home_city_id=home_city.id
        )
        db.add(address)
        
        # Assign random services to mester (3-7 services)
        mester_services = random.sample(services, k=min(random.randint(3, 7), len(services)))
        for service in mester_services:
            mester_service = MesterService(
                mester_id=mester.id,
                service_id=service.id,
                price_hour_min=random.randint(3000, 8000),
                price_hour_max=random.randint(8000, 20000),
                pricing_notes=fake.sentence() if random.random() > 0.7 else None,
                is_active=True
            )
            db.add(mester_service)
        
        # Create coverage areas - Budapest only
        budapest = db.query(City).filter(City.name == 'Budapest').first()
        
        if budapest:
            coverage = MesterCoverageArea(
                mester_id=mester.id,
                city_id=budapest.id,
                radius_km=50,  # 50km radius covers Budapest and surroundings
                priority=10
            )
            db.add(coverage)
            
            # Also add to profile coverage
            profile_coverage = MesterProfileCoverage(
                profile_id=profile.id,
                city_id=budapest.id,
                radius_km=50,
                priority=10
            )
            db.add(profile_coverage)
        
        # Create working hours
        for day in DAYS_OF_WEEK:
            # 80% chance of working on weekdays, 30% on weekends
            if day in ['Sat', 'Sun']:
                enabled = random.random() > 0.7
            else:
                enabled = random.random() > 0.2
            
            if enabled:
                open_hour = random.randint(6, 9)
                close_hour = random.randint(16, 20)
                
                working_hour = MesterProfileWorkingHour(
                    profile_id=profile.id,
                    day=day,
                    open=f"{open_hour:02d}:00",
                    close=f"{close_hour:02d}:00",
                    enabled=True
                )
                db.add(working_hour)
        
        # Create calendar
        calendar = MesterCalendar(
            mester_id=mester.id,
            timezone='Europe/Budapest',
            buffer_minutes=random.choice([15, 30, 45]),
            min_advance_hours=random.choice([12, 24, 48]),
            max_advance_days=random.choice([30, 60, 90]),
            default_duration_minutes=random.choice([60, 90, 120]),
            allow_online_booking=random.random() > 0.3
        )
        db.add(calendar)
        
        # Add some reviews (3-15 reviews)
        review_count = random.randint(3, 15)
        for _ in range(review_count):
            review = MesterReview(
                mester_id=mester.id,
                rating=random.randint(3, 5),
                comment=fake.text(max_nb_chars=200) if random.random() > 0.3 else None,
                author_name=fake.name(),
                is_public=random.random() > 0.1,
                created_at=datetime.now() - timedelta(days=random.randint(1, 365))
            )
            db.add(review)
        
        mesters.append(mester)
        
        # Store credentials (only if not linked to existing user or if Firebase account was created)
        if not user or (firebase_uid and create_auth):
            credentials.append({
                'type': 'mester',
                'email': email,
                'password': DEFAULT_PASSWORD,
                'name': full_name,
                'business_name': business_name,
                'firebase_uid': firebase_uid or f"test_mester_{uuid.uuid4().hex[:20]}",
                'linked_to_user': user is not None
            })
        
        if (i + 1) % 5 == 0:
            print(f"   Generated {i + 1} mesters...")
            db.commit()  # Commit in batches
    
    db.commit()
    print(f"✅ Successfully generated {count} mesters with profiles")
    return mesters, credentials


def clear_existing_test_data(db: Session):
    """Clear existing test users and mesters"""
    print("🗑️  Clearing existing test data...")
    
    # Delete mesters and related data (cascade will handle most)
    deleted_mesters = db.query(Mester).delete()
    print(f"   Deleted {deleted_mesters} mesters (and related data)")
    
    # Delete users
    deleted_users = db.query(User).delete()
    print(f"   Deleted {deleted_users} users")
    
    db.commit()
    print("✅ Existing test data cleared successfully")


def verify_generation(db: Session):
    """Verify the data generation was successful"""
    print("🔍 Verifying generated data...")
    
    user_count = db.query(User).count()
    mester_count = db.query(Mester).count()
    profile_count = db.query(MesterProfile).count()
    service_count = db.query(MesterService).count()
    review_count = db.query(MesterReview).count()
    
    print("📊 Final counts:")
    print(f"   Users: {user_count}")
    print(f"   Mesters: {mester_count}")
    print(f"   Mester Profiles: {profile_count}")
    print(f"   Mester Services: {service_count}")
    print(f"   Reviews: {review_count}")
    
    # Show some sample data
    print("\n📋 Sample users:")
    users = db.query(User).limit(5).all()
    for user in users:
        print(f"   - {user.first_name} {user.last_name} ({user.email})")
    
    print("\n📋 Sample mesters:")
    mesters = db.query(Mester).limit(5).all()
    for mester in mesters:
        profile = db.query(MesterProfile).filter(MesterProfile.mester_id == mester.id).first()
        service_count = db.query(MesterService).filter(MesterService.mester_id == mester.id).count()
        print(f"   - {mester.full_name} ({profile.business_name if profile else 'No business name'}) - {service_count} services, {mester.rating_avg}★, {mester.review_count} reviews")


def main():
    """Main function to run the data generation"""
    parser = argparse.ArgumentParser(
        description='Generate fake users and mesters for testing',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/generate_fake_data.py --users 20 --mesters 10
  python scripts/generate_fake_data.py --users 50 --mesters 25 --clear
  python scripts/generate_fake_data.py --mesters 15 (only generates mesters)
        """
    )
    parser.add_argument('--users', type=int, default=0, help='Number of fake users to generate (default: 0)')
    parser.add_argument('--mesters', type=int, default=0, help='Number of fake mesters to generate (default: 0)')
    parser.add_argument('--clear', action='store_true', help='Clear existing test data before generating')
    parser.add_argument('--no-auth', action='store_true', help='Skip Firebase Auth account creation')
    parser.add_argument('--export-credentials', type=str, help='Export credentials to JSON file (e.g., credentials.json)')
    
    args = parser.parse_args()
    
    if args.users == 0 and args.mesters == 0:
        parser.print_help()
        print("\n❌ Error: You must specify at least --users or --mesters")
        sys.exit(1)
    
    print("🚀 Starting fake data generation...")
    print("=" * 60)
    print("Configuration:")
    print(f"   Users to generate: {args.users}")
    print(f"   Mesters to generate: {args.mesters}")
    print(f"   Clear existing data: {args.clear}")
    print(f"   Create Firebase Auth: {not args.no_auth}")
    print(f"   Export credentials: {args.export_credentials or 'No'}")
    print("=" * 60)
    
    # Initialize Firebase if auth is enabled
    firebase_enabled = False
    if not args.no_auth:
        firebase_enabled = init_firebase()
    else:
        print("ℹ️  Skipping Firebase Auth account creation (--no-auth flag)")
    
    all_credentials = []
    
    try:
        # Get database session
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # Clear existing data if requested
            if args.clear:
                clear_existing_test_data(db)
            
            # Generate users
            users = []
            if args.users > 0:
                users, user_creds = generate_fake_users(db, args.users, create_auth=firebase_enabled)
                all_credentials.extend(user_creds)
            
            # Generate mesters
            if args.mesters > 0:
                _, mester_creds = generate_fake_mesters(db, args.mesters, users, create_auth=firebase_enabled)
                all_credentials.extend(mester_creds)
            
            # Verify generation
            verify_generation(db)
            
            # Display credentials
            if all_credentials:
                print("\n" + "=" * 60)
                print("🔑 GENERATED LOGIN CREDENTIALS")
                print("=" * 60)
                print(f"\n📝 Default Password for ALL accounts: {DEFAULT_PASSWORD}")
                
                # Display sample credentials
                user_creds = [c for c in all_credentials if c['type'] == 'user']
                mester_creds = [c for c in all_credentials if c['type'] == 'mester']
                
                if user_creds:
                    print(f"\n👥 Sample User Accounts ({len(user_creds)} total):")
                    for cred in user_creds[:5]:  # Show first 5
                        print(f"   📧 {cred['email']}")
                        print(f"      Name: {cred['name']}")
                        print(f"      Password: {cred['password']}")
                        print()
                
                if mester_creds:
                    print(f"\n🔨 Sample Mester Accounts ({len(mester_creds)} total):")
                    for cred in mester_creds[:5]:  # Show first 5
                        print(f"   📧 {cred['email']}")
                        print(f"      Name: {cred['name']}")
                        print(f"      Business: {cred['business_name']}")
                        print(f"      Password: {cred['password']}")
                        print()
                
                # Export credentials if requested
                if args.export_credentials:
                    export_path = args.export_credentials
                    try:
                        with open(export_path, 'w') as f:
                            json.dump({
                                'default_password': DEFAULT_PASSWORD,
                                'total_accounts': len(all_credentials),
                                'users': [c for c in all_credentials if c['type'] == 'user'],
                                'mesters': [c for c in all_credentials if c['type'] == 'mester'],
                                'generated_at': datetime.now().isoformat()
                            }, f, indent=2)
                        print(f"\n💾 Credentials exported to: {export_path}")
                    except Exception as e:
                        print(f"\n⚠️  Failed to export credentials: {e}")
            
            print("\n" + "=" * 60)
            print("🎉 Fake data generation completed successfully!")
            if firebase_enabled:
                print("\n✅ Firebase Auth accounts created - you can login immediately!")
            else:
                print("\n⚠️  No Firebase Auth accounts created (use --export-credentials to save)")
            print("\n💡 Quick Login Test:")
            if all_credentials:
                sample = all_credentials[0]
                print(f"   Email: {sample['email']}")
                print(f"   Password: {DEFAULT_PASSWORD}")
            print("=" * 60)
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error during generation: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

