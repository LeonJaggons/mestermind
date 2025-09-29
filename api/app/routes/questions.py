"""
Question routes for Mestermind API
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models import (
    Question,
    QuestionSet,
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    QuestionType
)

router = APIRouter(prefix="/questions", tags=["questions"])


@router.get("/", response_model=List[QuestionResponse])
async def get_questions(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of questions to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of questions to return"),
    question_set_id: Optional[str] = Query(None, description="Filter by question set ID"),
    question_type: Optional[QuestionType] = Query(None, description="Filter by question type"),
    is_required: Optional[bool] = Query(None, description="Filter by required status"),
    is_active: bool = Query(True, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search in question labels")
):
    """Get all questions with optional filtering and pagination"""
    query = db.query(Question)
    
    # Apply filters
    if question_set_id:
        query = query.filter(Question.question_set_id == question_set_id)
    if question_type:
        query = query.filter(Question.question_type == question_type)
    if is_required is not None:
        query = query.filter(Question.is_required == is_required)
    if is_active is not None:
        query = query.filter(Question.is_active == is_active)
    if search:
        query = query.filter(Question.label.ilike(f"%{search}%"))
    
    # Apply pagination and ordering
    questions = query.order_by(Question.sort_order, Question.label).offset(skip).limit(limit).all()
    
    result = []
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
        result.append(QuestionResponse(**question_data))
    
    return result


@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question(question_id: str, db: Session = Depends(get_db)):
    """Get a specific question by ID"""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
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
    return QuestionResponse(**question_data)


@router.post("/", response_model=QuestionResponse)
async def create_question(question: QuestionCreate, db: Session = Depends(get_db)):
    """Create a new question"""
    # Verify question set exists
    question_set = db.query(QuestionSet).filter(QuestionSet.id == question.question_set_id).first()
    if not question_set:
        raise HTTPException(status_code=404, detail="Question set not found")
    
    # Check if question key already exists in this question set
    existing_question = db.query(Question).filter(
        Question.key == question.key,
        Question.question_set_id == question.question_set_id
    ).first()
    if existing_question:
        raise HTTPException(status_code=400, detail="Question with this key already exists in this question set")
    
    # Validate question type specific fields
    _validate_question_type_fields(question)
    
    db_question = Question(
        question_set_id=question.question_set_id,
        key=question.key,
        label=question.label,
        description=question.description,
        question_type=question.question_type,
        is_required=question.is_required,
        is_active=question.is_active,
        sort_order=question.sort_order,
        options=question.options,
        min_value=question.min_value,
        max_value=question.max_value,
        min_length=question.min_length,
        max_length=question.max_length,
        conditional_rules=question.conditional_rules,
        allowed_file_types=question.allowed_file_types,
        max_file_size=question.max_file_size
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    
    question_data = {
        "id": str(db_question.id),
        "question_set_id": str(db_question.question_set_id),
        "key": db_question.key,
        "label": db_question.label,
        "description": db_question.description,
        "question_type": db_question.question_type,
        "is_required": db_question.is_required,
        "is_active": db_question.is_active,
        "sort_order": db_question.sort_order,
        "options": db_question.options,
        "min_value": db_question.min_value,
        "max_value": db_question.max_value,
        "min_length": db_question.min_length,
        "max_length": db_question.max_length,
        "conditional_rules": db_question.conditional_rules,
        "allowed_file_types": db_question.allowed_file_types,
        "max_file_size": db_question.max_file_size,
        "created_at": db_question.created_at,
        "updated_at": db_question.updated_at
    }
    return QuestionResponse(**question_data)


@router.put("/{question_id}", response_model=QuestionResponse)
async def update_question(question_id: str, question_update: QuestionUpdate, db: Session = Depends(get_db)):
    """Update a question"""
    db_question = db.query(Question).filter(Question.id == question_id).first()
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check for duplicate question key if key is being updated
    update_data = question_update.dict(exclude_unset=True)
    
    if "key" in update_data:
        existing_question = db.query(Question).filter(
            Question.key == update_data["key"],
            Question.question_set_id == db_question.question_set_id,
            Question.id != question_id
        ).first()
        if existing_question:
            raise HTTPException(status_code=400, detail="Question with this key already exists in this question set")
    
    # Validate question type specific fields if question_type is being updated
    if "question_type" in update_data:
        # Create a temporary question object for validation
        temp_question = QuestionCreate(
            question_set_id=str(db_question.question_set_id),
            key=update_data.get("key", db_question.key),
            label=update_data.get("label", db_question.label),
            question_type=update_data["question_type"],
            options=update_data.get("options", db_question.options),
            min_value=update_data.get("min_value", db_question.min_value),
            max_value=update_data.get("max_value", db_question.max_value),
            min_length=update_data.get("min_length", db_question.min_length),
            max_length=update_data.get("max_length", db_question.max_length),
            allowed_file_types=update_data.get("allowed_file_types", db_question.allowed_file_types),
            max_file_size=update_data.get("max_file_size", db_question.max_file_size)
        )
        _validate_question_type_fields(temp_question)
    
    # Apply updates
    for field, value in update_data.items():
        setattr(db_question, field, value)
    
    db.commit()
    db.refresh(db_question)
    
    question_data = {
        "id": str(db_question.id),
        "question_set_id": str(db_question.question_set_id),
        "key": db_question.key,
        "label": db_question.label,
        "description": db_question.description,
        "question_type": db_question.question_type,
        "is_required": db_question.is_required,
        "is_active": db_question.is_active,
        "sort_order": db_question.sort_order,
        "options": db_question.options,
        "min_value": db_question.min_value,
        "max_value": db_question.max_value,
        "min_length": db_question.min_length,
        "max_length": db_question.max_length,
        "conditional_rules": db_question.conditional_rules,
        "allowed_file_types": db_question.allowed_file_types,
        "max_file_size": db_question.max_file_size,
        "created_at": db_question.created_at,
        "updated_at": db_question.updated_at
    }
    return QuestionResponse(**question_data)


@router.delete("/{question_id}")
async def delete_question(question_id: str, db: Session = Depends(get_db)):
    """Delete a question (soft delete by setting is_active=False)"""
    db_question = db.query(Question).filter(Question.id == question_id).first()
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    db_question.is_active = False
    db.commit()
    
    return {"message": "Question deleted successfully"}


@router.get("/question-set/{question_set_id}", response_model=List[QuestionResponse])
async def get_questions_by_question_set(question_set_id: str, db: Session = Depends(get_db)):
    """Get all questions for a specific question set"""
    # Verify question set exists
    question_set = db.query(QuestionSet).filter(QuestionSet.id == question_set_id).first()
    if not question_set:
        raise HTTPException(status_code=404, detail="Question set not found")
    
    questions = db.query(Question).filter(
        Question.question_set_id == question_set_id,
        Question.is_active == True
    ).order_by(Question.sort_order, Question.label).all()
    
    result = []
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
        result.append(QuestionResponse(**question_data))
    
    return result


def _validate_question_type_fields(question: QuestionCreate):
    """Validate question type specific fields"""
    if question.question_type in [QuestionType.SELECT, QuestionType.MULTI_SELECT]:
        if not question.options:
            raise HTTPException(status_code=400, detail="Options are required for select and multi_select question types")
        if not isinstance(question.options, dict) or not question.options.get("choices"):
            raise HTTPException(status_code=400, detail="Options must contain a 'choices' array")
    
    elif question.question_type == QuestionType.NUMBER:
        if question.min_value is not None and question.max_value is not None:
            if question.min_value >= question.max_value:
                raise HTTPException(status_code=400, detail="min_value must be less than max_value")
    
    elif question.question_type == QuestionType.TEXT:
        if question.min_length is not None and question.max_length is not None:
            if question.min_length >= question.max_length:
                raise HTTPException(status_code=400, detail="min_length must be less than max_length")
    
    elif question.question_type == QuestionType.FILE:
        if question.max_file_size is not None and question.max_file_size <= 0:
            raise HTTPException(status_code=400, detail="max_file_size must be greater than 0")

