from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from app.db.session import get_db
from app.models.category import Category
from app.models.service import Service
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse, CategoryWithServices

router = APIRouter()


def get_translated_name(obj, language: str = "en") -> str:
    """Get translated name based on language, fallback to English"""
    if language == "hu" and hasattr(obj, "name_hu") and obj.name_hu:
        return obj.name_hu
    return obj.name


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    """Create a new category"""
    db_category = Category(**category.model_dump())
    try:
        db.add(db_category)
        db.commit()
        db.refresh(db_category)
        return db_category
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists"
        )


@router.get("/", response_model=List[CategoryResponse])
def read_categories(
    skip: int = 0, 
    limit: int = 100, 
    language: str = Query("en", description="Language code (en, hu)"),
    db: Session = Depends(get_db)
):
    """Retrieve all categories"""
    categories = db.query(Category).offset(skip).limit(limit).all()
    
    # Return categories with name field set to translated version
    result = []
    for category in categories:
        category_dict = {
            "id": category.id,
            "name": get_translated_name(category, language),  # Use translated name in name field
            "slug": category.slug,
            "created_at": category.created_at,
            "updated_at": category.updated_at,
        }
        result.append(category_dict)
    
    return result


@router.get("/with-services", response_model=List[CategoryWithServices])
def read_categories_with_services(
    skip: int = 0, 
    limit: int = 100, 
    language: str = Query("en", description="Language code (en, hu)"),
    db: Session = Depends(get_db)
):
    """Retrieve all categories with their services"""
    categories = db.query(Category).offset(skip).limit(limit).all()
    
    result = []
    for category in categories:
        # Get services for this category
        services = db.query(Service).filter(Service.category_id == category.id).all()
        
        services_list = []
        for service in services:
            services_list.append({
                "id": service.id,
                "name": get_translated_name(service, language),  # Use translated name in name field
                "name_hu": getattr(service, "name_hu", None),  # Always include Hungarian name for search
                "slug": service.slug,
            })
        
        category_dict = {
            "id": category.id,
            "name": get_translated_name(category, language),  # Use translated name in name field
            "name_hu": getattr(category, "name_hu", None),  # Always include Hungarian name for search
            "slug": category.slug,
            "created_at": category.created_at,
            "updated_at": category.updated_at,
            "services": services_list
        }
        result.append(category_dict)
    
    return result


@router.get("/{category_id}", response_model=CategoryResponse)
def read_category(
    category_id: str, 
    language: str = Query("en", description="Language code (en, hu)"),
    db: Session = Depends(get_db)
):
    """Retrieve a specific category by ID"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {
        "id": category.id,
        "name": get_translated_name(category, language),  # Use translated name in name field
        "slug": category.slug,
        "created_at": category.created_at,
        "updated_at": category.updated_at,
    }


@router.get("/{category_id}/with-services", response_model=CategoryWithServices)
def read_category_with_services(
    category_id: str, 
    language: str = Query("en", description="Language code (en, hu)"),
    db: Session = Depends(get_db)
):
    """Retrieve a specific category with its services"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Get services for this category
    services = db.query(Service).filter(Service.category_id == category.id).all()
    
    services_list = []
    for service in services:
        services_list.append({
            "id": service.id,
            "name": get_translated_name(service, language),  # Use translated name in name field
            "name_hu": getattr(service, "name_hu", None),  # Always include Hungarian name for search
            "slug": service.slug,
        })
    
    return {
        "id": category.id,
        "name": get_translated_name(category, language),  # Use translated name in name field
        "name_hu": getattr(category, "name_hu", None),  # Always include Hungarian name for search
        "slug": category.slug,
        "created_at": category.created_at,
        "updated_at": category.updated_at,
        "services": services_list
    }


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(category_id: int, category_update: CategoryUpdate, db: Session = Depends(get_db)):
    """Update a category"""
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = category_update.model_dump(exclude_unset=True)
    
    # Check name uniqueness if name is being updated
    if "name" in update_data and update_data["name"] != db_category.name:
        existing_category = db.query(Category).filter(Category.name == update_data["name"]).first()
        if existing_category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name already exists"
            )
    
    for field, value in update_data.items():
        setattr(db_category, field, value)
    
    db.commit()
    db.refresh(db_category)
    return db_category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    """Delete a category"""
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(db_category)
    db.commit()
    return None
