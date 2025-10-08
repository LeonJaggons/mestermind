#!/usr/bin/env python3
"""
Script to clean up abandoned onboarding drafts from the database.

This script will:
1. Remove onboarding drafts older than 7 days that haven't been submitted
2. Remove onboarding drafts for specific email addresses
3. Provide detailed logging of what was removed

Usage:
    python cleanup_abandoned_onboarding.py [--dry-run] [--days=7] [--email=user@example.com]
"""

import os
import sys
import argparse
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import DATABASE_URL
from app.models.database import OnboardingDraft

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class OnboardingCleanup:
    """Handles the cleanup of abandoned onboarding drafts."""
    
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.engine = create_engine(DATABASE_URL)
        self.Session = sessionmaker(bind=self.engine)
        self.stats = {
            'drafts_deleted': 0,
            'errors': 0
        }
    
    def get_abandoned_drafts(self, days_old: int = 7) -> List[OnboardingDraft]:
        """Get abandoned onboarding drafts older than specified days."""
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        with self.Session() as session:
            drafts = session.query(OnboardingDraft).filter(
                OnboardingDraft.is_submitted == False,
                OnboardingDraft.created_at < cutoff_date
            ).all()
            
        return drafts
    
    def get_drafts_by_email(self, email: str) -> List[OnboardingDraft]:
        """Get all onboarding drafts for a specific email."""
        with self.Session() as session:
            drafts = session.query(OnboardingDraft).filter(
                OnboardingDraft.email == email
            ).all()
            
        return drafts
    
    def delete_draft(self, draft: OnboardingDraft) -> bool:
        """Delete a specific onboarding draft."""
        if self.dry_run:
            logger.info(f"[DRY RUN] Would delete draft {draft.id} (email: {draft.email}, created: {draft.created_at})")
            return True
        
        try:
            with self.Session() as session:
                session.delete(draft)
                session.commit()
                logger.info(f"Deleted draft {draft.id} (email: {draft.email}, created: {draft.created_at})")
                return True
        except SQLAlchemyError as e:
            logger.error(f"Error deleting draft {draft.id}: {e}")
            self.stats['errors'] += 1
            return False
    
    def cleanup_abandoned_drafts(self, days_old: int = 7):
        """Clean up abandoned onboarding drafts."""
        logger.info(f"Looking for abandoned onboarding drafts older than {days_old} days...")
        
        abandoned_drafts = self.get_abandoned_drafts(days_old)
        
        if not abandoned_drafts:
            logger.info("No abandoned drafts found")
            return
        
        logger.info(f"Found {len(abandoned_drafts)} abandoned drafts")
        
        for draft in abandoned_drafts:
            if self.delete_draft(draft):
                self.stats['drafts_deleted'] += 1
        
        logger.info(f"Cleanup completed. Deleted {self.stats['drafts_deleted']} drafts")
        if self.stats['errors'] > 0:
            logger.warning(f"Completed with {self.stats['errors']} errors")
    
    def cleanup_drafts_by_email(self, email: str):
        """Clean up all onboarding drafts for a specific email."""
        logger.info(f"Looking for onboarding drafts for email: {email}")
        
        drafts = self.get_drafts_by_email(email)
        
        if not drafts:
            logger.info("No drafts found for this email")
            return
        
        logger.info(f"Found {len(drafts)} drafts for email {email}")
        
        for draft in drafts:
            if self.delete_draft(draft):
                self.stats['drafts_deleted'] += 1
        
        logger.info(f"Cleanup completed. Deleted {self.stats['drafts_deleted']} drafts for {email}")
        if self.stats['errors'] > 0:
            logger.warning(f"Completed with {self.stats['errors']} errors")
    
    def get_draft_stats(self):
        """Get statistics about onboarding drafts."""
        with self.Session() as session:
            total_drafts = session.query(OnboardingDraft).count()
            submitted_drafts = session.query(OnboardingDraft).filter(
                OnboardingDraft.is_submitted == True
            ).count()
            abandoned_drafts = session.query(OnboardingDraft).filter(
                OnboardingDraft.is_submitted == False
            ).count()
            
            # Get drafts by age
            cutoff_7_days = datetime.utcnow() - timedelta(days=7)
            cutoff_30_days = datetime.utcnow() - timedelta(days=30)
            
            old_abandoned = session.query(OnboardingDraft).filter(
                OnboardingDraft.is_submitted == False,
                OnboardingDraft.created_at < cutoff_7_days
            ).count()
            
            very_old_abandoned = session.query(OnboardingDraft).filter(
                OnboardingDraft.is_submitted == False,
                OnboardingDraft.created_at < cutoff_30_days
            ).count()
        
        logger.info("Onboarding Draft Statistics:")
        logger.info(f"  Total drafts: {total_drafts}")
        logger.info(f"  Submitted drafts: {submitted_drafts}")
        logger.info(f"  Abandoned drafts: {abandoned_drafts}")
        logger.info(f"  Abandoned > 7 days: {old_abandoned}")
        logger.info(f"  Abandoned > 30 days: {very_old_abandoned}")


def main():
    """Main function to handle command line arguments and execute cleanup."""
    parser = argparse.ArgumentParser(description='Clean up abandoned onboarding drafts')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Preview changes without making them')
    parser.add_argument('--days', type=int, default=7,
                       help='Number of days old to consider drafts abandoned (default: 7)')
    parser.add_argument('--email', type=str,
                       help='Clean up drafts for specific email address')
    parser.add_argument('--stats', action='store_true',
                       help='Show statistics about onboarding drafts')
    
    args = parser.parse_args()
    
    try:
        cleanup = OnboardingCleanup(dry_run=args.dry_run)
        
        if args.stats:
            cleanup.get_draft_stats()
            return
        
        if args.email:
            if not args.dry_run:
                logger.warning(f"This will permanently delete all onboarding drafts for {args.email}")
                confirm = input("Are you sure? (yes/no): ")
                if confirm.lower() != 'yes':
                    logger.info("Operation cancelled")
                    return
            
            cleanup.cleanup_drafts_by_email(args.email)
        else:
            if not args.dry_run:
                logger.warning(f"This will permanently delete abandoned onboarding drafts older than {args.days} days")
                confirm = input("Are you sure? (yes/no): ")
                if confirm.lower() != 'yes':
                    logger.info("Operation cancelled")
                    return
            
            cleanup.cleanup_abandoned_drafts(args.days)
        
        if not args.dry_run:
            logger.info("Cleanup completed successfully.")
        else:
            logger.info("Dry run completed. Use without --dry-run to execute the actual cleanup.")
            
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()

