from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models.job import Job, JobStatus
from app.models.user import User
from app.models.service import Service
from app.models.pro_service import ProService
from app.models.pro_profile import ProProfile
from app.models.subscription import Subscription, SubscriptionStatus
from app.schemas.job import JobCreate, JobUpdate, JobResponse
from app.utils import notifications
from app.utils.geocoding import geocode_address, get_job_display_location
from datetime import datetime, timezone

router = APIRouter()


def notify_matching_pros(db: Session, job: Job):
    """
    Notify pros that match the job's service category about a new job opportunity.
    Only notifies pros with active subscriptions.
    """
    if not job.service_id or job.status != JobStatus.open:
        return
    
    try:
        # Find pros who provide this service
        pro_services = db.query(ProService).filter(
            ProService.service_id == job.service_id
        ).all()
        
        if not pro_services:
            return
        
        pro_profile_ids = [ps.pro_profile_id for ps in pro_services]
        
        # Get pros with active subscriptions
        active_subscriptions = db.query(Subscription).filter(
            Subscription.pro_profile_id.in_(pro_profile_ids),
            Subscription.status == SubscriptionStatus.active
        ).all()
        
        # Filter out expired subscriptions
        active_pro_ids = []
        for sub in active_subscriptions:
            if not sub.current_period_end or sub.current_period_end.replace(tzinfo=timezone.utc) >= datetime.now(timezone.utc):
                active_pro_ids.append(sub.pro_profile_id)
        
        if not active_pro_ids:
            return
        
        # Get pro profiles with user info
        pro_profiles = db.query(ProProfile).filter(
            ProProfile.id.in_(active_pro_ids)
        ).all()
        
        # Build notification lists
        pro_notifications = []  # List of (pro_id, firebase_uid)
        pro_emails = {}  # Dict of pro_id -> (email, name)
        
        for pro_profile in pro_profiles:
            user = db.query(User).filter(User.id == pro_profile.user_id).first()
            if user and user.firebase_uid:
                pro_notifications.append((user.id, user.firebase_uid))
                if user.email:
                    pro_emails[user.id] = (user.email, pro_profile.business_name or "Professional")
        
        # Send notifications
        if pro_notifications:
            notifications.notify_job_opened(
                pro_ids=pro_notifications,
                job_id=job.id,
                service_category=job.category or "service",
                city=job.city or "your area",
                pro_emails=pro_emails if pro_emails else None
            )
            print(f"Notified {len(pro_notifications)} pros about job {job.id}")
    
    except Exception as e:
        print(f"Error notifying pros about job {job.id}: {e}")


def enrich_job_response(job: Job) -> dict:
    """
    Enrich job data with display location based on appointment confirmation status.
    
    Args:
        job: Job model instance
    
    Returns:
        Dictionary with all job fields plus display_latitude, display_longitude, 
        and has_confirmed_appointment
    """
    job_dict = {
        "id": job.id,
        "user_id": job.user_id,
        "service_id": job.service_id,
        "description": job.description,
        "category": job.category,
        "city": job.city,
        "district": job.district,
        "street": job.street,
        "timing": job.timing,
        "budget": job.budget,
        "contact_name": job.contact_name,
        "contact_phone": job.contact_phone,
        "photos": job.photos,
        "status": job.status,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
        "exact_latitude": job.exact_latitude,
        "exact_longitude": job.exact_longitude,
    }
    
    # Check if job has confirmed appointment
    has_confirmed = job.has_confirmed_appointment()
    job_dict["has_confirmed_appointment"] = has_confirmed
    
    # Get display location (exact or obfuscated based on confirmation)
    display_location = get_job_display_location(job, has_confirmed)
    if display_location:
        job_dict["display_latitude"] = display_location[0]
        job_dict["display_longitude"] = display_location[1]
    else:
        job_dict["display_latitude"] = None
        job_dict["display_longitude"] = None
    
    return job_dict


