"""
Question Set routes for Mestermind API
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from app.core.database import get_db
from app.models import (
    QuestionSet,
    Question,
    Service,
    QuestionSetCreate,
    QuestionSetUpdate,
    QuestionSetResponse,
    QuestionSetListResponse,
    QuestionSetStatus,
    QuestionType,
)

router = APIRouter(prefix="/question-sets", tags=["question-sets"])


def _build_default_timeline_question(question_set_id: str, sort_order_base: int = 10000) -> dict:
    """Create a synthetic default timeline question to append to any question set.

    This is not persisted in the database; it's injected into responses for consistency across all sets.
    """
    return {
        "id": str(uuid.uuid4()),
        "question_set_id": str(question_set_id),
        "key": "timeline",
        "label": "What's your timeline?",
        "description": None,
        "question_type": QuestionType.SELECT,
        "is_required": False,
        "is_active": True,
        "sort_order": sort_order_base,
        "options": {
            "choices": [
                "Urgent — need a pro right away\nWithin 48 hours",
                "Ready to hire, but not in a hurry\nWithin 7 days",
                "Still researching\nNo timeline in mind",
            ]
        },
        "min_value": None,
        "max_value": None,
        "min_length": None,
        "max_length": None,
        "conditional_rules": None,
        "allowed_file_types": None,
        "max_file_size": None,
        "created_at": datetime.utcnow(),
        "updated_at": None,
    }


@router.get("/", response_model=List[QuestionSetListResponse])
async def get_question_sets(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of question sets to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of question sets to return"),
    service_id: Optional[str] = Query(None, description="Filter by service ID"),
    status: Optional[QuestionSetStatus] = Query(None, description="Filter by status"),
    is_active: bool = Query(True, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search in question set names")
):
    """Get all question sets with optional filtering and pagination"""
    query = db.query(QuestionSet)
    
    # Apply filters
    if service_id:
        query = query.filter(QuestionSet.service_id == service_id)
    if status:
        query = query.filter(QuestionSet.status == status)
    if is_active is not None:
        query = query.filter(QuestionSet.is_active == is_active)
    if search:
        query = query.filter(QuestionSet.name.ilike(f"%{search}%"))
    
    # Apply pagination and ordering
    question_sets = query.order_by(QuestionSet.sort_order, QuestionSet.name).offset(skip).limit(limit).all()
    
    result = []
    for question_set in question_sets:
        question_count = db.query(Question).filter(
            Question.question_set_id == question_set.id,
            Question.is_active == True
        ).count()
        
        question_set_data: Dict[str, Any] = {
            "id": str(question_set.id),
            "service_id": str(question_set.service_id),
            "name": question_set.name,
            "description": question_set.description,
            "status": question_set.status,
            "is_active": question_set.is_active,
            "sort_order": question_set.sort_order,
            "version": question_set.version,
            "created_at": question_set.created_at,
            "updated_at": question_set.updated_at,
            "question_count": question_count
        }
        result.append(QuestionSetListResponse(**question_set_data))  # type: ignore[call-arg]
    
    return result


@router.get("/{question_set_id}", response_model=QuestionSetResponse)
async def get_question_set(question_set_id: str, db: Session = Depends(get_db)):
    """Get a specific question set by ID with all questions"""
    question_set = db.query(QuestionSet).filter(QuestionSet.id == question_set_id).first()
    if not question_set:
        raise HTTPException(status_code=404, detail="Question set not found")
    
    # Get all active questions for this question set
    questions = db.query(Question).filter(
        Question.question_set_id == question_set_id,
        Question.is_active == True
    ).order_by(Question.sort_order, Question.label).all()
    
    questions_data = []
    for question in questions:
        question_data = {
            "id": str(question.id),
            "question_set_id": str(question.question_set_id),
            "key": question.key,
            "label": question.label,
            "description": question.description,
            "question_type": question.question_type,
            "is_required": question.is_required,
            "is_active": question.is_active,
            "sort_order": question.sort_order,
            "options": question.options,
            "min_value": question.min_value,
            "max_value": question.max_value,
            "min_length": question.min_length,
            "max_length": question.max_length,
            "conditional_rules": question.conditional_rules,
            "allowed_file_types": question.allowed_file_types,
            "max_file_size": question.max_file_size,
            "created_at": question.created_at,
            "updated_at": question.updated_at
        }
        questions_data.append(question_data)
    
    # Append default timeline question at the end
    questions_data.append(_build_default_timeline_question(str(question_set.id)))
    
    question_set_data: Dict[str, Any] = {
        "id": str(question_set.id),
        "service_id": str(question_set.service_id),
        "name": question_set.name,
        "description": question_set.description,
        "status": question_set.status,
        "is_active": question_set.is_active,
        "sort_order": question_set.sort_order,
        "version": question_set.version,
        "created_at": question_set.created_at,
        "updated_at": question_set.updated_at,
        "questions": questions_data
    }
    return QuestionSetResponse(**question_set_data)  # type: ignore[call-arg]


@router.post("/", response_model=QuestionSetResponse)
async def create_question_set(question_set: QuestionSetCreate, db: Session = Depends(get_db)):
    """Create a new question set"""
    # Verify service exists
    service = db.query(Service).filter(Service.id == question_set.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Check if question set name already exists for this service
    existing_question_set = db.query(QuestionSet).filter(
        QuestionSet.name == question_set.name,
        QuestionSet.service_id == question_set.service_id
    ).first()
    if existing_question_set:
        raise HTTPException(status_code=400, detail="Question set with this name already exists for this service")
    
    # Get the next version number for this service
    max_version = db.query(QuestionSet).filter(
        QuestionSet.service_id == question_set.service_id
    ).order_by(QuestionSet.version.desc()).first()
    next_version = (max_version.version + 1) if max_version else 1
    
    db_question_set = QuestionSet(
        service_id=question_set.service_id,
        name=question_set.name,
        description=question_set.description,
        status=question_set.status,
        is_active=question_set.is_active,
        sort_order=question_set.sort_order,
        version=next_version
    )
    db.add(db_question_set)
    db.commit()
    db.refresh(db_question_set)
    
    question_set_data: Dict[str, Any] = {
        "id": str(db_question_set.id),
        "service_id": str(db_question_set.service_id),
        "name": db_question_set.name,
        "description": db_question_set.description,
        "status": db_question_set.status,
        "is_active": db_question_set.is_active,
        "sort_order": db_question_set.sort_order,
        "version": db_question_set.version,
        "created_at": db_question_set.created_at,
        "updated_at": db_question_set.updated_at,
        # No questions immediately; clients fetch questions separately and will receive the default timeline.
        "questions": []
    }
    return QuestionSetResponse(**question_set_data)  # type: ignore[call-arg]


@router.put("/{question_set_id}", response_model=QuestionSetResponse)
async def update_question_set(question_set_id: str, question_set_update: QuestionSetUpdate, db: Session = Depends(get_db)):
    """Update a question set"""
    db_question_set = db.query(QuestionSet).filter(QuestionSet.id == question_set_id).first()
    if not db_question_set:
        raise HTTPException(status_code=404, detail="Question set not found")
    
    # Check for duplicate question set name if name is being updated
    update_data = question_set_update.dict(exclude_unset=True)
    
    if "name" in update_data:
        existing_question_set = db.query(QuestionSet).filter(
            QuestionSet.name == update_data["name"],
            QuestionSet.service_id == db_question_set.service_id,
            QuestionSet.id != question_set_id
        ).first()
        if existing_question_set:
            raise HTTPException(status_code=400, detail="Question set with this name already exists for this service")
    
    # Apply updates
    for field, value in update_data.items():
        setattr(db_question_set, field, value)
    
    db.commit()
    db.refresh(db_question_set)
    
    # Get all active questions for this question set
    questions = db.query(Question).filter(
        Question.question_set_id == question_set_id,
        Question.is_active == True
    ).order_by(Question.sort_order, Question.label).all()
    
    questions_data = []
    for question in questions:
        question_data = {
            "id": str(question.id),
            "question_set_id": str(question.question_set_id),
            "key": question.key,
            "label": question.label,
            "description": question.description,
            "question_type": question.question_type,
            "is_required": question.is_required,
            "is_active": question.is_active,
            "sort_order": question.sort_order,
            "options": question.options,
            "min_value": question.min_value,
            "max_value": question.max_value,
            "min_length": question.min_length,
            "max_length": question.max_length,
            "conditional_rules": question.conditional_rules,
            "allowed_file_types": question.allowed_file_types,
            "max_file_size": question.max_file_size,
            "created_at": question.created_at,
            "updated_at": question.updated_at
        }
        questions_data.append(question_data)
    
    # Append default timeline question at the end
    questions_data.append(_build_default_timeline_question(str(question_set_id)))
    
    question_set_data = {
        "id": str(db_question_set.id),
        "service_id": str(db_question_set.service_id),
        "name": db_question_set.name,
        "description": db_question_set.description,
        "status": db_question_set.status,
        "is_active": db_question_set.is_active,
        "sort_order": db_question_set.sort_order,
        "version": db_question_set.version,
        "created_at": db_question_set.created_at,
        "updated_at": db_question_set.updated_at,
        "questions": questions_data
    }
    return QuestionSetResponse(**question_set_data)  # type: ignore[call-arg]


@router.delete("/{question_set_id}")
async def delete_question_set(question_set_id: str, db: Session = Depends(get_db)):
    """Delete a question set (soft delete by setting is_active=False)"""
    db_question_set = db.query(QuestionSet).filter(QuestionSet.id == question_set_id).first()
    if not db_question_set:
        raise HTTPException(status_code=404, detail="Question set not found")
    
    db_question_set.is_active = False
    db.commit()
    
    return {"message": "Question set deleted successfully"}


@router.post("/{question_set_id}/publish")
async def publish_question_set(question_set_id: str, db: Session = Depends(get_db)):
    """Publish a question set (change status from draft to published)"""
    db_question_set = db.query(QuestionSet).filter(QuestionSet.id == question_set_id).first()
    if not db_question_set:
        raise HTTPException(status_code=404, detail="Question set not found")
    
    if db_question_set.status == QuestionSetStatus.PUBLISHED:
        raise HTTPException(status_code=400, detail="Question set is already published")
    
    # Check if there are any questions in the question set
    question_count = db.query(Question).filter(
        Question.question_set_id == question_set_id,
        Question.is_active == True
    ).count()
    
    if question_count == 0:
        raise HTTPException(status_code=400, detail="Cannot publish question set without any questions")
    
    db_question_set.status = QuestionSetStatus.PUBLISHED
    db.commit()
    
    return {"message": "Question set published successfully"}


@router.post("/{question_set_id}/unpublish")
async def unpublish_question_set(question_set_id: str, db: Session = Depends(get_db)):
    """Unpublish a question set (change status from published to draft)"""
    db_question_set = db.query(QuestionSet).filter(QuestionSet.id == question_set_id).first()
    if not db_question_set:
        raise HTTPException(status_code=404, detail="Question set not found")
    
    if db_question_set.status == QuestionSetStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Question set is already in draft status")
    
    db_question_set.status = QuestionSetStatus.DRAFT
    db.commit()
    
    return {"message": "Question set unpublished successfully"}


@router.get("/service/{service_id}", response_model=List[QuestionSetListResponse])
async def get_question_sets_by_service(service_id: str, db: Session = Depends(get_db)):
    """Get all question sets for a specific service"""
    # Verify service exists
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    question_sets = db.query(QuestionSet).filter(
        QuestionSet.service_id == service_id,
        QuestionSet.is_active == True
    ).order_by(QuestionSet.sort_order, QuestionSet.name).all()
    
    result = []
    for question_set in question_sets:
        question_count = db.query(Question).filter(
            Question.question_set_id == question_set.id,
            Question.is_active == True
        ).count()
        
        question_set_data: Dict[str, Any] = {
            "id": str(question_set.id),
            "service_id": str(question_set.service_id),
            "name": question_set.name,
            "description": question_set.description,
            "status": question_set.status,
            "is_active": question_set.is_active,
            "sort_order": question_set.sort_order,
            "version": question_set.version,
            "created_at": question_set.created_at,
            "updated_at": question_set.updated_at,
            "question_count": question_count
        }
        result.append(QuestionSetListResponse(**question_set_data))  # type: ignore[call-arg]
    
    return result

