"""
Request routes for autosave and resume.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, Set
import uuid as _uuid
from sqlalchemy import select
from fastapi import Query

from app.core.database import get_db
from app.core.auth import get_current_user, get_current_user_optional
from app.models.database import (
    Request as RequestModel,
    Service,
    QuestionSet,
    Question,
    MesterService,
    User,
)
from app.models.schemas import (
    RequestCreate,
    RequestUpdate,
    RequestResponse,
    WeeklyAvailability,
)
from app.services.notifications import NotificationService

router = APIRouter(prefix="/requests", tags=["requests"])


def _get_allowed_answer_keys(db: Session, question_set_id: str) -> Set[str]:
    keys: Set[str] = set()
    questions = (
        db.query(Question)
        .filter(
            Question.question_set_id == question_set_id,
            Question.is_active == True,
        )
        .all()
    )
    for q in questions:
        keys.add(q.key)
    # Include synthetic default timeline question key
    keys.add("timeline")
    # Allow client-provided availability (weekly or slots) to be saved with the request
    # even if not defined as a question in the question set
    keys.add("availability")
    return keys


def _sanitize_answers(
    raw: Optional[Dict[str, Any]], allowed: Set[str]
) -> Dict[str, Any]:
    if not isinstance(raw, dict):
        return {}
    return {k: v for k, v in raw.items() if k in allowed}


def _get_question_key_to_id(db: Session, question_set_id: str) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    questions = (
        db.query(Question)
        .filter(
            Question.question_set_id == question_set_id,
            Question.is_active == True,
        )
        .all()
    )
    for q in questions:
        mapping[q.key] = str(q.id)
    # Synthetic timeline question does not exist in DB; leave unmapped
    return mapping


def _structure_answers_with_ids(
    raw: Dict[str, Any],
    key_to_id: Dict[str, str],
) -> Dict[str, Any]:
    structured: Dict[str, Any] = {}
    for k, v in raw.items():
        qid = key_to_id.get(k)

        # Check if the value is already structured (has 'value' and optionally 'question_id')
        if isinstance(v, dict) and "value" in v:
            # Already structured, use as-is but ensure question_id is set if we have it
            if qid and "question_id" not in v:
                structured[k] = {**v, "question_id": qid}
            else:
                structured[k] = v
        else:
            # Not structured, wrap it
            if qid:
                structured[k] = {"value": v, "question_id": qid}
            else:
                structured[k] = {"value": v}
    return structured


@router.post("/", response_model=RequestResponse)
async def create_request(
    payload: RequestCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    service = db.query(Service).filter(Service.id == payload.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    qset = (
        db.query(QuestionSet).filter(QuestionSet.id == payload.question_set_id).first()
    )
    if not qset:
        raise HTTPException(status_code=404, detail="Question set not found")

    allowed_keys = _get_allowed_answer_keys(db, payload.question_set_id)
    sanitized_answers = _sanitize_answers(payload.answers, allowed_keys)
    key_to_id = _get_question_key_to_id(db, payload.question_set_id)
    structured_answers = _structure_answers_with_ids(sanitized_answers, key_to_id)

    # Determine user_id from payload or current_user
    user_id = None
    if payload.user_id:
        user_id = _uuid.UUID(payload.user_id)
    elif current_user:
        user_id = current_user.id

    req = RequestModel(
        service_id=payload.service_id,
        user_id=user_id,
        mester_id=payload.mester_id,
        question_set_id=payload.question_set_id,
        place_id=payload.place_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        contact_email=payload.contact_email,
        contact_phone=payload.contact_phone,
        postal_code=payload.postal_code,
        message_to_pro=payload.message_to_pro,
        budget_estimate=payload.budget_estimate,
        answers=structured_answers,
        current_step=0,
        status="DRAFT",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Upsert availability if provided via answers or payload
    try:
        avail: WeeklyAvailability | None = None
        if isinstance(payload.answers, dict):
            raw = (payload.answers or {}).get("availability")
            if isinstance(raw, dict) and raw.get("type") == "weekly":
                avail = WeeklyAvailability(**raw)
        # top-level not in create schema now, future-safe noop
    except Exception:
        avail = None
    if avail:
        from app.models.database import RequestAvailability

        existing = (
            db.query(RequestAvailability)
            .filter(RequestAvailability.request_id == req.id)
            .first()
        )
        if existing:
            existing.days = avail.days
            existing.start = avail.start
            existing.end = avail.end
        else:
            db.add(
                RequestAvailability(
                    request_id=req.id, days=avail.days, start=avail.start, end=avail.end
                )
            )
        db.commit()

    # Load availability if any
    availability_payload = None
    try:
        from app.models.database import RequestAvailability

        ra = (
            db.query(RequestAvailability)
            .filter(RequestAvailability.request_id == req.id)
            .first()
        )
        if ra:
            availability_payload = WeeklyAvailability(
                type="weekly", days=ra.days, start=ra.start, end=ra.end
            )
    except Exception:
        availability_payload = None

    return RequestResponse(
        id=str(req.id),
        service_id=str(req.service_id),
        user_id=str(req.user_id) if req.user_id else None,
        mester_id=str(req.mester_id) if req.mester_id else None,
        question_set_id=str(req.question_set_id),
        place_id=req.place_id,
        first_name=req.first_name,
        last_name=req.last_name,
        contact_email=req.contact_email,
        contact_phone=req.contact_phone,
        postal_code=req.postal_code,
        message_to_pro=req.message_to_pro,
        budget_estimate=float(req.budget_estimate) if req.budget_estimate is not None else None,
        current_step=req.current_step,
        answers=req.answers,
        availability=availability_payload,
        status=str(req.status),
        created_at=req.created_at,
        updated_at=req.updated_at,
    )


@router.get("/exists")
async def request_exists(
    service_id: str = Query(..., description="Service ID"),
    question_set_id: str = Query(..., description="Question set ID"),
    place_id: Optional[str] = Query(
        None, description="Place identifier used in search"
    ),
    db: Session = Depends(get_db),
):
    q = db.query(RequestModel).filter(
        RequestModel.service_id == service_id,
        RequestModel.question_set_id == question_set_id,
    )
    if place_id is not None:
        q = q.filter(RequestModel.place_id == place_id)

    # Prefer any non-draft request first, else any draft
    non_draft = q.filter(RequestModel.status != "DRAFT").first()
    if non_draft:
        return {
            "exists": True,
            "status": str(non_draft.status),
            "id": str(non_draft.id),
        }

    draft = q.filter(RequestModel.status == "DRAFT").first()
    if draft:
        return {"exists": True, "status": "draft", "id": str(draft.id)}

    return {"exists": False}


@router.get("/my-requests", response_model=list[RequestResponse])
async def get_my_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status: Optional[str] = Query(None, description="Filter by request status"),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
):
    """Get all requests created by the current user (matched by user_id)."""
    q = db.query(RequestModel).filter(RequestModel.user_id == current_user.id)

    if status is not None:
        status_value = status.strip().upper()
        q = q.filter(RequestModel.status == status_value)

    # Order newest first, exclude drafts by default
    q = q.filter(RequestModel.status != "DRAFT")
    q = q.order_by(RequestModel.created_at.desc())

    rows = q.offset(skip).limit(limit).all()

    result: list[RequestResponse] = []
    for req in rows:
        result.append(
            RequestResponse(
                id=str(req.id),
                service_id=str(req.service_id),
                user_id=str(req.user_id) if req.user_id else None,
                mester_id=str(req.mester_id) if req.mester_id else None,
                question_set_id=str(req.question_set_id),
                place_id=req.place_id,
                first_name=req.first_name,
                last_name=req.last_name,
                contact_email=req.contact_email,
                contact_phone=req.contact_phone,
                postal_code=req.postal_code,
                message_to_pro=req.message_to_pro,
                budget_estimate=float(req.budget_estimate) if req.budget_estimate is not None else None,
                current_step=req.current_step,
                answers=req.answers,
                status=req.status.value,
                created_at=req.created_at,
                updated_at=req.updated_at,
            )
        )

    return result


@router.get("/{request_id}", response_model=RequestResponse)
async def get_request(request_id: str, db: Session = Depends(get_db)):
    req: Optional[RequestModel] = (
        db.query(RequestModel).filter(RequestModel.id == request_id).first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    return RequestResponse(
        id=str(req.id),
        service_id=str(req.service_id),
        user_id=str(req.user_id) if req.user_id else None,
        mester_id=str(req.mester_id) if req.mester_id else None,
        question_set_id=str(req.question_set_id),
        place_id=req.place_id,
        first_name=req.first_name,
        last_name=req.last_name,
        contact_email=req.contact_email,
        contact_phone=req.contact_phone,
        postal_code=req.postal_code,
        message_to_pro=req.message_to_pro,
        budget_estimate=float(req.budget_estimate) if req.budget_estimate is not None else None,
        current_step=req.current_step,
        answers=req.answers,
        status=str(req.status),
        created_at=req.created_at,
        updated_at=req.updated_at,
    )


@router.patch("/{request_id}", response_model=RequestResponse)
async def update_request(
    request_id: str,
    payload: RequestUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    req: Optional[RequestModel] = (
        db.query(RequestModel).filter(RequestModel.id == request_id).first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Store old status to detect status change
    old_status = req.status

    if payload.answers is not None:
        # Sanitize incoming answers against the question set keys
        allowed_keys = _get_allowed_answer_keys(db, str(req.question_set_id))
        sanitized = _sanitize_answers(payload.answers, allowed_keys)
        key_to_id = _get_question_key_to_id(db, str(req.question_set_id))

        # Get current answers from database
        current: Dict[str, Any] = req.answers or {}

        # Merge incoming answers with current answers
        merged: Dict[str, Any] = {**current}
        for k, v in sanitized.items():
            qid = key_to_id.get(k)

            # Check if current answer is already structured
            if k in current and isinstance(current[k], dict) and "value" in current[k]:
                # Current answer is structured, update just the value
                merged[k] = {**current[k], "value": v}
                if qid:
                    merged[k]["question_id"] = qid
            else:
                # Current answer is not structured or doesn't exist, create new structure
                if qid:
                    merged[k] = {"value": v, "question_id": qid}
                else:
                    merged[k] = {"value": v}

        # Assign a brand-new dict so SQLAlchemy marks the JSON column as changed
        req.answers = merged
    # Upsert normalized availability from either answers.availability or top-level availability
    if payload.availability is not None or (
        isinstance(payload.answers, dict) and (payload.answers or {}).get("availability")
    ):
        top: WeeklyAvailability | None = None
        try:
            if payload.availability is not None:
                top = payload.availability
            else:
                raw = (payload.answers or {}).get("availability")
                if isinstance(raw, dict) and raw.get("type") == "weekly":
                    top = WeeklyAvailability(**raw)
        except Exception:
            top = None

        if top:
            from app.models.database import RequestAvailability

            existing = (
                db.query(RequestAvailability)
                .filter(RequestAvailability.request_id == req.id)
                .first()
            )
            if existing:
                existing.days = top.days
                existing.start = top.start
                existing.end = top.end
            else:
                db.add(
                    RequestAvailability(
                        request_id=req.id, days=top.days, start=top.start, end=top.end
                    )
                )

    if payload.current_step is not None:
        req.current_step = payload.current_step

    # Update contact/message fields when provided
    if payload.user_id is not None:
        try:
            req.user_id = _uuid.UUID(payload.user_id) if payload.user_id else None
        except (ValueError, TypeError) as exc:
            raise HTTPException(status_code=400, detail="Invalid user_id") from exc
    if payload.mester_id is not None:
        try:
            req.mester_id = _uuid.UUID(payload.mester_id) if payload.mester_id else None
        except (ValueError, TypeError) as exc:
            raise HTTPException(status_code=400, detail="Invalid mester_id") from exc
    if payload.first_name is not None:
        req.first_name = payload.first_name
    if payload.last_name is not None:
        req.last_name = payload.last_name
    if payload.contact_email is not None:
        req.contact_email = payload.contact_email
    if payload.contact_phone is not None:
        req.contact_phone = payload.contact_phone
    if payload.postal_code is not None:
        req.postal_code = payload.postal_code
    if payload.message_to_pro is not None:
        req.message_to_pro = payload.message_to_pro
    if getattr(payload, "budget_estimate", None) is not None:
        req.budget_estimate = payload.budget_estimate

    if payload.status is not None:
        incoming_status = str(payload.status).strip()
        allowed = {
            "DRAFT",
            "OPEN",
            "QUOTED",
            "SHORTLISTED",
            "ACCEPTED",
            "BOOKED",
            "EXPIRED",
            "CANCELLED",
        }
        upper = incoming_status.upper()
        if upper not in allowed:
            # Back-compat mappings
            aliases = {
                "SUBMITTED": "OPEN",
            }
            upper = aliases.get(upper, upper)
        if upper not in allowed:
            raise HTTPException(status_code=400, detail="Invalid status")

        # Validate contact info if changing to OPEN
        if upper == "OPEN":
            has_email = req.contact_email and req.contact_email.strip()
            has_phone = req.contact_phone and req.contact_phone.strip()

            if not has_email and not has_phone:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot set status to OPEN without contact email or phone",
                )

        # Assign raw uppercase string so it matches DB enum values exactly
        req.status = upper  # type: ignore[assignment]

    # Defensive normalization to uppercase if a raw string slipped through
    if isinstance(req.status, str):
        req.status = req.status.strip().upper()  # type: ignore[assignment]

    db.add(req)
    db.commit()
    db.refresh(req)

    # Trigger notifications when status changes to OPEN
    # Handle both enum and string statuses - extract the actual value
    if isinstance(req.status, str):
        new_status = req.status
    else:
        # It's an enum, get the value
        new_status = (
            req.status.value
            if hasattr(req.status, "value")
            else str(req.status).split(".")[-1]
        )

    if isinstance(old_status, str):
        old_status_str = old_status
    else:
        # It's an enum, get the value
        old_status_str = (
            old_status.value
            if hasattr(old_status, "value")
            else str(old_status).split(".")[-1]
        )

    print(
        f"[NOTIFICATION DEBUG] old_status: {old_status_str}, new_status: {new_status}"
    )

    if old_status_str != "OPEN" and new_status == "OPEN":
        print(f"[NOTIFICATION DEBUG] Triggering notifications for request {req.id}")
        # Request was just opened - notify matching professionals
        notification_service = NotificationService(db)
        try:
            notifications = await notification_service.notify_new_request(
                request_id=req.id,
                background_tasks=background_tasks,
            )
            print(f"[NOTIFICATION DEBUG] Created {len(notifications)} notifications")
        except Exception as e:
            print(f"[NOTIFICATION DEBUG] Error creating notifications: {e}")
            import traceback

            traceback.print_exc()

    # Load availability for response
    availability_payload = None
    try:
        from app.models.database import RequestAvailability

        ra = (
            db.query(RequestAvailability)
            .filter(RequestAvailability.request_id == req.id)
            .first()
        )
        if ra:
            availability_payload = WeeklyAvailability(
                type="weekly", days=ra.days, start=ra.start, end=ra.end
            )
    except Exception:
        availability_payload = None

    return RequestResponse(
        id=str(req.id),
        service_id=str(req.service_id),
        user_id=str(req.user_id) if req.user_id else None,
        mester_id=str(req.mester_id) if req.mester_id else None,
        question_set_id=str(req.question_set_id),
        place_id=req.place_id,
        first_name=req.first_name,
        last_name=req.last_name,
        contact_email=req.contact_email,
        contact_phone=req.contact_phone,
        postal_code=req.postal_code,
        message_to_pro=req.message_to_pro,
        budget_estimate=float(req.budget_estimate) if req.budget_estimate is not None else None,
        current_step=req.current_step,
        answers=req.answers,
        availability=availability_payload,
        status=req.status.value,
        created_at=req.created_at,
        updated_at=req.updated_at,
    )


@router.delete("/{request_id}")
async def delete_request(request_id: str, db: Session = Depends(get_db)):
    """Delete a customer request by ID with proper cascade deletion."""
    try:
        # Convert string to UUID for proper querying
        request_uuid = _uuid.UUID(request_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid request ID format")
    
    req: Optional[RequestModel] = (
        db.query(RequestModel).filter(RequestModel.id == request_uuid).first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Get related data counts for logging/debugging
    from app.models.database import Offer, MessageThread, Notification, NotificationLog
    
    # Count related records before deletion
    offer_count = db.query(Offer).filter(Offer.request_id == request_uuid).count()
    thread_count = db.query(MessageThread).filter(MessageThread.request_id == request_uuid).count()
    notification_count = db.query(Notification).filter(Notification.request_id == request_uuid).count()
    
    # Log the cascade deletion for audit purposes
    print(f"Deleting request {request_id} with {offer_count} offers, {thread_count} message threads, and {notification_count} notifications")
    
    try:
        # Delete the request - this will cascade to:
        # - Offers (CASCADE)
        # - RequestAvailability (CASCADE) 
        # - MessageThreads (CASCADE)
        # - Messages (via MessageThread cascade)
        db.delete(req)
        
        # Manually delete notifications and their logs since they don't have CASCADE
        # First, get all notification IDs for this request
        notification_ids = db.query(Notification.id).filter(Notification.request_id == request_uuid).all()
        notification_ids = [nid[0] for nid in notification_ids]
        
        if notification_ids:
            # Delete notification logs first (due to foreign key constraint)
            db.query(NotificationLog).filter(NotificationLog.notification_id.in_(notification_ids)).delete()
            # Then delete notifications
            db.query(Notification).filter(Notification.request_id == request_uuid).delete()
        
        db.commit()
        
        return {
            "ok": True, 
            "deleted_counts": {
                "offers": offer_count,
                "message_threads": thread_count,
                "notifications": notification_count
            }
        }
    except Exception as e:
        db.rollback()
        print(f"Error deleting request {request_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete request: {str(e)}")


@router.get("/", response_model=list[RequestResponse])
async def list_requests(
    db: Session = Depends(get_db),
    mester_id: Optional[str] = Query(None, description="Filter by mester id"),
    match_mester_services: bool = Query(
        False, description="Include requests for services this mester provides"
    ),
    status: Optional[str] = Query(
        "OPEN", description="Filter by request status (default: OPEN to exclude drafts)"
    ),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
):
    """List customer requests.

    When `mester_id` is provided and `match_mester_services` is true, returns the union of:
      - requests explicitly assigned to the mester, and
      - requests whose service_id is in the mester's active services.

    Results are de-duplicated by id and ordered by created_at desc.
    """
    q = db.query(RequestModel)

    filters = []
    if status is not None:
        # Use uppercase enum values as they match the database
        status_value = status.strip().upper()
        filters.append(RequestModel.status == status_value)

    if mester_id and match_mester_services:
        # Build a subquery of service_ids for this mester
        service_ids_select = (
            select(MesterService.service_id)
            .where(MesterService.mester_id == _uuid.UUID(mester_id))
            .where(MesterService.is_active == True)  # noqa: E712
        )
        q = q.filter(
            (RequestModel.mester_id == _uuid.UUID(mester_id))
            | (RequestModel.service_id.in_(service_ids_select))
        )
    elif mester_id:
        q = q.filter(RequestModel.mester_id == _uuid.UUID(mester_id))

    if filters:
        for f in filters:
            q = q.filter(f)

    # Order newest first
    q = q.order_by(RequestModel.created_at.desc())

    # Apply pagination
    rows = q.offset(skip).limit(limit).all()

    # Dedupe by id defensively (in case of joins in future edits)
    seen: set[str] = set()
    result: list[RequestResponse] = []
    for req in rows:
        rid = str(req.id)
        if rid in seen:
            continue
        seen.add(rid)
        result.append(
            RequestResponse(
                id=str(req.id),
                service_id=str(req.service_id),
                user_id=str(req.user_id) if req.user_id else None,
                mester_id=str(req.mester_id) if req.mester_id else None,
                question_set_id=str(req.question_set_id),
                place_id=req.place_id,
                first_name=req.first_name,
                last_name=req.last_name,
                contact_email=req.contact_email,
                contact_phone=req.contact_phone,
                postal_code=req.postal_code,
                message_to_pro=req.message_to_pro,
                budget_estimate=float(req.budget_estimate) if req.budget_estimate is not None else None,
                current_step=req.current_step,
                answers=req.answers,
                status=req.status.value,
                created_at=req.created_at,
                updated_at=req.updated_at,
            )
        )

    return result
