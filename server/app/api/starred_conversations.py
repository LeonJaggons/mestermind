from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.starred_conversation import StarredConversation
from app.models.pro_profile import ProProfile
from app.models.job import Job
from pydantic import BaseModel

router = APIRouter()


class StarConversationRequest(BaseModel):
    pro_profile_id: int
    job_id: int


@router.post("/", status_code=status.HTTP_201_CREATED)
def star_conversation(request: StarConversationRequest, db: Session = Depends(get_db)):
    """Star a conversation for a pro"""
    
    # Verify pro profile exists
    pro_profile = db.query(ProProfile).filter(ProProfile.id == request.pro_profile_id).first()
    if not pro_profile:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    
    # Verify job exists
    job = db.query(Job).filter(Job.id == request.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check if already starred
    existing = db.query(StarredConversation).filter(
        StarredConversation.pro_profile_id == request.pro_profile_id,
        StarredConversation.job_id == request.job_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Conversation already starred")
    
    # Create star record
    starred = StarredConversation(
        pro_profile_id=request.pro_profile_id,
        job_id=request.job_id
    )
    
    db.add(starred)
    db.commit()
    db.refresh(starred)
    
    return {"message": "Conversation starred successfully", "id": starred.id}


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
def unstar_conversation(request: StarConversationRequest, db: Session = Depends(get_db)):
    """Unstar a conversation for a pro"""
    
    # Find starred conversation
    starred = db.query(StarredConversation).filter(
        StarredConversation.pro_profile_id == request.pro_profile_id,
        StarredConversation.job_id == request.job_id
    ).first()
    
    if not starred:
        raise HTTPException(status_code=404, detail="Conversation not found in starred")
    
    db.delete(starred)
    db.commit()
    
    return None


@router.get("/pro-profile/{pro_profile_id}", response_model=List[int])
def get_starred_job_ids(pro_profile_id: int, db: Session = Depends(get_db)):
    """Get list of starred job IDs for a pro profile"""
    
    starred = db.query(StarredConversation).filter(
        StarredConversation.pro_profile_id == pro_profile_id
    ).all()
    
    return [s.job_id for s in starred]


@router.get("/pro-profile/{pro_profile_id}/check/{job_id}")
def check_starred(pro_profile_id: int, job_id: int, db: Session = Depends(get_db)):
    """Check if a conversation is starred"""
    
    starred = db.query(StarredConversation).filter(
        StarredConversation.pro_profile_id == pro_profile_id,
        StarredConversation.job_id == job_id
    ).first()
    
    return {"starred": starred is not None}
