"""
Service routes for Mestermind API
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models import (
    Service,
    Category,
    Subcategory,
    ServiceCreate,
    ServiceUpdate,
    ServiceResponse,
    ServiceListResponse,
    ServiceExploreResponse
)

router = APIRouter(prefix="/services", tags=["services"])


@router.get("/", response_model=List[ServiceListResponse])
async def get_services(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of services to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of services to return"),
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    subcategory_id: Optional[str] = Query(None, description="Filter by subcategory ID"),
    requires_license: Optional[bool] = Query(None, description="Filter by license requirement"),
    is_specialty: Optional[bool] = Query(None, description="Filter by specialty status"),
    indoor_outdoor: Optional[str] = Query(None, description="Filter by indoor/outdoor type"),
    is_active: bool = Query(True, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search in service names")
):
    """Get all services with optional filtering and pagination"""
    query = db.query(Service)
    
    # Apply filters
    if category_id:
        query = query.filter(Service.category_id == category_id)
    if subcategory_id:
        query = query.filter(Service.subcategory_id == subcategory_id)
    if requires_license is not None:
        query = query.filter(Service.requires_license == requires_license)
    if is_specialty is not None:
        query = query.filter(Service.is_specialty == is_specialty)
    if indoor_outdoor:
        query = query.filter(Service.indoor_outdoor == indoor_outdoor)
    if is_active is not None:
        query = query.filter(Service.is_active == is_active)
    if search:
        query = query.filter(Service.name.ilike(f"%{search}%"))
    
    # Apply pagination and ordering
    services = query.order_by(Service.sort_order, Service.name).offset(skip).limit(limit).all()
    
    result = []
    for service in services:
        service_data = {
            "id": str(service.id),
            "category_id": str(service.category_id),
            "subcategory_id": str(service.subcategory_id),
            "name": service.name,  # type: ignore
            "description": service.description,  # type: ignore
            "requires_license": service.requires_license,  # type: ignore
            "is_specialty": service.is_specialty,  # type: ignore
            "indoor_outdoor": service.indoor_outdoor,  # type: ignore
            "is_active": service.is_active,  # type: ignore
            "sort_order": service.sort_order,  # type: ignore
            "created_at": service.created_at,  # type: ignore
            "updated_at": service.updated_at  # type: ignore
        }
        result.append(ServiceListResponse(**service_data))  # type: ignore
    
    return result


@router.get("/explore", response_model=List[ServiceExploreResponse])
async def get_explore_services(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of services to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of services to return"),
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    subcategory_id: Optional[str] = Query(None, description="Filter by subcategory ID"),
    requires_license: Optional[bool] = Query(None, description="Filter by license requirement"),
    is_specialty: Optional[bool] = Query(None, description="Filter by specialty status"),
    indoor_outdoor: Optional[str] = Query(None, description="Filter by indoor/outdoor type"),
    is_active: bool = Query(True, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search in service names")
):
    """Get services with category and subcategory information for exploration"""
    # Join with Category and Subcategory tables to get names
    query = db.query(Service, Category, Subcategory).join(
        Category, Service.category_id == Category.id
    ).join(
        Subcategory, Service.subcategory_id == Subcategory.id
    )
    
    # Apply filters
    if category_id:
        query = query.filter(Service.category_id == category_id)
    if subcategory_id:
        query = query.filter(Service.subcategory_id == subcategory_id)
    if requires_license is not None:
        query = query.filter(Service.requires_license == requires_license)
    if is_specialty is not None:
        query = query.filter(Service.is_specialty == is_specialty)
    if indoor_outdoor:
        query = query.filter(Service.indoor_outdoor == indoor_outdoor)
    if is_active is not None:
        query = query.filter(Service.is_active == is_active)
    if search:
        query = query.filter(Service.name.ilike(f"%{search}%"))
    
    # Apply pagination and ordering
    results = query.order_by(Service.sort_order, Service.name).offset(skip).limit(limit).all()
    
    explore_services = []
    for service, category, subcategory in results:
        service_data = {
            "id": str(service.id),
            "category_id": str(service.category_id),
            "subcategory_id": str(service.subcategory_id),
            "category_name": category.name,  # type: ignore
            "subcategory_name": subcategory.name,  # type: ignore
            "name": service.name,  # type: ignore
            "description": service.description,  # type: ignore
            "requires_license": service.requires_license,  # type: ignore
            "is_specialty": service.is_specialty,  # type: ignore
            "indoor_outdoor": service.indoor_outdoor,  # type: ignore
            "is_active": service.is_active,  # type: ignore
            "sort_order": service.sort_order,  # type: ignore
            "created_at": service.created_at,  # type: ignore
            "updated_at": service.updated_at  # type: ignore
        }
        explore_services.append(ServiceExploreResponse(**service_data))  # type: ignore
    
    return explore_services


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(service_id: str, db: Session = Depends(get_db)):
    """Get a specific service by ID"""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    service_data = {
        "id": str(service.id),
        "category_id": str(service.category_id),
        "subcategory_id": str(service.subcategory_id),
        "name": service.name,  # type: ignore
        "description": service.description,  # type: ignore
        "requires_license": service.requires_license,  # type: ignore
        "is_specialty": service.is_specialty,  # type: ignore
        "indoor_outdoor": service.indoor_outdoor,  # type: ignore
        "is_active": service.is_active,  # type: ignore
        "sort_order": service.sort_order,  # type: ignore
        "created_at": service.created_at,  # type: ignore
        "updated_at": service.updated_at  # type: ignore
    }
    return ServiceResponse(**service_data)  # type: ignore


@router.post("/", response_model=ServiceResponse)
async def create_service(service: ServiceCreate, db: Session = Depends(get_db)):
    """Create a new service"""
    # Verify category exists
    category = db.query(Category).filter(Category.id == service.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Verify subcategory exists and belongs to the category
    subcategory = db.query(Subcategory).filter(
        Subcategory.id == service.subcategory_id,
        Subcategory.category_id == service.category_id
    ).first()
    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found or doesn't belong to the specified category")
    
    # Check if service name already exists in the same category/subcategory
    existing_service = db.query(Service).filter(
        Service.name == service.name,
        Service.category_id == service.category_id,
        Service.subcategory_id == service.subcategory_id
    ).first()
    if existing_service:
        raise HTTPException(status_code=400, detail="Service with this name already exists in the same category and subcategory")
    
    db_service = Service(
        category_id=service.category_id,
        subcategory_id=service.subcategory_id,
        name=service.name,
        description=service.description,
        requires_license=service.requires_license,
        is_specialty=service.is_specialty,
        indoor_outdoor=service.indoor_outdoor,
        is_active=service.is_active,
        sort_order=service.sort_order
    )
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    
    service_data = {
        "id": str(db_service.id),
        "category_id": str(db_service.category_id),
        "subcategory_id": str(db_service.subcategory_id),
        "name": db_service.name,  # type: ignore
        "description": db_service.description,  # type: ignore
        "requires_license": db_service.requires_license,  # type: ignore
        "is_specialty": db_service.is_specialty,  # type: ignore
        "indoor_outdoor": db_service.indoor_outdoor,  # type: ignore
        "is_active": db_service.is_active,  # type: ignore
        "sort_order": db_service.sort_order,  # type: ignore
        "created_at": db_service.created_at,  # type: ignore
        "updated_at": db_service.updated_at  # type: ignore
    }
    return ServiceResponse(**service_data)  # type: ignore


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(service_id: str, service_update: ServiceUpdate, db: Session = Depends(get_db)):
    """Update a service"""
    db_service = db.query(Service).filter(Service.id == service_id).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # If updating category_id or subcategory_id, verify they exist and are valid
    update_data = service_update.dict(exclude_unset=True)
    
    if "category_id" in update_data:
        category = db.query(Category).filter(Category.id == update_data["category_id"]).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
    
    if "subcategory_id" in update_data:
        subcategory = db.query(Subcategory).filter(Subcategory.id == update_data["subcategory_id"]).first()
        if not subcategory:
            raise HTTPException(status_code=404, detail="Subcategory not found")
    
    # If both category_id and subcategory_id are being updated, verify they match
    if "category_id" in update_data and "subcategory_id" in update_data:
        subcategory = db.query(Subcategory).filter(
            Subcategory.id == update_data["subcategory_id"],
            Subcategory.category_id == update_data["category_id"]
        ).first()
        if not subcategory:
            raise HTTPException(status_code=400, detail="Subcategory doesn't belong to the specified category")
    
    # Check for duplicate service name if name is being updated
    if "name" in update_data:
        category_id = update_data.get("category_id", db_service.category_id)
        subcategory_id = update_data.get("subcategory_id", db_service.subcategory_id)
        
        existing_service = db.query(Service).filter(
            Service.name == update_data["name"],
            Service.category_id == category_id,
            Service.subcategory_id == subcategory_id,
            Service.id != service_id
        ).first()
        if existing_service:
            raise HTTPException(status_code=400, detail="Service with this name already exists in the same category and subcategory")
    
    # Apply updates
    for field, value in update_data.items():
        setattr(db_service, field, value)
    
    db.commit()
    db.refresh(db_service)
    
    service_data = {
        "id": str(db_service.id),
        "category_id": str(db_service.category_id),
        "subcategory_id": str(db_service.subcategory_id),
        "name": db_service.name,  # type: ignore
        "description": db_service.description,  # type: ignore
        "requires_license": db_service.requires_license,  # type: ignore
        "is_specialty": db_service.is_specialty,  # type: ignore
        "indoor_outdoor": db_service.indoor_outdoor,  # type: ignore
        "is_active": db_service.is_active,  # type: ignore
        "sort_order": db_service.sort_order,  # type: ignore
        "created_at": db_service.created_at,  # type: ignore
        "updated_at": db_service.updated_at  # type: ignore
    }
    return ServiceResponse(**service_data)  # type: ignore


@router.delete("/{service_id}")
async def delete_service(service_id: str, db: Session = Depends(get_db)):
    """Delete a service (soft delete by setting is_active=False)"""
    db_service = db.query(Service).filter(Service.id == service_id).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    db_service.is_active = False
    db.commit()
    
    return {"message": "Service deleted successfully"}


@router.get("/category/{category_id}", response_model=List[ServiceListResponse])
async def get_services_by_category(category_id: str, db: Session = Depends(get_db)):
    """Get all services for a specific category"""
    # Verify category exists
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    services = db.query(Service).filter(
        Service.category_id == category_id,
        Service.is_active == True
    ).order_by(Service.sort_order, Service.name).all()
    
    result = []
    for service in services:
        service_data = {
            "id": str(service.id),
            "category_id": str(service.category_id),
            "subcategory_id": str(service.subcategory_id),
            "name": service.name,  # type: ignore
            "description": service.description,  # type: ignore
            "requires_license": service.requires_license,  # type: ignore
            "is_specialty": service.is_specialty,  # type: ignore
            "indoor_outdoor": service.indoor_outdoor,  # type: ignore
            "is_active": service.is_active,  # type: ignore
            "sort_order": service.sort_order,  # type: ignore
            "created_at": service.created_at,  # type: ignore
            "updated_at": service.updated_at  # type: ignore
        }
        result.append(ServiceListResponse(**service_data))  # type: ignore
    
    return result


@router.get("/subcategory/{subcategory_id}", response_model=List[ServiceListResponse])
async def get_services_by_subcategory(subcategory_id: str, db: Session = Depends(get_db)):
    """Get all services for a specific subcategory"""
    # Verify subcategory exists
    subcategory = db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()
    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    
    services = db.query(Service).filter(
        Service.subcategory_id == subcategory_id,
        Service.is_active == True
    ).order_by(Service.sort_order, Service.name).all()
    
    result = []
    for service in services:
        service_data = {
            "id": str(service.id),
            "category_id": str(service.category_id),
            "subcategory_id": str(service.subcategory_id),
            "name": service.name,  # type: ignore
            "description": service.description,  # type: ignore
            "requires_license": service.requires_license,  # type: ignore
            "is_specialty": service.is_specialty,  # type: ignore
            "indoor_outdoor": service.indoor_outdoor,  # type: ignore
            "is_active": service.is_active,  # type: ignore
            "sort_order": service.sort_order,  # type: ignore
            "created_at": service.created_at,  # type: ignore
            "updated_at": service.updated_at  # type: ignore
        }
        result.append(ServiceListResponse(**service_data))  # type: ignore
    
    return result


@router.get("/search/{query}", response_model=List[ServiceListResponse])
async def search_services(query: str, db: Session = Depends(get_db)):
    """Search services by name"""
    services = db.query(Service).filter(
        Service.name.ilike(f"%{query}%"),
        Service.is_active == True
    ).order_by(Service.sort_order, Service.name).all()
    
    result = []
    for service in services:
        service_data = {
            "id": str(service.id),
            "category_id": str(service.category_id),
            "subcategory_id": str(service.subcategory_id),
            "name": service.name,  # type: ignore
            "description": service.description,  # type: ignore
            "requires_license": service.requires_license,  # type: ignore
            "is_specialty": service.is_specialty,  # type: ignore
            "indoor_outdoor": service.indoor_outdoor,  # type: ignore
            "is_active": service.is_active,  # type: ignore
            "sort_order": service.sort_order,  # type: ignore
            "created_at": service.created_at,  # type: ignore
            "updated_at": service.updated_at  # type: ignore
        }
        result.append(ServiceListResponse(**service_data))  # type: ignore
    
    return result