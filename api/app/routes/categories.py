"""
Category and subcategory routes
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models import (
    Category,
    Subcategory,
    Service,
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoryListResponse,
    SubcategoryCreate,
    SubcategoryUpdate,
    SubcategoryResponse
)

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/", response_model=List[CategoryListResponse])
async def get_categories(db: Session = Depends(get_db)):
    """Get all categories with subcategory count"""
    categories = db.query(Category).filter(Category.is_active == True).order_by(Category.sort_order, Category.name).all()
    
    result = []
    for category in categories:
        subcategory_count = db.query(Subcategory).filter(
            Subcategory.category_id == category.id,
            Subcategory.is_active == True
        ).count()
        
        result.append(CategoryListResponse(
            id=str(category.id),
            name=category.name,  # type: ignore
            description=category.description,  # type: ignore
            icon=category.icon,  # type: ignore
            is_active=category.is_active,  # type: ignore
            sort_order=category.sort_order,  # type: ignore
            created_at=category.created_at,  # type: ignore
            updated_at=category.updated_at,  # type: ignore
            subcategory_count=subcategory_count
        ))
    
    return result


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: str, db: Session = Depends(get_db)):
    """Get a specific category with its subcategories"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    subcategories = db.query(Subcategory).filter(
        Subcategory.category_id == category.id,
        Subcategory.is_active == True
    ).order_by(Subcategory.sort_order, Subcategory.name).all()
    
    return CategoryResponse(
        id=str(category.id),
        name=category.name,  # type: ignore
        description=category.description,  # type: ignore
        icon=category.icon,  # type: ignore
        is_active=category.is_active,  # type: ignore
        sort_order=category.sort_order,  # type: ignore
        created_at=category.created_at,  # type: ignore
        updated_at=category.updated_at,  # type: ignore
        subcategories=[
            SubcategoryResponse(
                id=str(sub.id),
                category_id=str(sub.category_id),
                name=sub.name,  # type: ignore
                description=sub.description,  # type: ignore
                icon=sub.icon,  # type: ignore
                is_active=sub.is_active,  # type: ignore
                sort_order=sub.sort_order,  # type: ignore
                created_at=sub.created_at,  # type: ignore
                updated_at=sub.updated_at  # type: ignore
            )
            for sub in subcategories
        ]
    )


@router.post("/", response_model=CategoryResponse)
async def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    """Create a new category"""
    db_category = Category(
        name=category.name,
        description=category.description,
        icon=category.icon,
        is_active=category.is_active,
        sort_order=category.sort_order
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    return CategoryResponse(
        id=str(db_category.id),
        name=db_category.name,  # type: ignore
        description=db_category.description,  # type: ignore
        icon=db_category.icon,  # type: ignore
        is_active=db_category.is_active,  # type: ignore
        sort_order=db_category.sort_order,  # type: ignore
        created_at=db_category.created_at,  # type: ignore
        updated_at=db_category.updated_at,  # type: ignore
        subcategories=[]
    )


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: str, category_update: CategoryUpdate, db: Session = Depends(get_db)):
    """Update a category"""
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = category_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_category, field, value)
    
    db.commit()
    db.refresh(db_category)
    
    # Get subcategories
    subcategories = db.query(Subcategory).filter(
        Subcategory.category_id == db_category.id,
        Subcategory.is_active == True
    ).order_by(Subcategory.sort_order, Subcategory.name).all()
    
    return CategoryResponse(
        id=str(db_category.id),
        name=db_category.name,  # type: ignore
        description=db_category.description,  # type: ignore
        icon=db_category.icon,  # type: ignore
        is_active=db_category.is_active,  # type: ignore
        sort_order=db_category.sort_order,  # type: ignore
        created_at=db_category.created_at,  # type: ignore
        updated_at=db_category.updated_at,  # type: ignore
        subcategories=[
            SubcategoryResponse(
                id=str(sub.id),
                category_id=str(sub.category_id),
                name=sub.name,  # type: ignore
                description=sub.description,  # type: ignore
                icon=sub.icon,  # type: ignore
                is_active=sub.is_active,  # type: ignore
                sort_order=sub.sort_order,  # type: ignore
                created_at=sub.created_at,  # type: ignore
                updated_at=sub.updated_at  # type: ignore
            )
            for sub in subcategories
        ]
    )


@router.delete("/{category_id}")
async def delete_category(category_id: str, db: Session = Depends(get_db)):
    """Delete a category (soft delete by setting is_active=False) and cascade to subcategories and services"""
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Soft delete the category
    db_category.is_active = False
    
    # Cascade: Soft delete all subcategories
    subcategories = db.query(Subcategory).filter(Subcategory.category_id == category_id).all()
    for subcategory in subcategories:
        subcategory.is_active = False
    
    # Cascade: Soft delete all services in this category
    services = db.query(Service).filter(Service.category_id == category_id).all()
    for service in services:
        service.is_active = False
    
    db.commit()
    
    return {"message": "Category and all associated subcategories and services deleted successfully"}


# Subcategory routes
@router.post("/{category_id}/subcategories", response_model=SubcategoryResponse)
async def create_subcategory(category_id: str, subcategory: SubcategoryCreate, db: Session = Depends(get_db)):
    """Create a new subcategory"""
    # Verify category exists
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db_subcategory = Subcategory(
        category_id=category_id,
        name=subcategory.name,
        description=subcategory.description,
        icon=subcategory.icon,
        is_active=subcategory.is_active,
        sort_order=subcategory.sort_order
    )
    db.add(db_subcategory)
    db.commit()
    db.refresh(db_subcategory)
    
    return SubcategoryResponse(
        id=str(db_subcategory.id),
        category_id=str(db_subcategory.category_id),
        name=db_subcategory.name,
        description=db_subcategory.description,
        icon=db_subcategory.icon,
        is_active=db_subcategory.is_active,
        sort_order=db_subcategory.sort_order,
        created_at=db_subcategory.created_at,
        updated_at=db_subcategory.updated_at
    )


@router.put("/subcategories/{subcategory_id}", response_model=SubcategoryResponse)
async def update_subcategory(subcategory_id: str, subcategory_update: SubcategoryUpdate, db: Session = Depends(get_db)):
    """Update a subcategory"""
    db_subcategory = db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()
    if not db_subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    
    update_data = subcategory_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_subcategory, field, value)
    db.commit()
    db.refresh(db_subcategory)
    
    return SubcategoryResponse(
        id=str(db_subcategory.id),
        category_id=str(db_subcategory.category_id),
        name=db_subcategory.name,
        description=db_subcategory.description,
        icon=db_subcategory.icon,
        is_active=db_subcategory.is_active,
        sort_order=db_subcategory.sort_order,
        created_at=db_subcategory.created_at,
        updated_at=db_subcategory.updated_at
    )


@router.delete("/subcategories/{subcategory_id}")
async def delete_subcategory(subcategory_id: str, db: Session = Depends(get_db)):
    """Delete a subcategory (soft delete by setting is_active=False) and cascade to services"""
    db_subcategory = db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()
    if not db_subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    
    # Soft delete the subcategory
    db_subcategory.is_active = False
    
    # Cascade: Soft delete all services in this subcategory
    services = db.query(Service).filter(Service.subcategory_id == subcategory_id).all()
    for service in services:
        service.is_active = False
    
    db.commit()
    
    return {"message": "Subcategory and all associated services deleted successfully"}
