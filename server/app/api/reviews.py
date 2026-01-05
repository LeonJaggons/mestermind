from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models.review import Review
from app.models.job import Job
from app.models.pro_profile import ProProfile
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewUpdate, ReviewResponse
from sqlalchemy.sql import func

router = APIRouter()


@router.post("/", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(review: ReviewCreate, db: Session = Depends(get_db)):
    """Create a new review"""
    
    # Verify job exists
    job = db.query(Job).filter(Job.id == review.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Verify pro profile exists
    pro_profile = db.query(ProProfile).filter(ProProfile.id == review.pro_profile_id).first()
    if not pro_profile:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    
    # Verify user exists
    user = db.query(User).filter(User.id == review.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if review already exists for this job
    existing_review = db.query(Review).filter(
        Review.job_id == review.job_id,
        Review.user_id == review.user_id
    ).first()
    
    if existing_review:
        raise HTTPException(status_code=400, detail="Review already exists for this job")
    
    # Create review
    db_review = Review(**review.model_dump())
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    
    return db_review


@router.get("/", response_model=List[ReviewResponse])
def get_reviews(
    pro_profile_id: Optional[int] = Query(None),
    job_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get reviews with optional filters"""
    query = db.query(Review)
    
    if pro_profile_id:
        query = query.filter(Review.pro_profile_id == pro_profile_id)
    
    if job_id:
        query = query.filter(Review.job_id == job_id)
    
    if user_id:
        query = query.filter(Review.user_id == user_id)
    
    # Order by most recent first
    query = query.order_by(Review.created_at.desc())
    
    return query.offset(skip).limit(limit).all()


@router.get("/{review_id}", response_model=ReviewResponse)
def get_review(review_id: int, db: Session = Depends(get_db)):
    """Get a specific review by ID"""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return review


@router.put("/{review_id}", response_model=ReviewResponse)
def update_review(review_id: int, review_update: ReviewUpdate, db: Session = Depends(get_db)):
    """Update a review (e.g., add mester reply)"""
    db_review = db.query(Review).filter(Review.id == review_id).first()
    if not db_review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    update_data = review_update.model_dump(exclude_unset=True)
    
    # If mester_reply is being added, set replied_at timestamp
    if "mester_reply" in update_data and update_data["mester_reply"]:
        update_data["mester_replied_at"] = func.now()
    
    for field, value in update_data.items():
        setattr(db_review, field, value)
    
    db.commit()
    db.refresh(db_review)
    
    return db_review


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(review_id: int, db: Session = Depends(get_db)):
    """Delete a review"""
    db_review = db.query(Review).filter(Review.id == review_id).first()
    if not db_review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    db.delete(db_review)
    db.commit()
    
    return None
