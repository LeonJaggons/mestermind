from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.archived_conversation import ArchivedConversation
from app.models.pro_profile import ProProfile
from app.models.job import Job
from app.models.user import User
from pydantic import BaseModel

router = APIRouter()


class ArchiveConversationRequest(BaseModel):
    pro_profile_id: int
    job_id: int


@router.post("/", status_code=status.HTTP_201_CREATED)
def archive_conversation(request: ArchiveConversationRequest, db: Session = Depends(get_db)):
    """Archive a conversation for a pro"""
    
    # Verify pro profile exists
    pro_profile = db.query(ProProfile).filter(ProProfile.id == request.pro_profile_id).first()
    if not pro_profile:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    
    # Verify job exists
    job = db.query(Job).filter(Job.id == request.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check if already archived
    existing = db.query(ArchivedConversation).filter(
        ArchivedConversation.pro_profile_id == request.pro_profile_id,
        ArchivedConversation.job_id == request.job_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Conversation already archived")
    
    # Create archive record
    archived = ArchivedConversation(
        pro_profile_id=request.pro_profile_id,
        job_id=request.job_id
    )
    
    db.add(archived)
    db.commit()
    db.refresh(archived)
    
    return {"message": "Conversation archived successfully", "id": archived.id}


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
def unarchive_conversation(request: ArchiveConversationRequest, db: Session = Depends(get_db)):
    """Unarchive a conversation for a pro"""
    
    # Find archived conversation
    archived = db.query(ArchivedConversation).filter(
        ArchivedConversation.pro_profile_id == request.pro_profile_id,
        ArchivedConversation.job_id == request.job_id
    ).first()
    
    if not archived:
        raise HTTPException(status_code=404, detail="Conversation not found in archive")
    
    db.delete(archived)
    db.commit()
    
    return None


@router.get("/pro-profile/{pro_profile_id}", response_model=List[int])
def get_archived_job_ids(pro_profile_id: int, db: Session = Depends(get_db)):
    """Get list of archived job IDs for a pro profile"""
    
    archived = db.query(ArchivedConversation).filter(
        ArchivedConversation.pro_profile_id == pro_profile_id
    ).all()
    
    return [a.job_id for a in archived]


@router.get("/pro-profile/{pro_profile_id}/check/{job_id}")
def check_archived(pro_profile_id: int, job_id: int, db: Session = Depends(get_db)):
    """Check if a conversation is archived"""
    
    archived = db.query(ArchivedConversation).filter(
        ArchivedConversation.pro_profile_id == pro_profile_id,
        ArchivedConversation.job_id == job_id
    ).first()
    
    return {"archived": archived is not None}
