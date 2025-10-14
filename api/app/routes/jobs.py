"""
Job/Project Management API Routes

Provides endpoints for managing jobs, milestones, documents, and CRM features
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.auth import get_current_user, get_current_mester
from app.services.jobs import JobService
from app.models.database import (
    JobStatus, MilestoneStatus, DocumentType, DocumentCategory,
    User, Mester
)


router = APIRouter(prefix="/api/jobs", tags=["jobs"])


# ========== Request/Response Models ==========

class JobCreate(BaseModel):
    request_id: UUID
    mester_id: UUID
    customer_user_id: UUID
    title: str
    description: Optional[str] = None
    appointment_id: Optional[UUID] = None
    thread_id: Optional[UUID] = None
    estimated_cost: Optional[float] = None
    scheduled_start_date: Optional[datetime] = None
    scheduled_end_date: Optional[datetime] = None
    location: Optional[str] = None
    location_address: Optional[str] = None


class JobFromAppointment(BaseModel):
    appointment_id: UUID
    title: Optional[str] = None
    description: Optional[str] = None


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    estimated_cost: Optional[float] = None
    final_cost: Optional[float] = None
    scheduled_start_date: Optional[datetime] = None
    scheduled_end_date: Optional[datetime] = None
    location: Optional[str] = None
    location_address: Optional[str] = None


class JobStatusUpdate(BaseModel):
    status: JobStatus
    notes: Optional[str] = None
    reason: Optional[str] = None


class CustomerFeedback(BaseModel):
    rating: int = Field(ge=1, le=5)
    feedback: Optional[str] = None


class MilestoneCreate(BaseModel):
    job_id: UUID
    title: str
    description: Optional[str] = None
    order_index: Optional[int] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None


class MilestoneStatusUpdate(BaseModel):
    status: MilestoneStatus
    completion_percentage: Optional[int] = Field(None, ge=0, le=100)
    completion_notes: Optional[str] = None


class MilestoneOrderUpdate(BaseModel):
    milestone_orders: List[dict]  # [{"id": UUID, "order": int}, ...]


class DocumentUpload(BaseModel):
    job_id: UUID
    file_name: str
    file_url: str
    file_type: str
    file_size: Optional[int] = None
    document_type: DocumentType = DocumentType.OTHER
    category: DocumentCategory = DocumentCategory.OTHER
    title: Optional[str] = None
    description: Optional[str] = None
    milestone_id: Optional[UUID] = None
    is_visible_to_customer: bool = True


class NoteCreate(BaseModel):
    job_id: UUID
    content: str
    title: Optional[str] = None
    is_private: bool = False
    is_pinned: bool = False


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_pinned: Optional[bool] = None


# ========== Job Endpoints ==========

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_job(
    job_data: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new job"""
    return JobService.create_job(db, **job_data.dict())


