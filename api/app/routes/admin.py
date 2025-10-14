"""
Admin routes for managing users, requests, and system data
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from typing import Optional, List
from datetime import datetime
import uuid as _uuid

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.database import (
    User, 
    Request, 
    Mester, 
    MessageThread, 
    Service,
    Category
)
from app.models.schemas import UserResponse
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["admin"])


# Admin schemas
class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    firebase_uid: Optional[str] = None


class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    per_page: int


class UserStatsResponse(BaseModel):
    total_users: int
    active_users: int
    users_with_requests: int
    users_with_messages: int


class RequestStatsResponse(BaseModel):
    total_requests: int
    open_requests: int
    completed_requests: int
    cancelled_requests: int


class OverviewStatsResponse(BaseModel):
    total_users: int
    total_requests: int
    total_mesters: int
    total_categories: int
    total_services: int


# Stats endpoints

@router.get("/stats/users", response_model=UserStatsResponse)
async def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user statistics"""
    total_users = db.query(User).count()
    
    # For now, consider all users as active
    active_users = total_users
    
    # Count users with requests
    users_with_requests = db.query(User).join(Request, User.id == Request.user_id).distinct().count()
    
    # Count users with messages
    users_with_messages = db.query(User).join(MessageThread, User.id == MessageThread.customer_user_id).distinct().count()
    
    return UserStatsResponse(
        total_users=total_users,
        active_users=active_users,
        users_with_requests=users_with_requests,
        users_with_messages=users_with_messages
    )


@router.get("/stats/requests", response_model=RequestStatsResponse)
async def get_request_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get request statistics"""
    total_requests = db.query(Request).count()
    open_requests = db.query(Request).filter(Request.status == "open").count()
    completed_requests = db.query(Request).filter(Request.status == "completed").count()
    cancelled_requests = db.query(Request).filter(Request.status == "cancelled").count()
    
    return RequestStatsResponse(
        total_requests=total_requests,
        open_requests=open_requests,
        completed_requests=completed_requests,
        cancelled_requests=cancelled_requests
    )


@router.get("/stats/overview", response_model=OverviewStatsResponse)
async def get_overview_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get overview statistics"""
    total_users = db.query(User).count()
    total_requests = db.query(Request).count()
    total_mesters = db.query(Mester).count()
    total_categories = db.query(Category).count()
    total_services = db.query(Service).count()
    
    return OverviewStatsResponse(
        total_users=total_users,
        total_requests=total_requests,
        total_mesters=total_mesters,
        total_categories=total_categories,
        total_services=total_services
    )


# User Management Endpoints

@router.get("/users", response_model=UserListResponse)
async def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
):
    """List all users with pagination and search"""
    
    query = db.query(User)
    
    # Apply search filter
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            func.lower(User.first_name).like(search_term) |
            func.lower(User.last_name).like(search_term) |
            func.lower(User.email).like(search_term)
        )
    
    # Apply sorting
    sort_column = getattr(User, sort_by, User.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    users = query.offset(offset).limit(per_page).all()
    
    # Convert User objects to UserResponse
    user_responses = [UserResponse.model_validate(user) for user in users]
    
    return UserListResponse(
        users=user_responses,
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific user by ID"""
    try:
        user_uuid = _uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a user's information"""
    
    try:
        user_uuid = _uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields if provided
    if payload.first_name is not None:
        user.first_name = payload.first_name.strip()
    if payload.last_name is not None:
        user.last_name = payload.last_name.strip()
    if payload.email is not None:
        # Check if email is already taken by another user
        existing = db.query(User).filter(
            User.email == payload.email.strip().lower(),
            User.id != user_uuid
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email already taken")
        user.email = payload.email.strip().lower()
    if payload.firebase_uid is not None:
        user.firebase_uid = payload.firebase_uid.strip() if payload.firebase_uid else None
    
    user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a user"""
    try:
        user_uuid = _uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}