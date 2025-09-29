"""
Request routes for autosave and resume.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, Set

from app.core.database import get_db
from app.models.database import Request as RequestModel, RequestStatus, Service, QuestionSet, Question
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

    req = RequestModel(
        service_id=payload.service_id,
        question_set_id=payload.question_set_id,
        place_id=payload.place_id,
        answers=sanitized_answers,
        current_step=payload.current_step or 0,
        status=RequestStatus.DRAFT,
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    return RequestResponse(
        id=str(req.id),
        service_id=str(req.service_id),
        question_set_id=str(req.question_set_id),
        place_id=req.place_id,
        current_step=req.current_step,
        answers=req.answers,
        status=req.status.value,
        created_at=req.created_at,
        updated_at=req.updated_at,
    )


@router.get("/{request_id}", response_model=RequestResponse)
async def get_request(request_id: str, db: Session = Depends(get_db)):
    req: Optional[RequestModel] = db.query(RequestModel).filter(RequestModel.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    return RequestResponse(
        id=str(req.id),
        service_id=str(req.service_id),
        question_set_id=str(req.question_set_id),
        place_id=req.place_id,
        current_step=req.current_step,
        answers=req.answers,
        status=req.status.value,
        created_at=req.created_at,
        updated_at=req.updated_at,
    )


@router.patch("/{request_id}", response_model=RequestResponse)
async def update_request(request_id: str, payload: RequestUpdate, db: Session = Depends(get_db)):
    req: Optional[RequestModel] = db.query(RequestModel).filter(RequestModel.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if payload.answers is not None:
        # Sanitize and merge answers against the question set keys
        allowed_keys = _get_allowed_answer_keys(db, str(req.question_set_id))
        incoming = _sanitize_answers(payload.answers, allowed_keys)
        current: Dict[str, Any] = req.answers or {}
        # Assign a brand-new dict so SQLAlchemy marks the JSON column as changed
        req.answers = {**current, **incoming}

    if payload.current_step is not None:
        req.current_step = payload.current_step

    if payload.status is not None:
        try:
            req.status = RequestStatus(payload.status)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid status") from exc

    db.add(req)
    db.commit()
    db.refresh(req)

    return RequestResponse(
        id=str(req.id),
        service_id=str(req.service_id),
        question_set_id=str(req.question_set_id),
        place_id=req.place_id,
        current_step=req.current_step,
        answers=req.answers,
        status=req.status.value,
        created_at=req.created_at,
        updated_at=req.updated_at,
    )


