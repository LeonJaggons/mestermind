"""
Scheduled cleanup endpoints for maintaining data hygiene
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Any

from app.core.database import get_db
from app.models.database import OnboardingDraft

router = APIRouter(prefix="/cleanup", tags=["cleanup"])


@router.post("/onboarding/abandoned")
async def cleanup_abandoned_onboarding(
    background_tasks: BackgroundTasks,
    days_old: int = 7,
    db: Session = Depends(get_db)
):
    """
    Clean up abandoned onboarding drafts older than specified days.
    This endpoint can be called by a cron job or scheduled task.
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days_old)
    
    # Find abandoned drafts (not submitted and older than specified days)
    abandoned_drafts = db.query(OnboardingDraft).filter(
        OnboardingDraft.is_submitted == False,
        OnboardingDraft.created_at < cutoff_date
    ).all()
    
    count = len(abandoned_drafts)
    
    if count == 0:
        return {
            "message": "No abandoned onboarding drafts found",
            "deleted_count": 0,
            "cutoff_date": cutoff_date.isoformat()
        }
    
    # Delete abandoned drafts
    for draft in abandoned_drafts:
        db.delete(draft)
    
    db.commit()
    
    return {
        "message": f"Cleaned up {count} abandoned onboarding drafts",
        "deleted_count": count,
        "cutoff_date": cutoff_date.isoformat()
    }


@router.post("/onboarding/by-email/{email}")
async def cleanup_onboarding_by_email(
    email: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Clean up all onboarding drafts for a specific email address.
    This is called when a user signs out or their session expires.
    """
    # Find all drafts for this email
    drafts = db.query(OnboardingDraft).filter(OnboardingDraft.email == email).all()
    
    count = len(drafts)
    
    if count == 0:
        return {
            "message": f"No onboarding drafts found for email {email}",
            "deleted_count": 0
        }
    
    # Delete all drafts for this email
    for draft in drafts:
        db.delete(draft)
    
    db.commit()
    
    return {
        "message": f"Cleaned up {count} onboarding drafts for email {email}",
        "deleted_count": count
    }


@router.get("/onboarding/stats")
async def get_onboarding_stats(db: Session = Depends(get_db)):
    """
    Get statistics about onboarding drafts for monitoring purposes.
    """
    total_drafts = db.query(OnboardingDraft).count()
    submitted_drafts = db.query(OnboardingDraft).filter(
        OnboardingDraft.is_submitted == True
    ).count()
    abandoned_drafts = db.query(OnboardingDraft).filter(
        OnboardingDraft.is_submitted == False
    ).count()
    
    # Get drafts by age
    cutoff_7_days = datetime.utcnow() - timedelta(days=7)
    cutoff_30_days = datetime.utcnow() - timedelta(days=30)
    
    old_abandoned = db.query(OnboardingDraft).filter(
        OnboardingDraft.is_submitted == False,
        OnboardingDraft.created_at < cutoff_7_days
    ).count()
    
    very_old_abandoned = db.query(OnboardingDraft).filter(
        OnboardingDraft.is_submitted == False,
        OnboardingDraft.created_at < cutoff_30_days
    ).count()
    
    return {
        "total_drafts": total_drafts,
        "submitted_drafts": submitted_drafts,
        "abandoned_drafts": abandoned_drafts,
        "abandoned_over_7_days": old_abandoned,
        "abandoned_over_30_days": very_old_abandoned,
        "submission_rate": round((submitted_drafts / total_drafts * 100) if total_drafts > 0 else 0, 2)
    }

