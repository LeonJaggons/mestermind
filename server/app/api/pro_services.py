from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.pro_service import ProService
from app.models.pro_profile import ProProfile
from app.models.service import Service
from app.models.user import User
from app.schemas.pro_service import ProServiceCreate, ProServiceResponse, ServiceInfo, CategoryInfo

router = APIRouter()


def get_translated_name(obj, language: str = "en") -> str:
    """Get translated name based on language, fallback to English"""
    if language == "hu" and hasattr(obj, "name_hu") and obj.name_hu:
        return obj.name_hu
    return obj.name


@router.post("/", response_model=ProServiceResponse)
def create_pro_service(pro_service: ProServiceCreate, db: Session = Depends(get_db)):
    """Create a new pro service relationship"""
    # Verify pro_profile exists
    db_profile = db.query(ProProfile).filter(ProProfile.id == pro_service.pro_profile_id).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    
    # Verify service exists
    db_service = db.query(Service).filter(Service.id == pro_service.service_id).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Check if relationship already exists
    existing = db.query(ProService).filter(
        ProService.pro_profile_id == pro_service.pro_profile_id,
        ProService.service_id == pro_service.service_id
    ).first()
    
    if existing:
        return existing
    
    db_pro_service = ProService(**pro_service.model_dump())
    db.add(db_pro_service)
    db.commit()
    db.refresh(db_pro_service)
    return db_pro_service


@router.get("/pro-profile/{pro_profile_id}", response_model=List[ProServiceResponse])
def get_pro_services_by_profile(
    pro_profile_id: int, 
    language: str = Query("en", description="Language code (en, hu)"),
    db: Session = Depends(get_db)
):
    """Get all services for a pro profile"""
    db_profile = db.query(ProProfile).filter(ProProfile.id == pro_profile_id).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    
    from sqlalchemy.orm import joinedload
    pro_services = db.query(ProService).options(
        joinedload(ProService.service).joinedload(Service.category)
    ).filter(ProService.pro_profile_id == pro_profile_id).all()
    
    # Return with translated service names using Pydantic models
    result = []
    for ps in pro_services:
        # Create CategoryInfo with translated name
        category_info = CategoryInfo(
            id=ps.service.category.id,
            name=get_translated_name(ps.service.category, language)
        )
        
        # Create ServiceInfo with translated name
        service_info = ServiceInfo(
            id=ps.service.id,
            name=get_translated_name(ps.service, language),
            category_id=ps.service.category_id,
            category=category_info
        )
        
        # Create ProServiceResponse
        pro_service_response = ProServiceResponse(
            id=ps.id,
            pro_profile_id=ps.pro_profile_id,
            service_id=ps.service_id,
            created_at=ps.created_at,
            service=service_info
        )
        
        result.append(pro_service_response)
    
    return result


@router.post("/pro-profile/{pro_profile_id}/bulk", response_model=List[ProServiceResponse])
def bulk_create_pro_services(pro_profile_id: int, service_ids: List[str], db: Session = Depends(get_db)):
    """Create multiple pro service relationships at once"""
    # Verify pro_profile exists
    db_profile = db.query(ProProfile).filter(ProProfile.id == pro_profile_id).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    
    # Delete existing relationships
    db.query(ProService).filter(ProService.pro_profile_id == pro_profile_id).delete()
    
    # Create new relationships
    pro_services = []
    for service_id in service_ids:
        # Verify service exists
        db_service = db.query(Service).filter(Service.id == service_id).first()
        if not db_service:
            raise HTTPException(status_code=404, detail=f"Service with id {service_id} not found")
        
        db_pro_service = ProService(pro_profile_id=pro_profile_id, service_id=service_id)
        db.add(db_pro_service)
        pro_services.append(db_pro_service)
    
    db.commit()
    for ps in pro_services:
        db.refresh(ps)
    
    return pro_services


@router.post("/user/{user_identifier}/bulk", response_model=List[ProServiceResponse])
def bulk_create_pro_services_by_user(user_identifier: str, service_ids: List[str], db: Session = Depends(get_db)):
    """Create multiple pro service relationships by user ID or Firebase UID"""
    # Find user by ID or Firebase UID
    user = None
    try:
        user_id = int(user_identifier)
        user = db.query(User).filter(User.id == user_id).first()
    except ValueError:
        user = db.query(User).filter(User.firebase_uid == user_identifier).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Find or create pro_profile
    db_profile = db.query(ProProfile).filter(ProProfile.user_id == user.id).first()
    if not db_profile:
        db_profile = ProProfile(user_id=user.id)
        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)
    
    # Delete existing relationships
    db.query(ProService).filter(ProService.pro_profile_id == db_profile.id).delete()
    
    # Create new relationships
    pro_services = []
    for service_id in service_ids:
        # Verify service exists
        db_service = db.query(Service).filter(Service.id == service_id).first()
        if not db_service:
            raise HTTPException(status_code=404, detail=f"Service with id {service_id} not found")
        
        db_pro_service = ProService(pro_profile_id=db_profile.id, service_id=service_id)
        db.add(db_pro_service)
        pro_services.append(db_pro_service)
    
    db.commit()
    for ps in pro_services:
        db.refresh(ps)
    
    return pro_services


@router.delete("/{pro_service_id}")
def delete_pro_service(pro_service_id: int, db: Session = Depends(get_db)):
    """Delete a pro service relationship"""
    db_pro_service = db.query(ProService).filter(ProService.id == pro_service_id).first()
    if not db_pro_service:
        raise HTTPException(status_code=404, detail="Pro service not found")
    
    db.delete(db_pro_service)
    db.commit()
    return {"message": "Pro service deleted successfully"}
