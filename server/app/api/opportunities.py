from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, not_
from typing import List, Optional
from app.db.session import get_db
from app.models.job import Job, JobStatus
from app.models.pro_service import ProService
from app.models.appointment import Appointment
from app.models.subscription import Subscription, SubscriptionStatus
from app.schemas.job import JobResponse
from datetime import datetime, timezone

router = APIRouter()


@router.get("/pro-profile/{pro_profile_id}", response_model=List[JobResponse])
def get_opportunities(pro_profile_id: int, db: Session = Depends(get_db)):
    """
    Get open opportunities (jobs) for a pro that:
    1. Match services the pro provides
    2. Haven't been claimed by another pro with an appointment
    3. Are in 'open' status
    """
    # Check if pro has active subscription
    subscription = db.query(Subscription).filter(
        Subscription.pro_profile_id == pro_profile_id,
        Subscription.status == SubscriptionStatus.active
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=403,
            detail="Active subscription required to view opportunities"
        )
    
    # Check if subscription is not expired
    if subscription.current_period_end and subscription.current_period_end.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=403,
            detail="Subscription has expired. Please renew to continue viewing opportunities"
        )
    
    # Get all services this pro provides
    pro_services = db.query(ProService).filter(
        ProService.pro_profile_id == pro_profile_id
    ).all()
    
    if not pro_services:
        return []  # No services, no opportunities
    
    service_ids = [ps.service_id for ps in pro_services]
    
    # Get all open jobs that match pro's services
    open_jobs = db.query(Job).filter(
        Job.status == JobStatus.open,
        Job.service_id.in_(service_ids)
    ).all()
    
    # Get all job IDs that have appointments (claimed by any pro)
    claimed_job_ids_result = db.query(Appointment.job_id).distinct().all()
    claimed_job_ids_set = {row[0] for row in claimed_job_ids_result}
    
    # Filter out jobs that have appointments (already claimed)
    opportunities = [
        job for job in open_jobs
        if job.id not in claimed_job_ids_set
    ]
    
    return opportunities

