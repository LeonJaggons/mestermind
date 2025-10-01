"""
Request routes for autosave and resume.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, Set
import uuid as _uuid
from sqlalchemy import select
from fastapi import Query

from app.core.database import get_db
from app.models.database import (
    Request as RequestModel,
    Service,
    QuestionSet,
    Question,
    MesterService,
)
from app.models.schemas import (
    RequestCreate,
    RequestUpdate,
    RequestResponse,
)

router = APIRouter(prefix="/requests", tags=["requests"])


def _get_allowed_answer_keys(db: Session, question_set_id: str) -> Set[str]:
    keys: Set[str] = set()
    questions = db.query(Question).filter(
        Question.question_set_id == question_set_id,
        Question.is_active == True,
    ).all()
    for q in questions:
        keys.add(q.key)
    # Include synthetic default timeline question key
    keys.add("timeline")
    return keys

def _sanitize_answers(raw: Optional[Dict[str, Any]], allowed: Set[str]) -> Dict[str, Any]:
    if not isinstance(raw, dict):
        return {}
    return {k: v for k, v in raw.items() if k in allowed}

def _get_question_key_to_id(db: Session, question_set_id: str) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    questions = db.query(Question).filter(
        Question.question_set_id == question_set_id,
        Question.is_active == True,
    ).all()
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
        # Store as object containing value and question_id when available; fallback to value only
        if qid:
            structured[k] = {"value": v, "question_id": qid}
        else:
            structured[k] = {"value": v}
    return structured

@router.post("/", response_model=RequestResponse)
async def create_request(payload: RequestCreate, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == payload.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    qset = db.query(QuestionSet).filter(QuestionSet.id == payload.question_set_id).first()
    if not qset:
        raise HTTPException(status_code=404, detail="Question set not found")

    allowed_keys = _get_allowed_answer_keys(db, payload.question_set_id)
    sanitized_answers = _sanitize_answers(payload.answers, allowed_keys)
    key_to_id = _get_question_key_to_id(db, payload.question_set_id)
    structured_answers = _structure_answers_with_ids(sanitized_answers, key_to_id)

    req = RequestModel(
        service_id=payload.service_id,
        mester_id=payload.mester_id,
        question_set_id=payload.question_set_id,
        place_id=payload.place_id,
        contact_email=payload.contact_email,
        contact_phone=payload.contact_phone,
        postal_code=payload.postal_code,
        message_to_pro=payload.message_to_pro,
        answers=structured_answers,
        current_step=payload.current_step or 0,
        status="DRAFT",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    return RequestResponse(
        id=str(req.id),
        service_id=str(req.service_id),
        mester_id=str(req.mester_id) if req.mester_id else None,
        question_set_id=str(req.question_set_id),
        place_id=req.place_id,
        contact_email=req.contact_email,
        contact_phone=req.contact_phone,
        postal_code=req.postal_code,
        message_to_pro=req.message_to_pro,
        current_step=req.current_step,
        answers=req.answers,
        status=str(req.status),
        created_at=req.created_at,
        updated_at=req.updated_at,
    )


@router.get("/exists")
async def request_exists(
    service_id: str = Query(..., description="Service ID"),
    question_set_id: str = Query(..., description="Question set ID"),
    place_id: Optional[str] = Query(None, description="Place identifier used in search"),
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
        return {"exists": True, "status": str(non_draft.status), "id": str(non_draft.id)}

    draft = q.filter(RequestModel.status == "DRAFT").first()
    if draft:
        return {"exists": True, "status": "draft", "id": str(draft.id)}

    return {"exists": False}


@router.get("/{request_id}", response_model=RequestResponse)
async def get_request(request_id: str, db: Session = Depends(get_db)):
    req: Optional[RequestModel] = db.query(RequestModel).filter(RequestModel.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    return RequestResponse(
        id=str(req.id),
        service_id=str(req.service_id),
        mester_id=str(req.mester_id) if req.mester_id else None,
        question_set_id=str(req.question_set_id),
        place_id=req.place_id,
        contact_email=req.contact_email,
        contact_phone=req.contact_phone,
        postal_code=req.postal_code,
        message_to_pro=req.message_to_pro,
        current_step=req.current_step,
        answers=req.answers,
        status=str(req.status),
        created_at=req.created_at,
        updated_at=req.updated_at,
    )


@router.patch("/{request_id}", response_model=RequestResponse)
async def update_request(request_id: str, payload: RequestUpdate, db: Session = Depends(get_db)):
    req: Optional[RequestModel] = db.query(RequestModel).filter(RequestModel.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if payload.answers is not None:
        # Sanitize and merge answers against the question set keys, and attach question_id metadata
        allowed_keys = _get_allowed_answer_keys(db, str(req.question_set_id))
        sanitized = _sanitize_answers(payload.answers, allowed_keys)
        key_to_id = _get_question_key_to_id(db, str(req.question_set_id))
        incoming_structured = _structure_answers_with_ids(sanitized, key_to_id)
        current: Dict[str, Any] = req.answers or {}
        merged: Dict[str, Any] = {**current}
        for k, v in incoming_structured.items():
            merged[k] = v
        # Assign a brand-new dict so SQLAlchemy marks the JSON column as changed
        req.answers = merged

    if payload.current_step is not None:
        req.current_step = payload.current_step

    # Update contact/message fields when provided
    if payload.mester_id is not None:
        try:
            req.mester_id = _uuid.UUID(payload.mester_id) if payload.mester_id else None
        except (ValueError, TypeError) as exc:
            raise HTTPException(status_code=400, detail="Invalid mester_id") from exc
    if payload.contact_email is not None:
        req.contact_email = payload.contact_email
    if payload.contact_phone is not None:
        req.contact_phone = payload.contact_phone
    if payload.postal_code is not None:
        req.postal_code = payload.postal_code
    if payload.message_to_pro is not None:
        req.message_to_pro = payload.message_to_pro

    if payload.status is not None:
        incoming_status = str(payload.status).strip()
        allowed = {"DRAFT", "OPEN", "QUOTED", "SHORTLISTED", "ACCEPTED", "BOOKED", "EXPIRED", "CANCELLED"}
        upper = incoming_status.upper()
        if upper not in allowed:
            # Back-compat mappings
            aliases = {
                "SUBMITTED": "OPEN",
            }
            upper = aliases.get(upper, upper)
        if upper not in allowed:
            raise HTTPException(status_code=400, detail="Invalid status")
        # Assign raw uppercase string so it matches DB enum values exactly
        req.status = upper  # type: ignore[assignment]

    # Defensive normalization to uppercase if a raw string slipped through
    if isinstance(req.status, str):
        req.status = req.status.strip().upper()  # type: ignore[assignment]

    db.add(req)
    db.commit()
    db.refresh(req)

    return RequestResponse(
        id=str(req.id),
        service_id=str(req.service_id),
        mester_id=str(req.mester_id) if req.mester_id else None,
        question_set_id=str(req.question_set_id),
        place_id=req.place_id,
        contact_email=req.contact_email,
        contact_phone=req.contact_phone,
        postal_code=req.postal_code,
        message_to_pro=req.message_to_pro,
        current_step=req.current_step,
        answers=req.answers,
        status=req.status.value,
        created_at=req.created_at,
        updated_at=req.updated_at,
    )


@router.delete("/{request_id}")
async def delete_request(request_id: str, db: Session = Depends(get_db)):
    """Delete a customer request by ID."""
    req: Optional[RequestModel] = db.query(RequestModel).filter(RequestModel.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    db.delete(req)
    db.commit()
    
    return {"ok": True}


@router.get("/", response_model=list[RequestResponse])
async def list_requests(
    db: Session = Depends(get_db),
    mester_id: Optional[str] = Query(None, description="Filter by mester id"),
    match_mester_services: bool = Query(False, description="Include requests for services this mester provides"),
    status: Optional[str] = Query(None, description="Filter by request status"),
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
        filters.append(RequestModel.status == status.strip().upper())

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
                mester_id=str(req.mester_id) if req.mester_id else None,
                question_set_id=str(req.question_set_id),
                place_id=req.place_id,
                contact_email=req.contact_email,
                contact_phone=req.contact_phone,
                postal_code=req.postal_code,
                message_to_pro=req.message_to_pro,
                current_step=req.current_step,
                answers=req.answers,
                status=req.status.value,
                created_at=req.created_at,
                updated_at=req.updated_at,
            )
        )

    return result
