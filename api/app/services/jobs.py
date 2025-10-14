"""
Job/Project Management Service

Handles job lifecycle, milestones, documents, and CRM features
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from fastapi import HTTPException

from app.models.database import (
    Job, JobStatus, JobMilestone, MilestoneStatus,
    JobDocument, DocumentType, DocumentCategory,
    JobStatusHistory, JobNote,
    Request, Appointment, User, Mester, MessageThread,
    RequestStatus
)


class JobService:
    """Service for managing jobs and projects"""
    
    # ========== Job Management ==========
    
    @staticmethod
    def create_job(
        db: Session,
        request_id: UUID,
        mester_id: UUID,
        customer_user_id: UUID,
        title: str,
        description: Optional[str] = None,
        appointment_id: Optional[UUID] = None,
        thread_id: Optional[UUID] = None,
        estimated_cost: Optional[float] = None,
        scheduled_start_date: Optional[datetime] = None,
        scheduled_end_date: Optional[datetime] = None,
        location: Optional[str] = None,
        location_address: Optional[str] = None,
    ) -> Job:
        """Create a new job"""
        
        # Verify request exists
        request = db.query(Request).filter(Request.id == request_id).first()
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Verify mester exists
        mester = db.query(Mester).filter(Mester.id == mester_id).first()
        if not mester:
            raise HTTPException(status_code=404, detail="Mester not found")
        
        # Verify customer exists
        customer = db.query(User).filter(User.id == customer_user_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Create job
        job = Job(
            request_id=request_id,
            appointment_id=appointment_id,
            mester_id=mester_id,
            customer_user_id=customer_user_id,
            thread_id=thread_id,
            title=title,
            description=description,
            status=JobStatus.PENDING,
            scheduled_start_date=scheduled_start_date,
            scheduled_end_date=scheduled_end_date,
            estimated_cost=estimated_cost,
            location=location,
            location_address=location_address,
        )
        
        db.add(job)
        db.flush()
        
        # Record initial status in history
        JobService._record_status_change(
            db=db,
            job_id=job.id,
            previous_status=None,
            new_status=JobStatus.PENDING.value,
            changed_by_type="system",
            notes="Job created"
        )
        
        db.commit()
        db.refresh(job)
        
        return job
    
    @staticmethod
    def create_job_from_appointment(
        db: Session,
        appointment_id: UUID,
        title: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Job:
        """Create a job automatically from a completed appointment"""
        
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Check if job already exists for this appointment
        existing_job = db.query(Job).filter(Job.appointment_id == appointment_id).first()
        if existing_job:
            return existing_job
        
        # Auto-generate title if not provided
        if not title:
            request = db.query(Request).filter(Request.id == appointment.request_id).first()
            if request and request.service:
                title = f"{request.service.name} - {appointment.scheduled_start.strftime('%Y-%m-%d')}"
            else:
                title = f"Job - {appointment.scheduled_start.strftime('%Y-%m-%d')}"
        
        return JobService.create_job(
            db=db,
            request_id=appointment.request_id,
            mester_id=appointment.mester_id,
            customer_user_id=appointment.customer_user_id,
            title=title,
            description=description or appointment.mester_notes,
            appointment_id=appointment_id,
            thread_id=appointment.thread_id,
            scheduled_start_date=appointment.scheduled_start,
            scheduled_end_date=appointment.scheduled_end,
            location=appointment.location,
            location_address=appointment.location_address,
        )
    
    @staticmethod
    def get_job(db: Session, job_id: UUID) -> Optional[Job]:
        """Get a job by ID"""
        return db.query(Job).filter(Job.id == job_id).first()
    
    @staticmethod
    def list_jobs(
        db: Session,
        mester_id: Optional[UUID] = None,
        customer_user_id: Optional[UUID] = None,
        status: Optional[JobStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Job]:
        """List jobs with filters"""
        
        query = db.query(Job)
        
        if mester_id:
            query = query.filter(Job.mester_id == mester_id)
        
        if customer_user_id:
            query = query.filter(Job.customer_user_id == customer_user_id)
        
        if status:
            query = query.filter(Job.status == status)
        
        query = query.order_by(desc(Job.created_at))
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def update_job_status(
        db: Session,
        job_id: UUID,
        new_status: JobStatus,
        changed_by_type: str,  # "customer", "mester", or "system"
        changed_by_user_id: Optional[UUID] = None,
        changed_by_mester_id: Optional[UUID] = None,
        notes: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> Job:
        """Update job status and record in history"""
        
        job = JobService.get_job(db, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        previous_status = job.status.value if job.status else None
        
        # Update job status
        job.status = new_status
        
        # Update timestamps based on status
        now = datetime.now(timezone.utc)
        
        if new_status == JobStatus.IN_PROGRESS and not job.actual_start_date:
            job.actual_start_date = now
        
        elif new_status == JobStatus.COMPLETED:
            if not job.actual_end_date:
                job.actual_end_date = now
            
            # Track when mester marked it complete
            if changed_by_type == "mester" and not job.mester_marked_complete_at:
                job.mester_marked_complete_at = now
        
        # Record status change
        JobService._record_status_change(
            db=db,
            job_id=job_id,
            previous_status=previous_status,
            new_status=new_status.value,
            changed_by_type=changed_by_type,
            changed_by_user_id=changed_by_user_id,
            changed_by_mester_id=changed_by_mester_id,
            notes=notes,
            reason=reason,
        )
        
        db.commit()
        db.refresh(job)
        
        return job
    
    @staticmethod
    def update_job_details(
        db: Session,
        job_id: UUID,
        title: Optional[str] = None,
        description: Optional[str] = None,
        estimated_cost: Optional[float] = None,
        final_cost: Optional[float] = None,
        scheduled_start_date: Optional[datetime] = None,
        scheduled_end_date: Optional[datetime] = None,
        location: Optional[str] = None,
        location_address: Optional[str] = None,
    ) -> Job:
        """Update job details"""
        
        job = JobService.get_job(db, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if title is not None:
            job.title = title
        if description is not None:
            job.description = description
        if estimated_cost is not None:
            job.estimated_cost = estimated_cost
        if final_cost is not None:
            job.final_cost = final_cost
        if scheduled_start_date is not None:
            job.scheduled_start_date = scheduled_start_date
        if scheduled_end_date is not None:
            job.scheduled_end_date = scheduled_end_date
        if location is not None:
            job.location = location
        if location_address is not None:
            job.location_address = location_address
        
        db.commit()
        db.refresh(job)
        
        return job
    
    @staticmethod
    def add_customer_feedback(
        db: Session,
        job_id: UUID,
        rating: int,
        feedback: Optional[str] = None,
    ) -> Job:
        """Add customer satisfaction rating and feedback"""
        
        job = JobService.get_job(db, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if rating < 1 or rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
        job.customer_satisfaction_rating = rating
        job.customer_feedback = feedback
        
        db.commit()
        db.refresh(job)
        
        return job
    
    # ========== Milestone Management ==========
    
    @staticmethod
    def create_milestone(
        db: Session,
        job_id: UUID,
        title: str,
        description: Optional[str] = None,
        order_index: Optional[int] = None,
        scheduled_start: Optional[datetime] = None,
        scheduled_end: Optional[datetime] = None,
    ) -> JobMilestone:
        """Create a new milestone for a job"""
        
        job = JobService.get_job(db, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Auto-assign order if not provided
        if order_index is None:
            max_order = db.query(JobMilestone).filter(
                JobMilestone.job_id == job_id
            ).count()
            order_index = max_order
        
        milestone = JobMilestone(
            job_id=job_id,
            title=title,
            description=description,
            status=MilestoneStatus.PENDING,
            order_index=order_index,
            scheduled_start=scheduled_start,
            scheduled_end=scheduled_end,
        )
        
        db.add(milestone)
        db.commit()
        db.refresh(milestone)
        
        return milestone
    
    @staticmethod
    def list_milestones(db: Session, job_id: UUID) -> List[JobMilestone]:
        """List all milestones for a job in order"""
        return db.query(JobMilestone).filter(
            JobMilestone.job_id == job_id
        ).order_by(asc(JobMilestone.order_index)).all()
    
    @staticmethod
    def update_milestone_status(
        db: Session,
        milestone_id: UUID,
        new_status: MilestoneStatus,
        completion_percentage: Optional[int] = None,
        completion_notes: Optional[str] = None,
    ) -> JobMilestone:
        """Update milestone status"""
        
        milestone = db.query(JobMilestone).filter(JobMilestone.id == milestone_id).first()
        if not milestone:
            raise HTTPException(status_code=404, detail="Milestone not found")
        
        milestone.status = new_status
        
        now = datetime.now(timezone.utc)
        
        if new_status == MilestoneStatus.IN_PROGRESS and not milestone.actual_start:
            milestone.actual_start = now
        
        elif new_status == MilestoneStatus.COMPLETED:
            if not milestone.actual_end:
                milestone.actual_end = now
            if completion_percentage is None:
                milestone.completion_percentage = 100
        
        if completion_percentage is not None:
            milestone.completion_percentage = completion_percentage
        
        if completion_notes is not None:
            milestone.completion_notes = completion_notes
        
        db.commit()
        db.refresh(milestone)
        
        return milestone
    
    @staticmethod
    def update_milestone_order(
        db: Session,
        job_id: UUID,
        milestone_orders: List[Dict[str, Any]],  # [{"id": UUID, "order": int}, ...]
    ) -> List[JobMilestone]:
        """Reorder milestones"""
        
        for item in milestone_orders:
            milestone = db.query(JobMilestone).filter(
                and_(
                    JobMilestone.id == item["id"],
                    JobMilestone.job_id == job_id
                )
            ).first()
            
            if milestone:
                milestone.order_index = item["order"]
        
        db.commit()
        
        return JobService.list_milestones(db, job_id)
    
    # ========== Document Management ==========
    
    @staticmethod
    def upload_document(
        db: Session,
        job_id: UUID,
        file_name: str,
        file_url: str,
        file_type: str,
        file_size: Optional[int] = None,
        document_type: DocumentType = DocumentType.OTHER,
        category: DocumentCategory = DocumentCategory.OTHER,
        title: Optional[str] = None,
        description: Optional[str] = None,
        uploaded_by_type: str = "mester",  # "customer" or "mester"
        uploaded_by_user_id: Optional[UUID] = None,
        uploaded_by_mester_id: Optional[UUID] = None,
        milestone_id: Optional[UUID] = None,
        is_visible_to_customer: bool = True,
    ) -> JobDocument:
        """Upload a document/photo to a job"""
        
        job = JobService.get_job(db, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        document = JobDocument(
            job_id=job_id,
            milestone_id=milestone_id,
            file_name=file_name,
            file_url=file_url,
            file_size=file_size,
            file_type=file_type,
            document_type=document_type,
            category=category,
            title=title,
            description=description,
            uploaded_by_type=uploaded_by_type,
            uploaded_by_user_id=uploaded_by_user_id,
            uploaded_by_mester_id=uploaded_by_mester_id,
            is_visible_to_customer=is_visible_to_customer,
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        return document
    
    @staticmethod
    def list_documents(
        db: Session,
        job_id: UUID,
        category: Optional[DocumentCategory] = None,
        document_type: Optional[DocumentType] = None,
        milestone_id: Optional[UUID] = None,
        visible_to_customer_only: bool = False,
    ) -> List[JobDocument]:
        """List documents for a job"""
        
        query = db.query(JobDocument).filter(JobDocument.job_id == job_id)
        
        if category:
            query = query.filter(JobDocument.category == category)
        
        if document_type:
            query = query.filter(JobDocument.document_type == document_type)
        
        if milestone_id:
            query = query.filter(JobDocument.milestone_id == milestone_id)
        
        if visible_to_customer_only:
            query = query.filter(JobDocument.is_visible_to_customer == True)
        
        return query.order_by(desc(JobDocument.created_at)).all()
    
    @staticmethod
    def delete_document(db: Session, document_id: UUID) -> bool:
        """Delete a document"""
        
        document = db.query(JobDocument).filter(JobDocument.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        db.delete(document)
        db.commit()
        
        return True
    
    # ========== Note Management (CRM) ==========
    
    @staticmethod
    def add_note(
        db: Session,
        job_id: UUID,
        content: str,
        title: Optional[str] = None,
        created_by_type: str = "mester",  # "customer" or "mester"
        created_by_user_id: Optional[UUID] = None,
        created_by_mester_id: Optional[UUID] = None,
        is_private: bool = False,
        is_pinned: bool = False,
    ) -> JobNote:
        """Add a note to a job"""
        
        job = JobService.get_job(db, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        note = JobNote(
            job_id=job_id,
            title=title,
            content=content,
            created_by_type=created_by_type,
            created_by_user_id=created_by_user_id,
            created_by_mester_id=created_by_mester_id,
            is_private=is_private,
            is_pinned=is_pinned,
        )
        
        db.add(note)
        db.commit()
        db.refresh(note)
        
        return note
    
    @staticmethod
    def list_notes(
        db: Session,
        job_id: UUID,
        include_private: bool = False,
    ) -> List[JobNote]:
        """List notes for a job"""
        
        query = db.query(JobNote).filter(JobNote.job_id == job_id)
        
        if not include_private:
            query = query.filter(JobNote.is_private == False)
        
        # Pinned notes first, then by date
        query = query.order_by(
            desc(JobNote.is_pinned),
            desc(JobNote.created_at)
        )
        
        return query.all()
    
    @staticmethod
    def update_note(
        db: Session,
        note_id: UUID,
        title: Optional[str] = None,
        content: Optional[str] = None,
        is_pinned: Optional[bool] = None,
    ) -> JobNote:
        """Update a note"""
        
        note = db.query(JobNote).filter(JobNote.id == note_id).first()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        if title is not None:
            note.title = title
        if content is not None:
            note.content = content
        if is_pinned is not None:
            note.is_pinned = is_pinned
        
        db.commit()
        db.refresh(note)
        
        return note
    
    @staticmethod
    def delete_note(db: Session, note_id: UUID) -> bool:
        """Delete a note"""
        
        note = db.query(JobNote).filter(JobNote.id == note_id).first()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        db.delete(note)
        db.commit()
        
        return True
    
    # ========== Status History ==========
    
    @staticmethod
    def _record_status_change(
        db: Session,
        job_id: UUID,
        previous_status: Optional[str],
        new_status: str,
        changed_by_type: str,
        changed_by_user_id: Optional[UUID] = None,
        changed_by_mester_id: Optional[UUID] = None,
        notes: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> JobStatusHistory:
        """Record a status change in history (internal method)"""
        
        history = JobStatusHistory(
            job_id=job_id,
            previous_status=previous_status,
            new_status=new_status,
            changed_by_type=changed_by_type,
            changed_by_user_id=changed_by_user_id,
            changed_by_mester_id=changed_by_mester_id,
            notes=notes,
            reason=reason,
        )
        
        db.add(history)
        db.flush()
        
        return history
    
    @staticmethod
    def get_status_history(db: Session, job_id: UUID) -> List[JobStatusHistory]:
        """Get status change history for a job"""
        
        return db.query(JobStatusHistory).filter(
            JobStatusHistory.job_id == job_id
        ).order_by(desc(JobStatusHistory.created_at)).all()
    
    # ========== Job Analytics/Summary ==========
    
    @staticmethod
    def get_job_summary(db: Session, job_id: UUID) -> Dict[str, Any]:
        """Get a comprehensive summary of a job"""
        
        job = JobService.get_job(db, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        milestones = JobService.list_milestones(db, job_id)
        documents = JobService.list_documents(db, job_id)
        notes = JobService.list_notes(db, job_id)
        history = JobService.get_status_history(db, job_id)
        
        # Calculate progress
        total_milestones = len(milestones)
        completed_milestones = sum(1 for m in milestones if m.status == MilestoneStatus.COMPLETED)
        progress_percentage = (completed_milestones / total_milestones * 100) if total_milestones > 0 else 0
        
        # Document counts
        photo_count = sum(1 for d in documents if d.document_type == DocumentType.PHOTO)
        document_count = len(documents) - photo_count
        
        return {
            "job": job,
            "milestones": milestones,
            "milestone_summary": {
                "total": total_milestones,
                "completed": completed_milestones,
                "in_progress": sum(1 for m in milestones if m.status == MilestoneStatus.IN_PROGRESS),
                "pending": sum(1 for m in milestones if m.status == MilestoneStatus.PENDING),
            },
            "progress_percentage": progress_percentage,
            "documents": {
                "total": len(documents),
                "photos": photo_count,
                "documents": document_count,
                "by_category": {
                    "before": sum(1 for d in documents if d.category == DocumentCategory.BEFORE),
                    "during": sum(1 for d in documents if d.category == DocumentCategory.DURING),
                    "after": sum(1 for d in documents if d.category == DocumentCategory.AFTER),
                    "invoice": sum(1 for d in documents if d.category == DocumentCategory.INVOICE),
                }
            },
            "notes_count": len(notes),
            "status_history": history,
        }
    
    @staticmethod
    def get_mester_job_stats(db: Session, mester_id: UUID) -> Dict[str, Any]:
        """Get job statistics for a mester (CRM dashboard)"""
        
        jobs = db.query(Job).filter(Job.mester_id == mester_id).all()
        
        total_jobs = len(jobs)
        active_jobs = sum(1 for j in jobs if j.status in [JobStatus.PENDING, JobStatus.IN_PROGRESS])
        completed_jobs = sum(1 for j in jobs if j.status == JobStatus.COMPLETED)
        
        # Calculate average rating
        rated_jobs = [j for j in jobs if j.customer_satisfaction_rating is not None]
        avg_rating = sum(j.customer_satisfaction_rating for j in rated_jobs) / len(rated_jobs) if rated_jobs else None
        
        # Revenue stats
        total_revenue = sum(j.final_cost or 0 for j in jobs if j.final_cost)
        estimated_pipeline = sum(j.estimated_cost or 0 for j in jobs if j.status in [JobStatus.PENDING, JobStatus.IN_PROGRESS] and j.estimated_cost)
        
        return {
            "total_jobs": total_jobs,
            "active_jobs": active_jobs,
            "completed_jobs": completed_jobs,
            "cancelled_jobs": sum(1 for j in jobs if j.status == JobStatus.CANCELLED),
            "average_rating": avg_rating,
            "total_revenue": total_revenue,
            "estimated_pipeline": estimated_pipeline,
            "jobs_by_status": {
                "pending": sum(1 for j in jobs if j.status == JobStatus.PENDING),
                "in_progress": sum(1 for j in jobs if j.status == JobStatus.IN_PROGRESS),
                "on_hold": sum(1 for j in jobs if j.status == JobStatus.ON_HOLD),
                "completed": completed_jobs,
                "cancelled": sum(1 for j in jobs if j.status == JobStatus.CANCELLED),
            }
        }

