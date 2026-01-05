from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from app.db.session import get_db
from app.models.city import City
from app.schemas.city import CityCreate, CityUpdate, CityResponse

router = APIRouter()


@router.post("/", response_model=CityResponse, status_code=status.HTTP_201_CREATED)
def create_city(city: CityCreate, db: Session = Depends(get_db)):
    """Create a new city"""
    db_city = City(**city.model_dump())
    try:
        db.add(db_city)
        db.commit()
        db.refresh(db_city)
        return db_city
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="City with this slug already exists"
        )


@router.get("/", response_model=List[CityResponse])
def read_cities(
    skip: int = 0,
    limit: int = 100,
    country_code: str = None,
    is_major_market: bool = None,
    db: Session = Depends(get_db)
):
    """Retrieve all cities with optional filters"""
    query = db.query(City)
    
    if country_code:
        query = query.filter(City.country_code == country_code)
    
    if is_major_market is not None:
        query = query.filter(City.is_major_market == is_major_market)
    
    cities = query.order_by(City.sort_order).offset(skip).limit(limit).all()
    return cities


@router.get("/{city_id}", response_model=CityResponse)
def read_city(city_id: str, db: Session = Depends(get_db)):
    """Retrieve a specific city by ID"""
    city = db.query(City).filter(City.id == city_id).first()
    if city is None:
        raise HTTPException(status_code=404, detail="City not found")
    return city


@router.get("/slug/{slug}", response_model=CityResponse)
def read_city_by_slug(slug: str, db: Session = Depends(get_db)):
    """Retrieve a specific city by slug"""
    city = db.query(City).filter(City.slug == slug).first()
    if city is None:
        raise HTTPException(status_code=404, detail="City not found")
    return city


@router.put("/{city_id}", response_model=CityResponse)
def update_city(city_id: str, city_update: CityUpdate, db: Session = Depends(get_db)):
    """Update a city"""
    db_city = db.query(City).filter(City.id == city_id).first()
    if db_city is None:
        raise HTTPException(status_code=404, detail="City not found")
    
    update_data = city_update.model_dump(exclude_unset=True)
    
    # Check slug uniqueness if slug is being updated
    if "slug" in update_data and update_data["slug"] != db_city.slug:
        existing_city = db.query(City).filter(City.slug == update_data["slug"]).first()
        if existing_city:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="City with this slug already exists"
            )
    
    for field, value in update_data.items():
        setattr(db_city, field, value)
    
    db.commit()
    db.refresh(db_city)
    return db_city


@router.delete("/{city_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_city(city_id: str, db: Session = Depends(get_db)):
    """Delete a city"""
    db_city = db.query(City).filter(City.id == city_id).first()
    if db_city is None:
        raise HTTPException(status_code=404, detail="City not found")
    
    db.delete(db_city)
    db.commit()
    return None
