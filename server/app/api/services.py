from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models.service import Service
from app.models.category import Category
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceResponse

router = APIRouter()


def get_translated_name(obj, language: str = "en") -> str:
    """Get translated name based on language, fallback to English"""
    if language == "hu" and hasattr(obj, "name_hu") and obj.name_hu:
        return obj.name_hu
    return obj.name


@router.post("/", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
def create_service(service: ServiceCreate, db: Session = Depends(get_db)):
    """Create a new service"""
    # Verify category exists
    category = db.query(Category).filter(Category.id == service.category_id).first()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db_service = Service(**service.model_dump())
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service


@router.get("/", response_model=List[ServiceResponse])
def read_services(
    skip: int = 0, 
    limit: int = 100, 
    category_id: Optional[str] = None, 
    language: str = Query("en", description="Language code (en, hu)"),
    db: Session = Depends(get_db)
):
    """Retrieve all services, optionally filtered by category"""
    query = db.query(Service)
    
    if category_id is not None:
        query = query.filter(Service.category_id == category_id)
    
    services = query.offset(skip).limit(limit).all()
    
    # Return services with name field set to translated version
    result = []
    for service in services:
        service_dict = {
            "id": service.id,
            "category_id": service.category_id,
            "name": get_translated_name(service, language),  # Use translated name in name field
            "slug": service.slug,
            "created_at": service.created_at,
            "updated_at": service.updated_at,
        }
        result.append(service_dict)
    
    return result


@router.get("/{service_id}", response_model=ServiceResponse)
def read_service(
    service_id: str, 
    language: str = Query("en", description="Language code (en, hu)"),
    db: Session = Depends(get_db)
):
    """Retrieve a specific service by ID"""
    service = db.query(Service).filter(Service.id == service_id).first()
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return {
        "id": service.id,
        "category_id": service.category_id,
        "name": get_translated_name(service, language),  # Use translated name in name field
        "slug": service.slug,
        "created_at": service.created_at,
        "updated_at": service.updated_at,
    }


@router.put("/{service_id}", response_model=ServiceResponse)
def update_service(service_id: int, service_update: ServiceUpdate, db: Session = Depends(get_db)):
    """Update a service"""
    db_service = db.query(Service).filter(Service.id == service_id).first()
    if db_service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    
    update_data = service_update.model_dump(exclude_unset=True)
    
    # Verify category exists if category_id is being updated
    if "category_id" in update_data:
        category = db.query(Category).filter(Category.id == update_data["category_id"]).first()
        if category is None:
            raise HTTPException(status_code=404, detail="Category not found")
    
    for field, value in update_data.items():
        setattr(db_service, field, value)
    
    db.commit()
    db.refresh(db_service)
    return db_service


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(service_id: int, db: Session = Depends(get_db)):
    """Delete a service"""
    db_service = db.query(Service).filter(Service.id == service_id).first()
    if db_service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    
    db.delete(db_service)
    db.commit()
    return None
