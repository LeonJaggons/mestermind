"""
Appointment proposal routes for mesters to book appointments with customers
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
import uuid as _uuid
import logging

from app.core.database import get_db
from app.services.appointments import AppointmentService
from app.services.calendar import CalendarService
from fastapi.responses import Response
from app.models.schemas import (
    AppointmentProposalCreate,
    AppointmentProposalResponse,
    AppointmentProposalAccept,
    AppointmentProposalReject,
    AppointmentResponse,
    AppointmentReschedule,
    AppointmentCancel,
    AppointmentComplete,
    MesterCalendarResponse,
    MesterCalendarCreate,
    MesterCalendarUpdate,
    AvailabilitySlotCreate,
    AvailabilitySlotResponse,
    AvailabilityCheckRequest,
    AvailabilityCheckResponse,
    AvailableTimeSlot,
)
from app.models.database import AppointmentProposalStatus, AppointmentStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/appointments", tags=["appointments"])


def _validate_uuid(value: Optional[str], field: str) -> Optional[_uuid.UUID]:
    """Validate and convert string to UUID"""
    if value is None:
        return None
    try:
        return _uuid.UUID(value)
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {field}") from exc


def _proposal_to_response(proposal) -> AppointmentProposalResponse:
    """Convert a proposal database object to a response schema"""
    # Get offer details if linked
    offer_id = None
    price = None
    currency = None
    offer_message = None
    offer_status = None
    
    if proposal.offer:
        offer_id = str(proposal.offer.id)
        price = float(proposal.offer.price)
        currency = proposal.offer.currency
        offer_message = proposal.offer.message
        offer_status = proposal.offer.status.value
    
    return AppointmentProposalResponse(
        id=str(proposal.id),
        thread_id=str(proposal.thread_id),
        mester_id=str(proposal.mester_id),
        request_id=str(proposal.request_id),
        customer_user_id=str(proposal.customer_user_id) if proposal.customer_user_id else None,
        proposed_date=proposal.proposed_date,
        duration_minutes=proposal.duration_minutes,
        location=proposal.location,
        notes=proposal.notes,
        status=proposal.status.value,
        response_message=proposal.response_message,
        responded_at=proposal.responded_at,
        expires_at=proposal.expires_at,
        created_at=proposal.created_at,
        updated_at=proposal.updated_at,
        appointment_id=str(proposal.appointment.id) if proposal.appointment else None,
        # Offer details
        offer_id=offer_id,
        price=price,
        currency=currency,
        offer_message=offer_message,
        offer_status=offer_status,
    )


@router.post("/threads/{thread_id}/proposals", response_model=AppointmentProposalResponse)
async def create_appointment_proposal(
    thread_id: str,
    payload: AppointmentProposalCreate,
    mester_id: str = Query(..., description="Mester ID creating the proposal"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
):
    """
    Create a new appointment proposal from mester to customer.
    This can only be done after the mester has purchased the lead.
    """
    
    thread_uuid = _validate_uuid(thread_id, "thread_id")
    mester_uuid = _validate_uuid(mester_id, "mester_id")
    
    if not thread_uuid or not mester_uuid:
        raise HTTPException(status_code=400, detail="Invalid thread_id or mester_id")
    
    service = AppointmentService(db)
    
    proposal = service.create_proposal(
        thread_id=thread_uuid,
        mester_id=mester_uuid,
        proposed_date=payload.proposed_date,
        price=payload.price,
        currency=payload.currency,
        duration_minutes=payload.duration_minutes,
        location=payload.location,
        notes=payload.notes,
        offer_message=payload.offer_message,
    )
    
    # Send notification to customer about new appointment proposal
    from app.services.notifications import NotificationService
    
    notification_service = NotificationService(db)
    try:
        notification = await notification_service.notify_appointment_proposal(
            proposal_id=proposal.id,
            background_tasks=background_tasks,
        )
        if notification:
            print(f"[APPOINTMENT] Notification {notification.id} created for proposal {proposal.id}")
        else:
            print(f"[APPOINTMENT] No notification created for proposal {proposal.id}")
    except Exception as e:
        print(f"[APPOINTMENT] Error creating notification for proposal {proposal.id}: {e}")
        import traceback
        traceback.print_exc()
    
    # Broadcast appointment proposal via WebSocket
    from app.services.websocket import manager
    
    if proposal.customer_user_id:
        ws_event = {
            "type": "appointment_proposal",
            "data": {
                "id": str(proposal.id),
                "thread_id": str(proposal.thread_id),
                "mester_id": str(proposal.mester_id),
                "request_id": str(proposal.request_id),
                "proposed_date": proposal.proposed_date.isoformat() if proposal.proposed_date else None,
                "duration_minutes": proposal.duration_minutes,
                "location": proposal.location,
                "notes": proposal.notes,
                "status": proposal.status.value,
                "created_at": proposal.created_at.isoformat() if proposal.created_at else None,
            }
        }
        try:
            await manager.send_to_user(str(proposal.customer_user_id), ws_event)
        except Exception as e:
            print(f"[WEBSOCKET] Error broadcasting appointment proposal: {e}")
    
    return _proposal_to_response(proposal)


@router.get("/mesters/{mester_id}/proposals", response_model=List[AppointmentProposalResponse])
async def list_mester_proposals(
    mester_id: str,
    status: Optional[AppointmentProposalStatus] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get all appointment proposals for a specific mester (optionally filtered by status).
    """
    from app.models.database import Request as RequestModel, Service as ServiceModel
    
    mester_uuid = _validate_uuid(mester_id, "mester_id")
    if not mester_uuid:
        raise HTTPException(status_code=400, detail="Invalid mester_id")
    
    service = AppointmentService(db)
    proposals = service.list_proposals_for_mester(mester_uuid, status)
    
    # Fetch request and service details for each proposal
    responses = []
    for p in proposals:
        request = db.query(RequestModel).filter(RequestModel.id == p.request_id).first()
        service_obj = None
        if request:
            service_obj = db.query(ServiceModel).filter(ServiceModel.id == request.service_id).first()
        
        customer_name = None
        if request and request.first_name and request.last_name:
            customer_name = f"{request.first_name} {request.last_name}"
        
        base_response = _proposal_to_response(p)
        # Update the base response with request details
        response_dict = base_response.model_dump()
        response_dict.update({
            'request_service_id': str(request.service_id) if request else None,
            'request_service_name': service_obj.name if service_obj else None,
            'request_customer_name': customer_name,
            'request_postal_code': request.postal_code if request else None,
            'request_message': request.message_to_pro if request else None,
        })
        responses.append(AppointmentProposalResponse(**response_dict))
    
    return responses


