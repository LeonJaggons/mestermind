"""
Service for handling appointment proposals, bookings, and calendar management
"""

import logging
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta, timezone, date, time
import uuid as _uuid

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException

from app.models.database import (
    AppointmentProposal,
    AppointmentProposalStatus,
    Appointment,
    AppointmentStatus,
    MessageThread,
    LeadPurchase,
    Request as RequestModel,
    MesterCalendar,
    MesterAvailabilitySlot,
    AppointmentReminder,
    ReminderStatus,
    User,
)

logger = logging.getLogger(__name__)


class AppointmentService:
    """Service for managing appointment proposals"""

    def __init__(self, db: Session):
        self.db = db

    def create_proposal(
        self,
        thread_id: _uuid.UUID,
        mester_id: _uuid.UUID,
        proposed_date: datetime,
        price: float,
        currency: str = "HUF",
        duration_minutes: Optional[int] = None,
        location: Optional[str] = None,
        notes: Optional[str] = None,
        offer_message: Optional[str] = None,
    ) -> AppointmentProposal:
        """
        Create a new appointment proposal from mester to customer with price quote
        
        Args:
            thread_id: Message thread ID
            mester_id: Mester making the proposal
            proposed_date: Proposed appointment date/time
            price: Price quote for the service
            currency: Currency code (default: HUF)
            duration_minutes: Optional duration in minutes
            location: Optional location details
            notes: Optional notes about the appointment
            offer_message: Optional message about the price/offer
            
        Returns:
            Created AppointmentProposal with linked Offer
            
        Raises:
            HTTPException: If thread not found, mester doesn't have access, or validation fails
        """
        
        # Verify thread exists
        thread = (
            self.db.query(MessageThread)
            .filter(MessageThread.id == thread_id)
            .first()
        )
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        # Verify mester belongs to this thread
        if thread.mester_id != mester_id:
            raise HTTPException(
                status_code=403,
                detail="Mester does not belong to this thread"
            )
        
        # Verify mester has purchased the lead
        purchase = (
            self.db.query(LeadPurchase)
            .filter(
                LeadPurchase.mester_id == mester_id,
                LeadPurchase.request_id == thread.request_id,
            )
            .first()
        )
        
        if not purchase:
            raise HTTPException(
                status_code=402,
                detail="You must purchase this lead before proposing an appointment"
            )
        
        # Validate proposed date is in the future
        if proposed_date <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=400,
                detail="Proposed date must be in the future"
            )
        
        # Set expiration (7 days from now)
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        # Create the Offer first
        from app.models.database import Offer as OfferModel, OfferStatus
        
        offer = OfferModel(
            request_id=thread.request_id,
            mester_id=mester_id,
            price=price,
            currency=currency,
            message=offer_message,
            status=OfferStatus.PENDING,
            expires_at=expires_at,
        )
        
        self.db.add(offer)
        self.db.flush()  # Flush to get offer.id
        
        # Create the proposal linked to the offer
        proposal = AppointmentProposal(
            thread_id=thread_id,
            mester_id=mester_id,
            request_id=thread.request_id,
            customer_user_id=thread.customer_user_id,
            offer_id=offer.id,
            proposed_date=proposed_date,
            duration_minutes=duration_minutes,
            location=location,
            notes=notes,
            status=AppointmentProposalStatus.PROPOSED,
            expires_at=expires_at,
        )
        
        self.db.add(proposal)
        self.db.commit()
        self.db.refresh(proposal)
        self.db.refresh(offer)
        
        logger.info(
            "Created appointment proposal %s with offer %s for thread %s",
            proposal.id,
            offer.id,
            thread_id,
        )
        
        return proposal

    def get_proposal(
        self,
        proposal_id: _uuid.UUID,
    ) -> Optional[AppointmentProposal]:
        """Get an appointment proposal by ID"""
        return (
            self.db.query(AppointmentProposal)
            .filter(AppointmentProposal.id == proposal_id)
            .first()
        )

    def list_proposals_for_thread(
        self,
        thread_id: _uuid.UUID,
        status: Optional[AppointmentProposalStatus] = None,
    ) -> List[AppointmentProposal]:
        """List all appointment proposals for a thread"""
        query = self.db.query(AppointmentProposal).filter(
            AppointmentProposal.thread_id == thread_id
        )
        
        if status:
            query = query.filter(AppointmentProposal.status == status)
        
        return query.order_by(AppointmentProposal.created_at.desc()).all()

    def list_proposals_for_mester(
        self,
        mester_id: _uuid.UUID,
        status: Optional[AppointmentProposalStatus] = None,
    ) -> List[AppointmentProposal]:
        """List all appointment proposals for a mester"""
        query = self.db.query(AppointmentProposal).filter(
            AppointmentProposal.mester_id == mester_id
        )
        
        if status:
            query = query.filter(AppointmentProposal.status == status)
        
        return query.order_by(AppointmentProposal.proposed_date.asc()).all()

    def accept_proposal(
        self,
        proposal_id: _uuid.UUID,
        customer_user_id: _uuid.UUID,
        response_message: Optional[str] = None,
    ) -> AppointmentProposal:
        """
        Accept an appointment proposal (customer action)
        
        Args:
            proposal_id: ID of the proposal to accept
            customer_user_id: Customer accepting the proposal
            response_message: Optional message from customer
            
        Returns:
            Updated AppointmentProposal
            
        Raises:
            HTTPException: If proposal not found or validation fails
        """
        
        proposal = self.get_proposal(proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        # Verify customer owns this proposal
        if proposal.customer_user_id != customer_user_id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to accept this proposal"
            )
        
        # Check if proposal is still valid
        if proposal.status != AppointmentProposalStatus.PROPOSED:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot accept proposal with status: {proposal.status.value}"
            )
        
        # Check if expired
        if proposal.expires_at and proposal.expires_at <= datetime.now(timezone.utc):
            proposal.status = AppointmentProposalStatus.EXPIRED
            self.db.commit()
            raise HTTPException(
                status_code=400,
                detail="This proposal has expired"
            )
        
        # Check if proposed date has passed
        if proposal.proposed_date <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=400,
                detail="The proposed appointment time has passed"
            )
        
        # Accept the proposal
        proposal.status = AppointmentProposalStatus.ACCEPTED
        proposal.response_message = response_message
        proposal.responded_at = datetime.now(timezone.utc)
        
        # Mark the linked offer as ACCEPTED
        if proposal.offer_id:
            from app.models.database import Offer as OfferModel, OfferStatus
            offer = self.db.query(OfferModel).filter(OfferModel.id == proposal.offer_id).first()
            if offer:
                offer.status = OfferStatus.ACCEPTED
                logger.info("Marked offer %s as ACCEPTED", offer.id)
        
        # Update request status to BOOKED
        request = (
            self.db.query(RequestModel)
            .filter(RequestModel.id == proposal.request_id)
            .first()
        )
        if request:
            from app.models.database import RequestStatus
            request.status = RequestStatus.BOOKED
        
        self.db.commit()
        self.db.refresh(proposal)
        
        # Automatically create an appointment from the accepted proposal
        try:
            self.create_appointment_from_proposal(
                proposal_id=proposal.id,
                customer_notes=response_message,
            )
        except Exception as e:
            logger.error(
                "Failed to create appointment from proposal %s: %s",
                proposal_id,
                str(e),
            )
        
        logger.info(
            "Appointment proposal %s accepted by customer %s",
            proposal_id,
            customer_user_id,
        )
        
        return proposal

    def reject_proposal(
        self,
        proposal_id: _uuid.UUID,
        customer_user_id: _uuid.UUID,
        response_message: Optional[str] = None,
    ) -> AppointmentProposal:
        """
        Reject an appointment proposal (customer action)
        
        Args:
            proposal_id: ID of the proposal to reject
            customer_user_id: Customer rejecting the proposal
            response_message: Optional message from customer
            
        Returns:
            Updated AppointmentProposal
            
        Raises:
            HTTPException: If proposal not found or validation fails
        """
        
        proposal = self.get_proposal(proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        # Verify customer owns this proposal
        if proposal.customer_user_id != customer_user_id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to reject this proposal"
            )
        
        # Check if proposal is still valid
        if proposal.status != AppointmentProposalStatus.PROPOSED:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot reject proposal with status: {proposal.status.value}"
            )
        
        # Reject the proposal
        proposal.status = AppointmentProposalStatus.REJECTED
        proposal.response_message = response_message
        proposal.responded_at = datetime.now(timezone.utc)
        
        self.db.commit()
        self.db.refresh(proposal)
        
        logger.info(
            "Appointment proposal %s rejected by customer %s",
            proposal_id,
            customer_user_id,
        )
        
        return proposal

    def cancel_proposal(
        self,
        proposal_id: _uuid.UUID,
        mester_id: _uuid.UUID,
    ) -> AppointmentProposal:
        """
        Cancel an appointment proposal (mester action)
        
        Args:
            proposal_id: ID of the proposal to cancel
            mester_id: Mester canceling the proposal
            
        Returns:
            Updated AppointmentProposal
            
        Raises:
            HTTPException: If proposal not found or validation fails
        """
        
        proposal = self.get_proposal(proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        # Verify mester owns this proposal
        if proposal.mester_id != mester_id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to cancel this proposal"
            )
        
        # Can only cancel if still proposed
        if proposal.status != AppointmentProposalStatus.PROPOSED:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel proposal with status: {proposal.status.value}"
            )
        
        # Cancel the proposal
        proposal.status = AppointmentProposalStatus.CANCELLED
        proposal.responded_at = datetime.now(timezone.utc)
        
        self.db.commit()
        self.db.refresh(proposal)
        
        logger.info(
            "Appointment proposal %s cancelled by mester %s",
            proposal_id,
            mester_id,
        )
        
        return proposal

    # -----------------------------
    # Appointment Management
    # -----------------------------

    def create_appointment_from_proposal(
        self,
        proposal_id: _uuid.UUID,
        location_address: Optional[str] = None,
        location_coordinates: Optional[str] = None,
        customer_notes: Optional[str] = None,
    ) -> Appointment:
        """
        Create an appointment from an accepted proposal
        
        Args:
            proposal_id: ID of the accepted proposal
            location_address: Full address for the appointment
            location_coordinates: GPS coordinates as "lat,lng"
            customer_notes: Additional notes from customer
            
        Returns:
            Created Appointment
            
        Raises:
            HTTPException: If proposal not found or not accepted
        """
        
        proposal = self.get_proposal(proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        if proposal.status != AppointmentProposalStatus.ACCEPTED:
            raise HTTPException(
                status_code=400,
                detail="Can only create appointment from accepted proposal"
            )
        
        # Check if appointment already exists for this proposal
        existing = (
            self.db.query(Appointment)
            .filter(Appointment.proposal_id == proposal_id)
            .first()
        )
        if existing:
            return existing
        
        # Calculate end time
        duration_minutes = proposal.duration_minutes or 60
        scheduled_end = proposal.proposed_date + timedelta(minutes=duration_minutes)
        
        # Create appointment
        appointment = Appointment(
            proposal_id=proposal_id,
            thread_id=proposal.thread_id,
            mester_id=proposal.mester_id,
            request_id=proposal.request_id,
            customer_user_id=proposal.customer_user_id,
            scheduled_start=proposal.proposed_date,
            scheduled_end=scheduled_end,
            duration_minutes=duration_minutes,
            location=proposal.location or "TBD",
            location_address=location_address,
            location_coordinates=location_coordinates,
            mester_notes=proposal.notes,
            customer_notes=customer_notes,
            status=AppointmentStatus.CONFIRMED,
            confirmed_by_customer_at=datetime.now(timezone.utc),
        )
        
        self.db.add(appointment)
        self.db.commit()
        self.db.refresh(appointment)
        
        # Schedule reminders
        self._schedule_reminders(appointment)
        
        logger.info(
            "Created appointment %s from proposal %s",
            appointment.id,
            proposal_id,
        )
        
        # Auto-create pending job from confirmed appointment
        try:
            from app.services.jobs import JobService
            
            # Check if job already exists for this appointment
            from app.models.database import Job
            existing_job = self.db.query(Job).filter(Job.appointment_id == appointment.id).first()
            
            if not existing_job:
                # Auto-generate title from request/service
                from app.models.database import Request, Service as ServiceModel
                request = self.db.query(Request).filter(Request.id == appointment.request_id).first()
                title = "Service Job"
                
                if request:
                    service = self.db.query(ServiceModel).filter(ServiceModel.id == request.service_id).first()
                    if service:
                        date_str = appointment.scheduled_start.strftime('%Y-%m-%d')
                        title = f"{service.name} - {date_str}"
                
                job = JobService.create_job_from_appointment(
                    db=self.db,
                    appointment_id=appointment.id,
                    title=title,
                    description=customer_notes or proposal.notes
                )
                logger.info("Auto-created job %s for appointment %s (status: pending)", job.id, appointment.id)
        except Exception as e:
            logger.error("Failed to auto-create job for appointment %s: %s", appointment.id, str(e))
            # Don't fail the appointment creation if job creation fails
        
        return appointment

    def get_appointment(
        self,
        appointment_id: _uuid.UUID,
    ) -> Optional[Appointment]:
        """Get an appointment by ID"""
        return (
            self.db.query(Appointment)
            .filter(Appointment.id == appointment_id)
            .first()
        )

    def list_appointments(
        self,
        mester_id: Optional[_uuid.UUID] = None,
        customer_user_id: Optional[_uuid.UUID] = None,
        status: Optional[AppointmentStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Appointment]:
        """List appointments with optional filters"""
        query = self.db.query(Appointment)
        
        if mester_id:
            query = query.filter(Appointment.mester_id == mester_id)
        
        if customer_user_id:
            query = query.filter(Appointment.customer_user_id == customer_user_id)
        
        if status:
            query = query.filter(Appointment.status == status)
        
        if start_date:
            query = query.filter(Appointment.scheduled_start >= start_date)
        
        if end_date:
            query = query.filter(Appointment.scheduled_start <= end_date)
        
        return query.order_by(Appointment.scheduled_start.asc()).all()

    def reschedule_appointment(
        self,
        appointment_id: _uuid.UUID,
        new_start: datetime,
        new_duration_minutes: Optional[int] = None,
        reason: Optional[str] = None,
        rescheduled_by: str = "customer",  # "customer" or "mester"
    ) -> Appointment:
        """
        Reschedule an appointment to a new time
        
        Args:
            appointment_id: ID of the appointment to reschedule
            new_start: New start time
            new_duration_minutes: New duration (optional, defaults to current)
            reason: Reason for rescheduling
            rescheduled_by: Who initiated the reschedule
            
        Returns:
            Updated Appointment
            
        Raises:
            HTTPException: If appointment not found or cannot be rescheduled
        """
        
        appointment = self.get_appointment(appointment_id)
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        if appointment.status not in [AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot reschedule appointment with status: {appointment.status.value}"
            )
        
        # Validate new time is in the future
        if new_start <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=400,
                detail="New appointment time must be in the future"
            )
        
        # Update duration if provided
        duration = new_duration_minutes or appointment.duration_minutes
        new_end = new_start + timedelta(minutes=duration)
        
        # Mark old appointment as rescheduled
        appointment.status = AppointmentStatus.RESCHEDULED
        
        # Create new appointment
        new_appointment = Appointment(
            proposal_id=appointment.proposal_id,
            thread_id=appointment.thread_id,
            mester_id=appointment.mester_id,
            request_id=appointment.request_id,
            customer_user_id=appointment.customer_user_id,
            scheduled_start=new_start,
            scheduled_end=new_end,
            duration_minutes=duration,
            location=appointment.location,
            location_address=appointment.location_address,
            location_coordinates=appointment.location_coordinates,
            mester_notes=appointment.mester_notes,
            customer_notes=appointment.customer_notes,
            status=AppointmentStatus.CONFIRMED,
            rescheduled_from_id=appointment.id,
        )
        
        appointment.rescheduled_to_id = new_appointment.id
        
        # Cancel old reminders and schedule new ones
        self._cancel_reminders(appointment.id)
        
        self.db.add(new_appointment)
        self.db.commit()
        self.db.refresh(new_appointment)
        
        self._schedule_reminders(new_appointment)
        
        logger.info(
            "Rescheduled appointment %s to %s (new appointment: %s)",
            appointment_id,
            new_start,
            new_appointment.id,
        )
        
        return new_appointment

    def cancel_appointment(
        self,
        appointment_id: _uuid.UUID,
        reason: str,
        cancelled_by: str,  # "customer" or "mester"
    ) -> Appointment:
        """
        Cancel an appointment
        
        Args:
            appointment_id: ID of the appointment to cancel
            reason: Cancellation reason
            cancelled_by: Who cancelled the appointment
            
        Returns:
            Updated Appointment
            
        Raises:
            HTTPException: If appointment not found or already cancelled
        """
        
        appointment = self.get_appointment(appointment_id)
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        if appointment.status in [
            AppointmentStatus.CANCELLED_BY_CUSTOMER,
            AppointmentStatus.CANCELLED_BY_MESTER,
            AppointmentStatus.COMPLETED,
        ]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel appointment with status: {appointment.status.value}"
            )
        
        # Set cancellation status based on who cancelled
        if cancelled_by == "customer":
            appointment.status = AppointmentStatus.CANCELLED_BY_CUSTOMER
        else:
            appointment.status = AppointmentStatus.CANCELLED_BY_MESTER
        
        appointment.cancelled_at = datetime.now(timezone.utc)
        appointment.cancellation_reason = reason
        
        # Cancel reminders
        self._cancel_reminders(appointment_id)
        
        self.db.commit()
        self.db.refresh(appointment)
        
        logger.info(
            "Cancelled appointment %s by %s: %s",
            appointment_id,
            cancelled_by,
            reason,
        )
        
        return appointment

    def complete_appointment(
        self,
        appointment_id: _uuid.UUID,
        notes: Optional[str] = None,
    ) -> Appointment:
        """
        Mark an appointment as completed
        
        Args:
            appointment_id: ID of the appointment
            notes: Completion notes
            
        Returns:
            Updated Appointment
            
        Raises:
            HTTPException: If appointment not found
        """
        
        appointment = self.get_appointment(appointment_id)
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        appointment.status = AppointmentStatus.COMPLETED
        appointment.completed_at = datetime.now(timezone.utc)
        if notes:
            appointment.internal_notes = notes
        
        self.db.commit()
        self.db.refresh(appointment)
        
        logger.info("Completed appointment %s", appointment_id)
        
        # Update associated job status to in_progress if it's still pending
        try:
            from app.models.database import Job, JobStatus
            from app.services.jobs import JobService
            
            job = self.db.query(Job).filter(Job.appointment_id == appointment_id).first()
            if job and job.status == JobStatus.PENDING:
                JobService.update_job_status(
                    db=self.db,
                    job_id=job.id,
                    new_status=JobStatus.IN_PROGRESS,
                    changed_by_type="system",
                    notes="Appointment completed, work can now begin"
                )
                logger.info("Updated job %s to IN_PROGRESS after appointment completion", job.id)
        except Exception as e:
            logger.error("Failed to update job status for appointment %s: %s", appointment_id, str(e))
        
        return appointment

    # -----------------------------
    # Calendar & Availability Management
    # -----------------------------

    def get_or_create_calendar(
        self,
        mester_id: _uuid.UUID,
    ) -> MesterCalendar:
        """Get or create calendar settings for a mester"""
        
        calendar = (
            self.db.query(MesterCalendar)
            .filter(MesterCalendar.mester_id == mester_id)
            .first()
        )
        
        if not calendar:
            calendar = MesterCalendar(
                mester_id=mester_id,
                timezone="Europe/Budapest",
                buffer_minutes=15,
                min_advance_hours=24,
                max_advance_days=90,
                default_duration_minutes=60,
                allow_online_booking=True,
            )
            self.db.add(calendar)
            self.db.commit()
            self.db.refresh(calendar)
        
        return calendar

    def update_calendar(
        self,
        mester_id: _uuid.UUID,
        **updates,
    ) -> MesterCalendar:
        """Update calendar settings"""
        
        calendar = self.get_or_create_calendar(mester_id)
        
        for key, value in updates.items():
            if value is not None and hasattr(calendar, key):
                setattr(calendar, key, value)
        
        self.db.commit()
        self.db.refresh(calendar)
        
        return calendar

    def create_availability_slot(
        self,
        mester_id: _uuid.UUID,
        start_time: datetime,
        end_time: datetime,
        is_available: bool = True,
        reason: Optional[str] = None,
        notes: Optional[str] = None,
        is_recurring: bool = False,
        recurrence_pattern: Optional[Dict[str, Any]] = None,
    ) -> MesterAvailabilitySlot:
        """Create an availability slot"""
        
        slot = MesterAvailabilitySlot(
            mester_id=mester_id,
            start_time=start_time,
            end_time=end_time,
            is_available=is_available,
            reason=reason,
            notes=notes,
            is_recurring=is_recurring,
            recurrence_pattern=recurrence_pattern,
        )
        
        self.db.add(slot)
        self.db.commit()
        self.db.refresh(slot)
        
        return slot

    def list_availability_slots(
        self,
        mester_id: _uuid.UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[MesterAvailabilitySlot]:
        """List availability slots for a mester"""
        
        query = self.db.query(MesterAvailabilitySlot).filter(
            MesterAvailabilitySlot.mester_id == mester_id
        )
        
        if start_date:
            query = query.filter(MesterAvailabilitySlot.end_time >= start_date)
        
        if end_date:
            query = query.filter(MesterAvailabilitySlot.start_time <= end_date)
        
        return query.order_by(MesterAvailabilitySlot.start_time.asc()).all()

    def get_available_time_slots(
        self,
        mester_id: _uuid.UUID,
        target_date: date,
        duration_minutes: int,
    ) -> List[Dict[str, Any]]:
        """
        Get available time slots for a specific date
        
        Args:
            mester_id: Mester ID
            target_date: Date to check availability
            duration_minutes: Required duration
            
        Returns:
            List of available time slots with start/end times
        """
        
        calendar = self.get_or_create_calendar(mester_id)
        
        # Get start and end of day in mester's timezone
        day_start = datetime.combine(target_date, time(0, 0), tzinfo=timezone.utc)
        day_end = datetime.combine(target_date, time(23, 59), tzinfo=timezone.utc)
        
        # Get existing appointments for this day
        appointments = self.list_appointments(
            mester_id=mester_id,
            start_date=day_start,
            end_date=day_end,
        )
        
        # Get availability slots for this day
        availability_slots = self.list_availability_slots(
            mester_id=mester_id,
            start_date=day_start,
            end_date=day_end,
        )
        
        # Build list of busy periods
        busy_periods = []
        
        # Add appointments
        for apt in appointments:
            if apt.status not in [
                AppointmentStatus.CANCELLED_BY_CUSTOMER,
                AppointmentStatus.CANCELLED_BY_MESTER,
            ]:
                # Include buffer time
                buffer_start = apt.scheduled_start - timedelta(minutes=calendar.buffer_minutes)
                buffer_end = apt.scheduled_end + timedelta(minutes=calendar.buffer_minutes)
                busy_periods.append((buffer_start, buffer_end))
        
        # Add unavailable slots
        for slot in availability_slots:
            if not slot.is_available:
                busy_periods.append((slot.start_time, slot.end_time))
        
        # Get working hours for this day
        working_hours = self._get_working_hours_for_date(calendar, target_date)
        if not working_hours:
            return []
        
        work_start, work_end = working_hours
        
        # Generate available slots
        available_slots = []
        current_time = max(
            work_start,
            datetime.now(timezone.utc) + timedelta(hours=calendar.min_advance_hours)
        )
        
        while current_time + timedelta(minutes=duration_minutes) <= work_end:
            slot_end = current_time + timedelta(minutes=duration_minutes)
            
            # Check if this slot overlaps with any busy period
            is_available = True
            for busy_start, busy_end in busy_periods:
                if (current_time < busy_end and slot_end > busy_start):
                    is_available = False
                    # Jump to end of busy period
                    current_time = busy_end
                    break
            
            if is_available:
                available_slots.append({
                    "start": current_time,
                    "end": slot_end,
                    "duration_minutes": duration_minutes,
                })
                current_time += timedelta(minutes=30)  # Move in 30-minute increments
            
        return available_slots

    def _get_working_hours_for_date(
        self,
        calendar: MesterCalendar,
        target_date: date,
    ) -> Optional[Tuple[datetime, datetime]]:
        """Get working hours for a specific date"""
        
        if not calendar.default_working_hours:
            # Default 9-5 if not set
            return (
                datetime.combine(target_date, time(9, 0), tzinfo=timezone.utc),
                datetime.combine(target_date, time(17, 0), tzinfo=timezone.utc),
            )
        
        # Get day of week (monday = 0)
        day_name = target_date.strftime("%A").lower()
        
        if day_name not in calendar.default_working_hours:
            return None
        
        hours = calendar.default_working_hours[day_name]
        if not hours:
            return None
        
        # Parse start and end times
        start_str = hours.get("start", "09:00")
        end_str = hours.get("end", "17:00")
        
        start_time = time.fromisoformat(start_str)
        end_time = time.fromisoformat(end_str)
        
        return (
            datetime.combine(target_date, start_time, tzinfo=timezone.utc),
            datetime.combine(target_date, end_time, tzinfo=timezone.utc),
        )

    # -----------------------------
    # Reminder Management
    # -----------------------------

    def _schedule_reminders(self, appointment: Appointment) -> None:
        """Schedule reminders for an appointment"""
        
        # Default reminder times (in minutes before appointment)
        reminder_times = [1440, 60]  # 24 hours and 1 hour before
        
        for minutes_before in reminder_times:
            remind_at = appointment.scheduled_start - timedelta(minutes=minutes_before)
            
            # Only schedule if remind_at is in the future
            if remind_at > datetime.now(timezone.utc):
                # Reminder for customer
                customer_reminder = AppointmentReminder(
                    appointment_id=appointment.id,
                    recipient_type="customer",
                    recipient_id=appointment.customer_user_id,
                    remind_at=remind_at,
                    minutes_before=minutes_before,
                    send_email=True,
                    send_push=True,
                    status=ReminderStatus.SCHEDULED,
                )
                self.db.add(customer_reminder)
                
                # Reminder for mester
                mester_reminder = AppointmentReminder(
                    appointment_id=appointment.id,
                    recipient_type="mester",
                    recipient_id=appointment.mester_id,
                    remind_at=remind_at,
                    minutes_before=minutes_before,
                    send_email=True,
                    send_push=True,
                    status=ReminderStatus.SCHEDULED,
                )
                self.db.add(mester_reminder)
        
        self.db.commit()

    def _cancel_reminders(self, appointment_id: _uuid.UUID) -> None:
        """Cancel all scheduled reminders for an appointment"""
        
        self.db.query(AppointmentReminder).filter(
            and_(
                AppointmentReminder.appointment_id == appointment_id,
                AppointmentReminder.status == ReminderStatus.SCHEDULED,
            )
        ).update({
            "status": ReminderStatus.CANCELLED,
        })
        
        self.db.commit()

    def get_pending_reminders(
        self,
        cutoff_time: Optional[datetime] = None,
    ) -> List[AppointmentReminder]:
        """Get reminders that need to be sent"""
        
        if not cutoff_time:
            cutoff_time = datetime.now(timezone.utc)
        
        return (
            self.db.query(AppointmentReminder)
            .filter(
                and_(
                    AppointmentReminder.status == ReminderStatus.SCHEDULED,
                    AppointmentReminder.remind_at <= cutoff_time,
                )
            )
            .all()
        )

    def mark_reminder_sent(
        self,
        reminder_id: _uuid.UUID,
        error_message: Optional[str] = None,
    ) -> AppointmentReminder:
        """Mark a reminder as sent or failed"""
        
        reminder = (
            self.db.query(AppointmentReminder)
            .filter(AppointmentReminder.id == reminder_id)
            .first()
        )
        
        if reminder:
            if error_message:
                reminder.status = ReminderStatus.FAILED
                reminder.error_message = error_message
            else:
                reminder.status = ReminderStatus.SENT
                reminder.sent_at = datetime.now(timezone.utc)
            
            self.db.commit()
            self.db.refresh(reminder)
        
        return reminder

