#!/usr/bin/env python3
"""
Script to safely remove all mester-related data from the database.

This script will:
1. Remove all mester-related data in the correct order to respect foreign key constraints
2. Set mester_id fields to NULL where appropriate
3. Provide detailed logging of what was removed
4. Allow for dry-run mode to preview changes

Usage:
    python remove_mesters.py [--dry-run] [--confirm]
"""

import os
import sys
import argparse
import logging
from typing import List, Dict, Any
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import DATABASE_URL

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MesterRemover:
    """Handles the removal of mester data from the database."""
    
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.engine = create_engine(DATABASE_URL)
        self.Session = sessionmaker(bind=self.engine)
        self.stats = {
            'tables_cleared': 0,
            'records_deleted': 0,
            'records_updated': 0,
            'errors': 0
        }
    
    def get_table_counts(self) -> Dict[str, int]:
        """Get current record counts for mester-related tables."""
        counts = {}
        inspector = inspect(self.engine)
        
        mester_tables = [
            'mesters',
            'mester_profiles',
            'mester_profile_services',
            'mester_profile_addresses',
            'mester_profile_coverage',
            'mester_profile_working_hours',
            'mester_profile_preferences',
            'mester_profile_budgets',
            'mester_services',
            'mester_coverage_areas',
            'mester_reviews',
            'offers',
            'message_threads',
            'messages',
            'notifications',
            'notification_preferences',
            'requests'
        ]
        
        for table_name in mester_tables:
            try:
                if inspector.has_table(table_name):
                    with self.engine.connect() as conn:
                        result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                        count = result.scalar()
                        counts[table_name] = count
                else:
                    counts[table_name] = 0
            except Exception as e:
                logger.warning(f"Could not get count for table {table_name}: {e}")
                counts[table_name] = 0
        
        return counts
    
    def execute_sql(self, sql: str, params: Dict[str, Any] = None) -> int:
        """Execute SQL and return number of affected rows."""
        if self.dry_run:
            logger.info(f"[DRY RUN] Would execute: {sql}")
            if params:
                logger.info(f"[DRY RUN] With params: {params}")
            return 0
        
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text(sql), params or {})
                conn.commit()
                return result.rowcount
        except SQLAlchemyError as e:
            logger.error(f"Error executing SQL: {sql}")
            logger.error(f"Error: {e}")
            self.stats['errors'] += 1
            return 0
    
    def remove_mester_data(self):
        """Remove all mester-related data in the correct order."""
        logger.info("Starting mester data removal...")
        
        if self.dry_run:
            logger.info("DRY RUN MODE - No actual changes will be made")
        
        # Show current counts
        logger.info("Current table counts:")
        counts = self.get_table_counts()
        for table, count in counts.items():
            logger.info(f"  {table}: {count} records")
        
        # Step 1: Remove dependent records first (in order of dependency)
        dependent_tables = [
            # Messages and notifications first
            ('messages', 'DELETE FROM messages WHERE sender_mester_id IS NOT NULL'),
            ('notification_logs', 'DELETE FROM notification_logs WHERE notification_id IN (SELECT id FROM notifications WHERE mester_id IS NOT NULL)'),
            ('notifications', 'DELETE FROM notifications WHERE mester_id IS NOT NULL'),
            ('notification_preferences', 'DELETE FROM notification_preferences WHERE mester_id IS NOT NULL'),
            
            # Message threads
            ('message_threads', 'DELETE FROM message_threads WHERE mester_id IS NOT NULL'),
            
            # Offers
            ('offers', 'DELETE FROM offers WHERE mester_id IS NOT NULL'),
            
            # Reviews
            ('mester_reviews', 'DELETE FROM mester_reviews'),
            
            # Coverage areas (both old and new)
            ('mester_coverage_areas', 'DELETE FROM mester_coverage_areas'),
            ('mester_profile_coverage', 'DELETE FROM mester_profile_coverage'),
            
            # Services (both old and new)
            ('mester_services', 'DELETE FROM mester_services'),
            ('mester_profile_services', 'DELETE FROM mester_profile_services'),
            
            # Profile-related tables
            ('mester_profile_working_hours', 'DELETE FROM mester_profile_working_hours'),
            ('mester_profile_preferences', 'DELETE FROM mester_profile_preferences'),
            ('mester_profile_budgets', 'DELETE FROM mester_profile_budgets'),
            ('mester_profile_addresses', 'DELETE FROM mester_profile_addresses'),
            
            # Main profile table
            ('mester_profiles', 'DELETE FROM mester_profiles'),
            
            # Main mester table
            ('mesters', 'DELETE FROM mesters'),
        ]
        
        for table_name, sql in dependent_tables:
            logger.info(f"Clearing table: {table_name}")
            affected_rows = self.execute_sql(sql)
            if affected_rows > 0:
                logger.info(f"  Removed {affected_rows} records from {table_name}")
                self.stats['records_deleted'] += affected_rows
            self.stats['tables_cleared'] += 1
        
        # Step 2: Update foreign key references to NULL
        update_queries = [
            ('requests', 'UPDATE requests SET mester_id = NULL WHERE mester_id IS NOT NULL'),
        ]
        
        for table_name, sql in update_queries:
            logger.info(f"Updating foreign key references in: {table_name}")
            affected_rows = self.execute_sql(sql)
            if affected_rows > 0:
                logger.info(f"  Updated {affected_rows} records in {table_name}")
                self.stats['records_updated'] += affected_rows
        
        # Show final counts
        logger.info("Final table counts:")
        final_counts = self.get_table_counts()
        for table, count in final_counts.items():
            logger.info(f"  {table}: {count} records")
        
        # Summary
        logger.info("Removal Summary:")
        logger.info(f"  Tables cleared: {self.stats['tables_cleared']}")
        logger.info(f"  Records deleted: {self.stats['records_deleted']}")
        logger.info(f"  Records updated: {self.stats['records_updated']}")
        logger.info(f"  Errors: {self.stats['errors']}")
        
        if self.stats['errors'] > 0:
            logger.warning(f"Completed with {self.stats['errors']} errors")
        else:
            logger.info("Mester data removal completed successfully!")


def main():
    """Main function to handle command line arguments and execute removal."""
    parser = argparse.ArgumentParser(description='Remove all mester data from the database')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Preview changes without making them')
    parser.add_argument('--confirm', action='store_true',
                       help='Confirm that you want to proceed with the removal')
    
    args = parser.parse_args()
    
    if not args.dry_run and not args.confirm:
        logger.error("This operation will permanently delete all mester data!")
        logger.error("Use --dry-run to preview changes or --confirm to proceed")
        sys.exit(1)
    
    try:
        remover = MesterRemover(dry_run=args.dry_run)
        remover.remove_mester_data()
        
        if not args.dry_run:
            logger.info("All mester data has been successfully removed from the database.")
        else:
            logger.info("Dry run completed. Use --confirm to execute the actual removal.")
            
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