@router.get("/threads/{thread_id}/proposals", response_model=List[AppointmentProposalResponse])
async def list_thread_proposals(
    thread_id: str,
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
):
    """
    List all appointment proposals for a thread.
    Optionally filter by status.
    """
    
    thread_uuid = _validate_uuid(thread_id, "thread_id")
    if not thread_uuid:
        raise HTTPException(status_code=400, detail="Invalid thread_id")
    
    service = AppointmentService(db)
    
    # Parse status if provided
    status_enum = None
    if status:
        try:
            status_enum = AppointmentProposalStatus(status.lower())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {', '.join([s.value for s in AppointmentProposalStatus])}"
            )
    
    proposals = service.list_proposals_for_thread(
        thread_id=thread_uuid,
        status=status_enum,
    )
    
    return [_proposal_to_response(p) for p in proposals]


@router.get("/proposals/{proposal_id}", response_model=AppointmentProposalResponse)
async def get_proposal(
    proposal_id: str,
    db: Session = Depends(get_db),
):
    """Get a specific appointment proposal by ID"""
    
    proposal_uuid = _validate_uuid(proposal_id, "proposal_id")
    if not proposal_uuid:
        raise HTTPException(status_code=400, detail="Invalid proposal_id")
    
    service = AppointmentService(db)
    proposal = service.get_proposal(proposal_uuid)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    return _proposal_to_response(proposal)