@router.post("/from-appointment", status_code=status.HTTP_201_CREATED)
async def create_job_from_appointment(
    job_data: JobFromAppointment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a job from an appointment"""
    return JobService.create_job_from_appointment(
        db,
        appointment_id=job_data.appointment_id,
        title=job_data.title,
        description=job_data.description,
    )


@router.get("/{job_id}")
async def get_job(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a job by ID"""
    job = JobService.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/")
async def list_jobs(
    mester_id: Optional[UUID] = None,
    customer_user_id: Optional[UUID] = None,
    status: Optional[JobStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List jobs with filters"""
    return JobService.list_jobs(
        db,
        mester_id=mester_id,
        customer_user_id=customer_user_id,
        status=status,
        skip=skip,
        limit=limit,
    )


@router.put("/{job_id}")
async def update_job(
    job_id: UUID,
    job_data: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update job details"""
    return JobService.update_job_details(db, job_id, **job_data.dict(exclude_unset=True))


@router.post("/{job_id}/status")
async def update_job_status(
    job_id: UUID,
    status_data: JobStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_mester: Optional[Mester] = Depends(get_current_mester),
):
    """Update job status"""
    
    # Determine who is making the change
    changed_by_type = "mester" if current_mester else "customer"
    changed_by_user_id = current_user.id if not current_mester else None
    changed_by_mester_id = current_mester.id if current_mester else None
    
    return JobService.update_job_status(
        db,
        job_id=job_id,
        new_status=status_data.status,
        changed_by_type=changed_by_type,
        changed_by_user_id=changed_by_user_id,
        changed_by_mester_id=changed_by_mester_id,
        notes=status_data.notes,
        reason=status_data.reason,
    )


@router.post("/{job_id}/feedback")
async def add_customer_feedback(
    job_id: UUID,
    feedback_data: CustomerFeedback,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add customer feedback and rating"""
    return JobService.add_customer_feedback(
        db,
        job_id=job_id,
        rating=feedback_data.rating,
        feedback=feedback_data.feedback,
    )


@router.get("/{job_id}/summary")
async def get_job_summary(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get comprehensive job summary"""
    return JobService.get_job_summary(db, job_id)


@router.get("/{job_id}/history")
async def get_job_history(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get job status history"""
    return JobService.get_status_history(db, job_id)


# ========== Milestone Endpoints ==========

@router.post("/milestones", status_code=status.HTTP_201_CREATED)
async def create_milestone(
    milestone_data: MilestoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new milestone"""
    return JobService.create_milestone(db, **milestone_data.dict())


@router.get("/{job_id}/milestones")
async def list_milestones(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all milestones for a job"""
    return JobService.list_milestones(db, job_id)


@router.post("/milestones/{milestone_id}/status")
async def update_milestone_status(
    milestone_id: UUID,
    status_data: MilestoneStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update milestone status"""
    return JobService.update_milestone_status(
        db,
        milestone_id=milestone_id,
        new_status=status_data.status,
        completion_percentage=status_data.completion_percentage,
        completion_notes=status_data.completion_notes,
    )


@router.put("/{job_id}/milestones/order")
async def update_milestone_order(
    job_id: UUID,
    order_data: MilestoneOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reorder milestones"""
    return JobService.update_milestone_order(
        db,
        job_id=job_id,
        milestone_orders=order_data.milestone_orders,
    )


# ========== Document Endpoints ==========

@router.post("/documents", status_code=status.HTTP_201_CREATED)
async def upload_document(
    doc_data: DocumentUpload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_mester: Optional[Mester] = Depends(get_current_mester),
):
    """Upload a document or photo"""
    
    # Determine uploader
    uploaded_by_type = "mester" if current_mester else "customer"
    uploaded_by_user_id = current_user.id if not current_mester else None
    uploaded_by_mester_id = current_mester.id if current_mester else None
    
    return JobService.upload_document(
        db,
        job_id=doc_data.job_id,
        file_name=doc_data.file_name,
        file_url=doc_data.file_url,
        file_type=doc_data.file_type,
        file_size=doc_data.file_size,
        document_type=doc_data.document_type,
        category=doc_data.category,
        title=doc_data.title,
        description=doc_data.description,
        uploaded_by_type=uploaded_by_type,
        uploaded_by_user_id=uploaded_by_user_id,
        uploaded_by_mester_id=uploaded_by_mester_id,
        milestone_id=doc_data.milestone_id,
        is_visible_to_customer=doc_data.is_visible_to_customer,
    )


@router.get("/{job_id}/documents")
async def list_documents(
    job_id: UUID,
    category: Optional[DocumentCategory] = None,
    document_type: Optional[DocumentType] = None,
    milestone_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_mester: Optional[Mester] = Depends(get_current_mester),
):
    """List documents for a job"""
    
    # Customers only see visible documents
    visible_to_customer_only = not current_mester
    
    return JobService.list_documents(
        db,
        job_id=job_id,
        category=category,
        document_type=document_type,
        milestone_id=milestone_id,
        visible_to_customer_only=visible_to_customer_only,
    )


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a document"""
    JobService.delete_document(db, document_id)
    return {"message": "Document deleted successfully"}


# ========== Note Endpoints (CRM) ==========

@router.post("/notes", status_code=status.HTTP_201_CREATED)
async def add_note(
    note_data: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_mester: Optional[Mester] = Depends(get_current_mester),
):
    """Add a note to a job"""
    
    # Determine note creator
    created_by_type = "mester" if current_mester else "customer"
    created_by_user_id = current_user.id if not current_mester else None
    created_by_mester_id = current_mester.id if current_mester else None
    
    # Only mesters can create private notes
    is_private = note_data.is_private and current_mester is not None
    
    return JobService.add_note(
        db,
        job_id=note_data.job_id,
        content=note_data.content,
        title=note_data.title,
        created_by_type=created_by_type,
        created_by_user_id=created_by_user_id,
        created_by_mester_id=created_by_mester_id,
        is_private=is_private,
        is_pinned=note_data.is_pinned,
    )


@router.get("/{job_id}/notes")
async def list_notes(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_mester: Optional[Mester] = Depends(get_current_mester),
):
    """List notes for a job"""
    
    # Only mesters see private notes
    include_private = current_mester is not None
    
    return JobService.list_notes(db, job_id, include_private=include_private)


@router.put("/notes/{note_id}")
async def update_note(
    note_id: UUID,
    note_data: NoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a note"""
    return JobService.update_note(
        db,
        note_id=note_id,
        title=note_data.title,
        content=note_data.content,
        is_pinned=note_data.is_pinned,
    )


@router.delete("/notes/{note_id}")
async def delete_note(
    note_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a note"""
    JobService.delete_note(db, note_id)
    return {"message": "Note deleted successfully"}


# ========== Analytics/Dashboard Endpoints ==========

@router.get("/mester/{mester_id}/stats")
async def get_mester_stats(
    mester_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_mester: Optional[Mester] = Depends(get_current_mester),
):
    """Get job statistics for a mester (CRM dashboard)"""
    
    # Only the mester themselves can view their stats
    if not current_mester or current_mester.id != mester_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return JobService.get_mester_job_stats(db, mester_id)

