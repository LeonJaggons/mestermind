from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.db.session import get_db
from app.models.lead_purchase import LeadPurchase
from app.models.pro_profile import ProProfile
from app.models.job import Job
from app.schemas.lead_purchase import LeadPurchaseCreate, LeadPurchaseResponse
from app.utils import notifications

router = APIRouter()


@router.post("/", response_model=LeadPurchaseResponse, status_code=status.HTTP_201_CREATED)
def create_lead_purchase(
    purchase: LeadPurchaseCreate,
    pro_profile_id: int,
    db: Session = Depends(get_db)
):
    """
    Create a lead purchase record.
    This records that a pro has purchased access to a specific lead/job.
    """
    # Verify pro profile exists
    pro_profile = db.query(ProProfile).filter(ProProfile.id == pro_profile_id).first()
    if not pro_profile:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    
    # Verify job exists
    job = db.query(Job).filter(Job.id == purchase.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check if already purchased
    existing_purchase = db.query(LeadPurchase).filter(
        LeadPurchase.pro_profile_id == pro_profile_id,
        LeadPurchase.job_id == purchase.job_id
    ).first()
    
    if existing_purchase:
        raise HTTPException(
            status_code=400,
            detail="Lead already purchased for this job"
        )
    
    # Create lead purchase
    db_purchase = LeadPurchase(
        pro_profile_id=pro_profile_id,
        job_id=purchase.job_id,
        service_category=purchase.service_category,
        job_size=purchase.job_size,
        urgency=purchase.urgency,
        city_tier=purchase.city_tier,
        base_price_huf=purchase.base_price_huf,
        urgency_multiplier=purchase.urgency_multiplier,
        city_tier_multiplier=purchase.city_tier_multiplier,
        final_price_huf=purchase.final_price_huf,
        payment_status="completed",  # For now, assume payment is completed
        payment_completed_at=datetime.utcnow()
    )
    
    db.add(db_purchase)
    db.commit()
    db.refresh(db_purchase)
    
    # Send notification to pro about lead purchase
    try:
        if pro_profile.user and pro_profile.user.firebase_uid:
            notifications.notify_lead_purchased(
                pro_id=pro_profile.id,
                pro_firebase_uid=pro_profile.user.firebase_uid,
                job_id=purchase.job_id,
                service_category=purchase.service_category,
                pro_email=pro_profile.user.email if pro_profile.user else None,
                pro_name=pro_profile.business_name,
                lead_price_huf=purchase.final_price_huf
            )
    except Exception as e:
        print(f"Failed to send lead purchase notification: {e}")
    
    return db_purchase


@router.get("/", response_model=List[LeadPurchaseResponse])
def get_lead_purchases(
    pro_profile_id: Optional[int] = None,
    job_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get lead purchases with optional filters"""
    query = db.query(LeadPurchase)
    
    if pro_profile_id:
        query = query.filter(LeadPurchase.pro_profile_id == pro_profile_id)
    
    if job_id:
        query = query.filter(LeadPurchase.job_id == job_id)
    
    purchases = query.order_by(LeadPurchase.purchased_at.desc()).all()
    return purchases


@router.get("/check", response_model=dict)
def check_lead_purchase(
    pro_profile_id: int,
    job_id: int,
    db: Session = Depends(get_db)
):
    """
    Check if a pro has purchased access to a specific lead.
    Returns: {"purchased": true/false, "purchase": {...} or null}
    """
    purchase = db.query(LeadPurchase).filter(
        LeadPurchase.pro_profile_id == pro_profile_id,
        LeadPurchase.job_id == job_id
    ).first()
    
    if purchase:
        return {
            "purchased": True,
            "purchase": LeadPurchaseResponse.model_validate(purchase)
        }
    else:
        return {
            "purchased": False,
            "purchase": None
        }


@router.get("/{purchase_id}", response_model=LeadPurchaseResponse)
def get_lead_purchase(purchase_id: int, db: Session = Depends(get_db)):
    """Get a specific lead purchase by ID"""
    purchase = db.query(LeadPurchase).filter(LeadPurchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Lead purchase not found")
    
    return purchase