@router.post("/proposals/{proposal_id}/accept", response_model=AppointmentProposalResponse)
async def accept_proposal(
    proposal_id: str,
    payload: AppointmentProposalAccept,
    customer_user_id: str = Query(..., description="Customer user ID accepting the proposal"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
):
    """
    Accept an appointment proposal (customer action).
    This will update the request status to BOOKED.
    """
    
    proposal_uuid = _validate_uuid(proposal_id, "proposal_id")
    customer_uuid = _validate_uuid(customer_user_id, "customer_user_id")
    
    if not proposal_uuid or not customer_uuid:
        raise HTTPException(status_code=400, detail="Invalid proposal_id or customer_user_id")
    
    service = AppointmentService(db)
    proposal = service.accept_proposal(
        proposal_id=proposal_uuid,
        customer_user_id=customer_uuid,
        response_message=payload.response_message,
    )
    
    # Send notification to mester about accepted appointment
    from app.services.notifications import NotificationService
    
    notification_service = NotificationService(db)
    try:
        notification = await notification_service.notify_appointment_accepted(
            proposal_id=proposal.id,
            background_tasks=background_tasks,
        )
        if notification:
            print(f"[APPOINTMENT] Notification {notification.id} created for accepted proposal {proposal.id}")
        else:
            print(f"[APPOINTMENT] No notification created for accepted proposal {proposal.id}")
    except Exception as e:
        print(f"[APPOINTMENT] Error creating notification for accepted proposal {proposal.id}: {e}")
        import traceback
        traceback.print_exc()
    
    # Broadcast appointment acceptance via WebSocket
    from app.services.websocket import manager
    
    ws_event = {
        "type": "appointment_status_update",
        "data": {
            "id": str(proposal.id),
            "status": proposal.status.value,
            "response_message": proposal.response_message,
            "responded_at": proposal.responded_at.isoformat() if proposal.responded_at else None,
        }
    }
    try:
        await manager.send_to_mester(str(proposal.mester_id), ws_event)
    except Exception as e:
        print(f"[WEBSOCKET] Error broadcasting appointment acceptance: {e}")
    
    return _proposal_to_response(proposal)


@router.post("/proposals/{proposal_id}/reject", response_model=AppointmentProposalResponse)
async def reject_proposal(
    proposal_id: str,
    payload: AppointmentProposalReject,
    customer_user_id: str = Query(..., description="Customer user ID rejecting the proposal"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
):
    """
    Reject an appointment proposal (customer action).
    The mester can then propose a different time.
    """
    
    proposal_uuid = _validate_uuid(proposal_id, "proposal_id")
    customer_uuid = _validate_uuid(customer_user_id, "customer_user_id")
    
    if not proposal_uuid or not customer_uuid:
        raise HTTPException(status_code=400, detail="Invalid proposal_id or customer_user_id")
    
    service = AppointmentService(db)
    proposal = service.reject_proposal(
        proposal_id=proposal_uuid,
        customer_user_id=customer_uuid,
        response_message=payload.response_message,
    )
    
    # TODO: Send notification to mester about rejected appointment
    # background_tasks.add_task(send_appointment_rejected_notification, proposal.id)
    
    return _proposal_to_response(proposal)


@router.post("/proposals/{proposal_id}/cancel", response_model=AppointmentProposalResponse)
async def cancel_proposal(
    proposal_id: str,
    mester_id: str = Query(..., description="Mester ID canceling the proposal"),
    db: Session = Depends(get_db),
):
    """
    Cancel an appointment proposal (mester action).
    Can only cancel proposals that haven't been accepted or rejected yet.
    """
    
    proposal_uuid = _validate_uuid(proposal_id, "proposal_id")
    mester_uuid = _validate_uuid(mester_id, "mester_id")
    
    if not proposal_uuid or not mester_uuid:
        raise HTTPException(status_code=400, detail="Invalid proposal_id or mester_id")
    
    service = AppointmentService(db)
    proposal = service.cancel_proposal(
        proposal_id=proposal_uuid,
        mester_id=mester_uuid,
    )
    
    return _proposal_to_response(proposal)


# -----------------------------
# Appointment Management Endpoints
# -----------------------------


@router.get("/list", response_model=List[AppointmentResponse])
async def list_appointments(
    mester_id: Optional[str] = Query(None, description="Filter by mester ID"),
    customer_user_id: Optional[str] = Query(None, description="Filter by customer user ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
):
    """List appointments with optional filters"""
    
    mester_uuid = _validate_uuid(mester_id, "mester_id") if mester_id else None
    customer_uuid = _validate_uuid(customer_user_id, "customer_user_id") if customer_user_id else None
    
    status_enum = None
    if status:
        try:
            status_enum = AppointmentStatus(status.lower())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {', '.join([s.value for s in AppointmentStatus])}"
            )
    
    service = AppointmentService(db)
    appointments = service.list_appointments(
        mester_id=mester_uuid,
        customer_user_id=customer_uuid,
        status=status_enum,
    )
    
    return [
        AppointmentResponse(
            id=str(apt.id),
            proposal_id=str(apt.proposal_id),
            thread_id=str(apt.thread_id),
            mester_id=str(apt.mester_id),
            request_id=str(apt.request_id),
            customer_user_id=str(apt.customer_user_id),
            scheduled_start=apt.scheduled_start,
            scheduled_end=apt.scheduled_end,
            duration_minutes=apt.duration_minutes,
            location=apt.location,
            location_address=apt.location_address,
            location_coordinates=apt.location_coordinates,
            mester_notes=apt.mester_notes,
            customer_notes=apt.customer_notes,
            internal_notes=apt.internal_notes,
            status=apt.status.value,
            cancelled_at=apt.cancelled_at,
            cancellation_reason=apt.cancellation_reason,
            completed_at=apt.completed_at,
            rescheduled_from_id=str(apt.rescheduled_from_id) if apt.rescheduled_from_id else None,
            rescheduled_to_id=str(apt.rescheduled_to_id) if apt.rescheduled_to_id else None,
            confirmed_by_customer_at=apt.confirmed_by_customer_at,
            confirmed_by_mester_at=apt.confirmed_by_mester_at,
            google_calendar_event_id=apt.google_calendar_event_id,
            ical_uid=apt.ical_uid,
            created_at=apt.created_at,
            updated_at=apt.updated_at,
        )
        for apt in appointments
    ]


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: str,
    db: Session = Depends(get_db),
):
    """Get a specific appointment by ID"""
    
    appointment_uuid = _validate_uuid(appointment_id, "appointment_id")
    if not appointment_uuid:
        raise HTTPException(status_code=400, detail="Invalid appointment_id")
    
    service = AppointmentService(db)
    apt = service.get_appointment(appointment_uuid)
    
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return AppointmentResponse(
        id=str(apt.id),
        proposal_id=str(apt.proposal_id),
        thread_id=str(apt.thread_id),
        mester_id=str(apt.mester_id),
        request_id=str(apt.request_id),
        customer_user_id=str(apt.customer_user_id),
        scheduled_start=apt.scheduled_start,
        scheduled_end=apt.scheduled_end,
        duration_minutes=apt.duration_minutes,
        location=apt.location,
        location_address=apt.location_address,
        location_coordinates=apt.location_coordinates,
        mester_notes=apt.mester_notes,
        customer_notes=apt.customer_notes,
        internal_notes=apt.internal_notes,
        status=apt.status.value,
        cancelled_at=apt.cancelled_at,
        cancellation_reason=apt.cancellation_reason,
        completed_at=apt.completed_at,
        rescheduled_from_id=str(apt.rescheduled_from_id) if apt.rescheduled_from_id else None,
        rescheduled_to_id=str(apt.rescheduled_to_id) if apt.rescheduled_to_id else None,
        confirmed_by_customer_at=apt.confirmed_by_customer_at,
        confirmed_by_mester_at=apt.confirmed_by_mester_at,
        google_calendar_event_id=apt.google_calendar_event_id,
        ical_uid=apt.ical_uid,
        created_at=apt.created_at,
        updated_at=apt.updated_at,
    )


@router.post("/{appointment_id}/reschedule", response_model=AppointmentResponse)
async def reschedule_appointment(
    appointment_id: str,
    payload: AppointmentReschedule,
    rescheduled_by: str = Query(..., description="Who is rescheduling (customer or mester)"),
    db: Session = Depends(get_db),
):
    """Reschedule an appointment to a new time"""
    
    appointment_uuid = _validate_uuid(appointment_id, "appointment_id")
    if not appointment_uuid:
        raise HTTPException(status_code=400, detail="Invalid appointment_id")
    
    if rescheduled_by not in ["customer", "mester"]:
        raise HTTPException(status_code=400, detail="rescheduled_by must be 'customer' or 'mester'")
    
    service = AppointmentService(db)
    apt = service.reschedule_appointment(
        appointment_id=appointment_uuid,
        new_start=payload.new_start,
        new_duration_minutes=payload.new_duration_minutes,
        reason=payload.reason,
        rescheduled_by=rescheduled_by,
    )
    
    return AppointmentResponse(
        id=str(apt.id),
        proposal_id=str(apt.proposal_id),
        thread_id=str(apt.thread_id),
        mester_id=str(apt.mester_id),
        request_id=str(apt.request_id),
        customer_user_id=str(apt.customer_user_id),
        scheduled_start=apt.scheduled_start,
        scheduled_end=apt.scheduled_end,
        duration_minutes=apt.duration_minutes,
        location=apt.location,
        location_address=apt.location_address,
        location_coordinates=apt.location_coordinates,
        mester_notes=apt.mester_notes,
        customer_notes=apt.customer_notes,
        internal_notes=apt.internal_notes,
        status=apt.status.value,
        cancelled_at=apt.cancelled_at,
        cancellation_reason=apt.cancellation_reason,
        completed_at=apt.completed_at,
        rescheduled_from_id=str(apt.rescheduled_from_id) if apt.rescheduled_from_id else None,
        rescheduled_to_id=str(apt.rescheduled_to_id) if apt.rescheduled_to_id else None,
        confirmed_by_customer_at=apt.confirmed_by_customer_at,
        confirmed_by_mester_at=apt.confirmed_by_mester_at,
        google_calendar_event_id=apt.google_calendar_event_id,
        ical_uid=apt.ical_uid,
        created_at=apt.created_at,
        updated_at=apt.updated_at,
    )


@router.post("/{appointment_id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment(
    appointment_id: str,
    payload: AppointmentCancel,
    db: Session = Depends(get_db),
):
    """Cancel an appointment"""
    
    appointment_uuid = _validate_uuid(appointment_id, "appointment_id")
    if not appointment_uuid:
        raise HTTPException(status_code=400, detail="Invalid appointment_id")
    
    if payload.cancelled_by not in ["customer", "mester"]:
        raise HTTPException(status_code=400, detail="cancelled_by must be 'customer' or 'mester'")
    
    service = AppointmentService(db)
    apt = service.cancel_appointment(
        appointment_id=appointment_uuid,
        reason=payload.reason,
        cancelled_by=payload.cancelled_by,
    )
    
    return AppointmentResponse(
        id=str(apt.id),
        proposal_id=str(apt.proposal_id),
        thread_id=str(apt.thread_id),
        mester_id=str(apt.mester_id),
        request_id=str(apt.request_id),
        customer_user_id=str(apt.customer_user_id),
        scheduled_start=apt.scheduled_start,
        scheduled_end=apt.scheduled_end,
        duration_minutes=apt.duration_minutes,
        location=apt.location,
        location_address=apt.location_address,
        location_coordinates=apt.location_coordinates,
        mester_notes=apt.mester_notes,
        customer_notes=apt.customer_notes,
        internal_notes=apt.internal_notes,
        status=apt.status.value,
        cancelled_at=apt.cancelled_at,
        cancellation_reason=apt.cancellation_reason,
        completed_at=apt.completed_at,
        rescheduled_from_id=str(apt.rescheduled_from_id) if apt.rescheduled_from_id else None,
        rescheduled_to_id=str(apt.rescheduled_to_id) if apt.rescheduled_to_id else None,
        confirmed_by_customer_at=apt.confirmed_by_customer_at,
        confirmed_by_mester_at=apt.confirmed_by_mester_at,
        google_calendar_event_id=apt.google_calendar_event_id,
        ical_uid=apt.ical_uid,
        created_at=apt.created_at,
        updated_at=apt.updated_at,
    )


@router.post("/{appointment_id}/complete", response_model=AppointmentResponse)
async def complete_appointment(
    appointment_id: str,
    payload: AppointmentComplete,
    db: Session = Depends(get_db),
):
    """Mark an appointment as completed"""
    
    appointment_uuid = _validate_uuid(appointment_id, "appointment_id")
    if not appointment_uuid:
        raise HTTPException(status_code=400, detail="Invalid appointment_id")
    
    service = AppointmentService(db)
    apt = service.complete_appointment(
        appointment_id=appointment_uuid,
        notes=payload.notes,
    )
    
    return AppointmentResponse(
        id=str(apt.id),
        proposal_id=str(apt.proposal_id),
        thread_id=str(apt.thread_id),
        mester_id=str(apt.mester_id),
        request_id=str(apt.request_id),
        customer_user_id=str(apt.customer_user_id),
        scheduled_start=apt.scheduled_start,
        scheduled_end=apt.scheduled_end,
        duration_minutes=apt.duration_minutes,
        location=apt.location,
        location_address=apt.location_address,
        location_coordinates=apt.location_coordinates,
        mester_notes=apt.mester_notes,
        customer_notes=apt.customer_notes,
        internal_notes=apt.internal_notes,
        status=apt.status.value,
        cancelled_at=apt.cancelled_at,
        cancellation_reason=apt.cancellation_reason,
        completed_at=apt.completed_at,
        rescheduled_from_id=str(apt.rescheduled_from_id) if apt.rescheduled_from_id else None,
        rescheduled_to_id=str(apt.rescheduled_to_id) if apt.rescheduled_to_id else None,
        confirmed_by_customer_at=apt.confirmed_by_customer_at,
        confirmed_by_mester_at=apt.confirmed_by_mester_at,
        google_calendar_event_id=apt.google_calendar_event_id,
        ical_uid=apt.ical_uid,
        created_at=apt.created_at,
        updated_at=apt.updated_at,
    )


# -----------------------------
# Calendar & Availability Endpoints
# -----------------------------


@router.get("/calendar/{mester_id}", response_model=MesterCalendarResponse)
async def get_mester_calendar(
    mester_id: str,
    db: Session = Depends(get_db),
):
    """Get mester's calendar settings"""
    
    mester_uuid = _validate_uuid(mester_id, "mester_id")
    if not mester_uuid:
        raise HTTPException(status_code=400, detail="Invalid mester_id")
    
    service = AppointmentService(db)
    calendar = service.get_or_create_calendar(mester_uuid)
    
    return MesterCalendarResponse(
        id=str(calendar.id),
        mester_id=str(calendar.mester_id),
        timezone=calendar.timezone,
        default_working_hours=calendar.default_working_hours,
        buffer_minutes=calendar.buffer_minutes,
        min_advance_hours=calendar.min_advance_hours,
        max_advance_days=calendar.max_advance_days,
        default_duration_minutes=calendar.default_duration_minutes,
        allow_online_booking=calendar.allow_online_booking,
        google_calendar_enabled=calendar.google_calendar_enabled,
        google_calendar_id=calendar.google_calendar_id,
        created_at=calendar.created_at,
        updated_at=calendar.updated_at,
    )


@router.put("/calendar/{mester_id}", response_model=MesterCalendarResponse)
async def update_mester_calendar(
    mester_id: str,
    payload: MesterCalendarUpdate,
    db: Session = Depends(get_db),
):
    """Update mester's calendar settings"""
    
    mester_uuid = _validate_uuid(mester_id, "mester_id")
    if not mester_uuid:
        raise HTTPException(status_code=400, detail="Invalid mester_id")
    
    service = AppointmentService(db)
    calendar = service.update_calendar(mester_uuid, **payload.dict(exclude_unset=True))
    
    return MesterCalendarResponse(
        id=str(calendar.id),
        mester_id=str(calendar.mester_id),
        timezone=calendar.timezone,
        default_working_hours=calendar.default_working_hours,
        buffer_minutes=calendar.buffer_minutes,
        min_advance_hours=calendar.min_advance_hours,
        max_advance_days=calendar.max_advance_days,
        default_duration_minutes=calendar.default_duration_minutes,
        allow_online_booking=calendar.allow_online_booking,
        google_calendar_enabled=calendar.google_calendar_enabled,
        google_calendar_id=calendar.google_calendar_id,
        created_at=calendar.created_at,
        updated_at=calendar.updated_at,
    )


@router.post("/availability/{mester_id}", response_model=AvailabilitySlotResponse)
async def create_availability_slot(
    mester_id: str,
    payload: AvailabilitySlotCreate,
    db: Session = Depends(get_db),
):
    """Create an availability slot for a mester"""
    
    mester_uuid = _validate_uuid(mester_id, "mester_id")
    if not mester_uuid:
        raise HTTPException(status_code=400, detail="Invalid mester_id")
    
    service = AppointmentService(db)
    slot = service.create_availability_slot(
        mester_id=mester_uuid,
        start_time=payload.start_time,
        end_time=payload.end_time,
        is_available=payload.is_available,
        reason=payload.reason,
        notes=payload.notes,
        is_recurring=payload.is_recurring,
        recurrence_pattern=payload.recurrence_pattern,
    )
    
    return AvailabilitySlotResponse(
        id=str(slot.id),
        mester_id=str(slot.mester_id),
        start_time=slot.start_time,
        end_time=slot.end_time,
        is_available=slot.is_available,
        reason=slot.reason,
        notes=slot.notes,
        is_recurring=slot.is_recurring,
        recurrence_pattern=slot.recurrence_pattern,
        created_at=slot.created_at,
        updated_at=slot.updated_at,
    )


@router.get("/availability/{mester_id}/slots", response_model=List[AvailabilitySlotResponse])
async def list_availability_slots(
    mester_id: str,
    db: Session = Depends(get_db),
):
    """List all availability slots for a mester"""
    
    mester_uuid = _validate_uuid(mester_id, "mester_id")
    if not mester_uuid:
        raise HTTPException(status_code=400, detail="Invalid mester_id")
    
    service = AppointmentService(db)
    slots = service.list_availability_slots(mester_uuid)
    
    return [
        AvailabilitySlotResponse(
            id=str(slot.id),
            mester_id=str(slot.mester_id),
            start_time=slot.start_time,
            end_time=slot.end_time,
            is_available=slot.is_available,
            reason=slot.reason,
            notes=slot.notes,
            is_recurring=slot.is_recurring,
            recurrence_pattern=slot.recurrence_pattern,
            created_at=slot.created_at,
            updated_at=slot.updated_at,
        )
        for slot in slots
    ]


@router.post("/availability/{mester_id}/check", response_model=AvailabilityCheckResponse)
async def check_availability(
    mester_id: str,
    payload: AvailabilityCheckRequest,
    db: Session = Depends(get_db),
):
    """Check available time slots for a specific date"""
    
    from datetime import date as date_type
    
    mester_uuid = _validate_uuid(mester_id, "mester_id")
    if not mester_uuid:
        raise HTTPException(status_code=400, detail="Invalid mester_id")
    
    # Parse date string
    try:
        target_date = date_type.fromisoformat(payload.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    service = AppointmentService(db)
    slots = service.get_available_time_slots(
        mester_id=mester_uuid,
        target_date=target_date,
        duration_minutes=payload.duration_minutes,
    )
    
    return AvailabilityCheckResponse(
        date=payload.date,
        available_slots=[
            AvailableTimeSlot(
                start=slot["start"],
                end=slot["end"],
                duration_minutes=slot["duration_minutes"],
            )
            for slot in slots
        ],
    )


# -----------------------------
# Calendar Export Endpoints
# -----------------------------


@router.get("/export/mester/{mester_id}/ical")
async def export_mester_calendar(
    mester_id: str,
    db: Session = Depends(get_db),
):
    """Export mester's appointments as iCal file"""
    
    mester_uuid = _validate_uuid(mester_id, "mester_id")
    if not mester_uuid:
        raise HTTPException(status_code=400, detail="Invalid mester_id")
    
    calendar_service = CalendarService(db)
    ical_content = calendar_service.export_mester_calendar_ical(mester_uuid)
    
    return Response(
        content=ical_content,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f"attachment; filename=mestermind-mester-{mester_id}.ics"
        },
    )


@router.get("/export/customer/{customer_user_id}/ical")
async def export_customer_calendar(
    customer_user_id: str,
    db: Session = Depends(get_db),
):
    """Export customer's appointments as iCal file"""
    
    customer_uuid = _validate_uuid(customer_user_id, "customer_user_id")
    if not customer_uuid:
        raise HTTPException(status_code=400, detail="Invalid customer_user_id")
    
    calendar_service = CalendarService(db)
    ical_content = calendar_service.export_customer_calendar_ical(customer_uuid)
    
    return Response(
        content=ical_content,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f"attachment; filename=mestermind-customer-{customer_user_id}.ics"
        },
    )


@router.get("/export/{appointment_id}/ical")
async def export_appointment(
    appointment_id: str,
    db: Session = Depends(get_db),
):
    """Export a single appointment as iCal file"""
    
    appointment_uuid = _validate_uuid(appointment_id, "appointment_id")
    if not appointment_uuid:
        raise HTTPException(status_code=400, detail="Invalid appointment_id")
    
    calendar_service = CalendarService(db)
    ical_content = calendar_service.export_appointment_ical(appointment_uuid)
    
    return Response(
        content=ical_content,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f"attachment; filename=appointment-{appointment_id}.ics"
        },
    )


