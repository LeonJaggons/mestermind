#!/usr/bin/env python3
"""
Script to update all mesters to serve Budapest only
"""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Create engine from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ Error: DATABASE_URL not found in environment")
    sys.exit(1)

engine = create_engine(DATABASE_URL)


def update_mesters_to_budapest():
    """Update all mesters to serve Budapest only"""
    print("🔄 Updating all mesters to serve Budapest...")
    
    try:
        with engine.connect() as conn:
            trans = conn.begin()
            
            try:
                # Get Budapest city info
                result = conn.execute(text("SELECT id, lat, lon FROM cities WHERE name = 'Budapest' LIMIT 1"))
                budapest = result.fetchone()
                
                if not budapest:
                    print("❌ Budapest not found in database!")
                    print("   Please seed Hungary locations first: python scripts/seed_hungary_locations.py")
                    sys.exit(1)
                
                budapest_id = budapest[0]
                budapest_lat = budapest[1]
                budapest_lon = budapest[2]
                print(f"✅ Found Budapest (ID: {budapest_id}, lat: {budapest_lat}, lon: {budapest_lon})")
                
                # Get all mesters
                result = conn.execute(text("SELECT COUNT(*) FROM mesters"))
                mester_count = result.fetchone()[0]
                print(f"📊 Found {mester_count} mesters to update")
                
                # Delete all existing coverage areas
                result = conn.execute(text("DELETE FROM mester_coverage_areas"))
                deleted = result.rowcount
                print(f"🗑️  Deleted {deleted} existing coverage areas")
                
                # Add Budapest coverage for all mesters
                result = conn.execute(text("""
                    INSERT INTO mester_coverage_areas (id, mester_id, city_id, radius_km, priority)
                    SELECT gen_random_uuid(), id, :budapest_id, 50, 10
                    FROM mesters
                """), {"budapest_id": budapest_id})
                
                added = result.rowcount
                print(f"✅ Added Budapest coverage to {added} mesters (50km radius)")
                
                # Update mesters' home city and coordinates to Budapest
                result = conn.execute(text("""
                    UPDATE mesters
                    SET home_city_id = :budapest_id,
                        lat = :budapest_lat,
                        lon = :budapest_lon
                    WHERE id IN (SELECT mester_id FROM mester_coverage_areas WHERE city_id = :budapest_id)
                """), {"budapest_id": budapest_id, "budapest_lat": budapest_lat, "budapest_lon": budapest_lon})
                
                updated_coords = result.rowcount
                print(f"✅ Updated {updated_coords} mesters to Budapest coordinates")
                
                # Update mester profiles' coverage
                conn.execute(text("DELETE FROM mester_profile_coverage"))
                result = conn.execute(text("""
                    INSERT INTO mester_profile_coverage (id, profile_id, city_id, radius_km, priority)
                    SELECT gen_random_uuid(), mp.id, :budapest_id, 50, 10
                    FROM mester_profiles mp
                """), {"budapest_id": budapest_id})
                
                profile_coverage = result.rowcount
                print(f"✅ Updated {profile_coverage} mester profile coverages")
                
                # Commit
                trans.commit()
                
                print("\n" + "=" * 60)
                print("🎉 Successfully updated all mesters to serve Budapest!")
                print(f"   {added} mesters now serve Budapest with 50km radius")
                print("=" * 60)
                
            except Exception as e:
                trans.rollback()
                raise e
                
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    update_mesters_to_budapest()

