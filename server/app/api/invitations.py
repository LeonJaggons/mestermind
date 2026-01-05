from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.invitation import Invitation, InvitationStatus
from app.models.job import Job, JobStatus
from app.models.pro_profile import ProProfile
from app.schemas.invitation import InvitationCreate, InvitationUpdate, InvitationResponse, InvitationWithDetails
from sqlalchemy.sql import func

router = APIRouter()


@router.post("/", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
def create_invitation(invitation: InvitationCreate, db: Session = Depends(get_db)):
    """Create a new invitation from a customer to a pro for a specific job"""
    
    # Verify job exists and is open
    job = db.query(Job).filter(Job.id == invitation.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != JobStatus.open:
        raise HTTPException(status_code=400, detail="Job must be in 'open' status to send invitations")
    
    # Verify pro profile exists
    pro_profile = db.query(ProProfile).filter(ProProfile.id == invitation.pro_profile_id).first()
    if not pro_profile:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    
    # Check if invitation already exists
    existing_invitation = db.query(Invitation).filter(
        Invitation.job_id == invitation.job_id,
        Invitation.pro_profile_id == invitation.pro_profile_id
    ).first()
    
    if existing_invitation:
        raise HTTPException(status_code=400, detail="Invitation already exists for this job and pro")
    
    # Create invitation
    db_invitation = Invitation(
        job_id=invitation.job_id,
        pro_profile_id=invitation.pro_profile_id,
        status=InvitationStatus.pending
    )
    
    db.add(db_invitation)
    db.commit()
    db.refresh(db_invitation)
    
    return db_invitation


@router.get("/", response_model=List[InvitationResponse])
def get_invitations(
    job_id: int = None,
    pro_profile_id: int = None,
    status: InvitationStatus = None,
    db: Session = Depends(get_db)
):
    """Get invitations with optional filters"""
    query = db.query(Invitation)
    
    if job_id:
        query = query.filter(Invitation.job_id == job_id)
    
    if pro_profile_id:
        query = query.filter(Invitation.pro_profile_id == pro_profile_id)
    
    if status:
        query = query.filter(Invitation.status == status)
    
    return query.all()


@router.get("/{invitation_id}", response_model=InvitationResponse)
def get_invitation(invitation_id: int, db: Session = Depends(get_db)):
    """Get a specific invitation by ID"""
    invitation = db.query(Invitation).filter(Invitation.id == invitation_id).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    return invitation


@router.put("/{invitation_id}", response_model=InvitationResponse)
def update_invitation(invitation_id: int, invitation_update: InvitationUpdate, db: Session = Depends(get_db)):
    """Update an invitation (e.g., mark as viewed, accept, decline)"""
    db_invitation = db.query(Invitation).filter(Invitation.id == invitation_id).first()
    if not db_invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    update_data = invitation_update.model_dump(exclude_unset=True)
    
    # If status is being changed to accepted or declined, set responded_at
    if "status" in update_data and update_data["status"] in [InvitationStatus.accepted, InvitationStatus.declined]:
        update_data["responded_at"] = func.now()
    
    for field, value in update_data.items():
        setattr(db_invitation, field, value)
    
    db.commit()
    db.refresh(db_invitation)
    
    return db_invitation


@router.delete("/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invitation(invitation_id: int, db: Session = Depends(get_db)):
    """Delete an invitation"""
    db_invitation = db.query(Invitation).filter(Invitation.id == invitation_id).first()
    if not db_invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    db.delete(db_invitation)
    db.commit()
    
    return None
