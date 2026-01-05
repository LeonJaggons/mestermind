from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Optional, List
from datetime import datetime, timedelta
from app.db.session import get_db
from app.models.profile_view import ProfileView
from app.models.pro_profile import ProProfile
from app.models.service import Service
from app.schemas.profile_view import ProfileViewCreate, ProfileViewResponse, ViewCountResponse

router = APIRouter()


@router.post("/", response_model=ProfileViewResponse, status_code=status.HTTP_201_CREATED)
def track_profile_view(
    view: ProfileViewCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Track a profile view"""
    # Verify pro profile exists
    pro_profile = db.query(ProProfile).filter(ProProfile.id == view.pro_profile_id).first()
    if not pro_profile:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    
    # Verify service exists if provided (and not empty string)
    if view.service_id and (isinstance(view.service_id, str) and view.service_id.strip()):
        service = db.query(Service).filter(Service.id == view.service_id).first()
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
    
    # Get IP address from request
    client_ip = request.client.host if request.client else None
    if not view.viewer_ip:
        view.viewer_ip = client_ip
    
    # Create view record
    db_view = ProfileView(
        pro_profile_id=view.pro_profile_id,
        service_id=view.service_id,
        viewer_ip=view.viewer_ip,
        viewer_user_id=view.viewer_user_id,
    )
    
    db.add(db_view)
    db.commit()
    db.refresh(db_view)
    
    return db_view


@router.get("/pro-profile/{pro_profile_id}/counts", response_model=ViewCountResponse)
def get_view_counts(
    pro_profile_id: int,
    db: Session = Depends(get_db)
):
    """Get view counts for a pro profile"""
    # Verify pro profile exists
    pro_profile = db.query(ProProfile).filter(ProProfile.id == pro_profile_id).first()
    if not pro_profile:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    
    # Total views
    total_views = db.query(func.count(ProfileView.id)).filter(
        ProfileView.pro_profile_id == pro_profile_id
    ).scalar() or 0
    
    # Views by service
    views_by_service_result = db.query(
        ProfileView.service_id,
        func.count(ProfileView.id).label('count')
    ).filter(
        ProfileView.pro_profile_id == pro_profile_id,
        ProfileView.service_id.isnot(None)
    ).group_by(ProfileView.service_id).all()
    
    views_by_service = {str(service_id): count for service_id, count in views_by_service_result}
    
    # Views this week
    from datetime import timezone
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    views_this_week = db.query(func.count(ProfileView.id)).filter(
        and_(
            ProfileView.pro_profile_id == pro_profile_id,
            ProfileView.viewed_at >= week_ago
        )
    ).scalar() or 0
    
    # Views this month
    month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    views_this_month = db.query(func.count(ProfileView.id)).filter(
        and_(
            ProfileView.pro_profile_id == pro_profile_id,
            ProfileView.viewed_at >= month_ago
        )
    ).scalar() or 0
    
    return ViewCountResponse(
        total_views=total_views,
        views_by_service=views_by_service,
        views_this_week=views_this_week,
        views_this_month=views_this_month
    )


@router.get("/pro-profile/{pro_profile_id}/service/{service_id}/count")
def get_service_view_count(
    pro_profile_id: int,
    service_id: str,
    db: Session = Depends(get_db)
):
    """Get view count for a specific service"""
    count = db.query(func.count(ProfileView.id)).filter(
        and_(
            ProfileView.pro_profile_id == pro_profile_id,
            ProfileView.service_id == service_id
        )
    ).scalar() or 0
    
    return {"service_id": service_id, "view_count": count}


@router.get("/pro-profile/{pro_profile_id}", response_model=List[ProfileViewResponse])
def get_profile_views(
    pro_profile_id: int,
    service_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get profile views with optional filters"""
    query = db.query(ProfileView).filter(ProfileView.pro_profile_id == pro_profile_id)
    
    if service_id:
        query = query.filter(ProfileView.service_id == service_id)
    
    views = query.order_by(ProfileView.viewed_at.desc()).offset(skip).limit(limit).all()
    return views