@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(job: JobCreate, db: Session = Depends(get_db)):
    """Create a new job (can be draft or complete)"""
    # Verify user exists
    user = db.query(User).filter(User.id == job.user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify service exists if provided
    if job.service_id:
        service = db.query(Service).filter(Service.id == job.service_id).first()
        if service is None:
            raise HTTPException(status_code=404, detail="Service not found")
    
    # Determine status based on required fields
    job_data = job.model_dump()
    
    # Geocode the address to get exact coordinates
    if job_data.get('city'):
        coordinates = await geocode_address(
            city=job_data.get('city'),
            district=job_data.get('district'),
            street=job_data.get('street')
        )
        if coordinates:
            job_data['exact_latitude'] = coordinates[0]
            job_data['exact_longitude'] = coordinates[1]
    
    # Check if all required fields are filled for open status
    required_fields = ['description', 'category', 'city', 'district', 'timing']
    all_required_filled = all(job_data.get(field) for field in required_fields)
    
    if all_required_filled and job_data.get('status') != JobStatus.draft:
        job_data['status'] = JobStatus.open
    else:
        job_data['status'] = JobStatus.draft
    
    db_job = Job(**job_data)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    
    # Send notification to customer when job is created
    try:
        if user.firebase_uid and db_job.status == JobStatus.open:
            service_category = db_job.category or "service"
            notifications.notify_job_created(
                customer_id=user.id,
                customer_firebase_uid=user.firebase_uid,
                job_id=db_job.id,
                service_category=service_category,
                customer_email=user.email
            )
    except Exception as e:
        print(f"Failed to send job created notification: {e}")
    
    # Notify matching pros about the new job opportunity
    if db_job.status == JobStatus.open:
        notify_matching_pros(db, db_job)
    
    return JobResponse(**enrich_job_response(db_job))


@router.get("/", response_model=List[JobResponse])
def read_jobs(
    skip: int = 0, 
    limit: int = 100, 
    user_id: Optional[int] = None,
    status: Optional[JobStatus] = None,
    db: Session = Depends(get_db)
):
    """Retrieve jobs with optional filters"""
    query = db.query(Job)
    
    if user_id:
        query = query.filter(Job.user_id == user_id)
    
    if status:
        query = query.filter(Job.status == status)
    
    jobs = query.offset(skip).limit(limit).all()
    return [JobResponse(**enrich_job_response(job)) for job in jobs]


@router.get("/{job_id}", response_model=JobResponse)
def read_job(job_id: int, db: Session = Depends(get_db)):
    """Retrieve a specific job by ID"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobResponse(**enrich_job_response(job))


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(job_id: int, job_update: JobUpdate, db: Session = Depends(get_db)):
    """Update an existing job"""
    db_job = db.query(Job).filter(Job.id == job_id).first()
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    
    update_data = job_update.model_dump(exclude_unset=True)
    
    # Verify service exists if being updated and not null
    if "service_id" in update_data and update_data["service_id"] is not None:
        service = db.query(Service).filter(Service.id == update_data["service_id"]).first()
        if service is None:
            raise HTTPException(status_code=404, detail="Service not found")
    
    # Re-geocode if location fields are updated
    location_updated = any(field in update_data for field in ['city', 'district', 'street'])
    if location_updated:
        city = update_data.get('city') or db_job.city
        district = update_data.get('district') or db_job.district
        street = update_data.get('street') or db_job.street
        
        if city:
            coordinates = await geocode_address(city=city, district=district, street=street)
            if coordinates:
                update_data['exact_latitude'] = coordinates[0]
                update_data['exact_longitude'] = coordinates[1]
    
    for field, value in update_data.items():
        setattr(db_job, field, value)
    
    # Auto-update status to open if all required fields are now filled
    old_status = db_job.status
    if db_job.status == JobStatus.draft:
        required_fields = ['description', 'category', 'city', 'district', 'timing']
        all_required_filled = all(getattr(db_job, field) for field in required_fields)
        if all_required_filled:
            db_job.status = JobStatus.open
    
    db.commit()
    db.refresh(db_job)
    
    # Send notification when job status changes to open
    try:
        if old_status != JobStatus.open and db_job.status == JobStatus.open:
            user = db.query(User).filter(User.id == db_job.user_id).first()
            if user and user.firebase_uid:
                service_category = db_job.category or "service"
                notifications.notify_job_created(
                    customer_id=user.id,
                    customer_firebase_uid=user.firebase_uid,
                    job_id=db_job.id,
                    service_category=service_category
                )
            
            # Notify matching pros about the new job opportunity
            notify_matching_pros(db, db_job)
    except Exception as e:
        print(f"Failed to send job opened notification: {e}")
    
    return JobResponse(**enrich_job_response(db_job))


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(job_id: int, db: Session = Depends(get_db)):
    """Delete a job"""
    db_job = db.query(Job).filter(Job.id == job_id).first()
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    
    db.delete(db_job)
    db.commit()
    return None
