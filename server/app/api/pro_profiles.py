from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from app.db.session import get_db
from app.models.pro_profile import ProProfile
from app.models.user import User
from app.schemas.pro_profile import ProProfileCreate, ProProfileUpdate, ProProfileResponse

router = APIRouter()


@router.get("/", response_model=List[ProProfileResponse])
def list_pro_profiles(user_id: int = None, db: Session = Depends(get_db)):
    """List pro profiles, optionally filtered by user_id"""
    query = db.query(ProProfile)
    
    if user_id is not None:
        query = query.filter(ProProfile.user_id == user_id)
    
    profiles = query.all()
    return profiles


@router.post("/", response_model=ProProfileResponse, status_code=status.HTTP_201_CREATED)
def create_pro_profile(profile: ProProfileCreate, db: Session = Depends(get_db)):
    """Create a new pro profile"""
    # Check if user exists
    user = db.query(User).filter(User.id == profile.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if profile already exists
    existing_profile = db.query(ProProfile).filter(ProProfile.user_id == profile.user_id).first()
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pro profile already exists for this user"
        )
    
    db_profile = ProProfile(**profile.model_dump())
    try:
        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)
        return db_profile
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error creating pro profile"
        )


@router.get("/{profile_id}", response_model=ProProfileResponse)
def read_pro_profile(profile_id: int, db: Session = Depends(get_db)):
    """Retrieve a specific pro profile by ID"""
    profile = db.query(ProProfile).filter(ProProfile.id == profile_id).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    return profile


@router.get("/user/{user_identifier}", response_model=ProProfileResponse)
def read_pro_profile_by_user(user_identifier: str, db: Session = Depends(get_db)):
    """Retrieve a pro profile by user ID or Firebase UID"""
    # Try to find user by integer ID first, then by Firebase UID
    user = None
    try:
        # Try parsing as integer ID
        user_id = int(user_identifier)
        user = db.query(User).filter(User.id == user_id).first()
    except ValueError:
        # If not an integer, treat as Firebase UID
        user = db.query(User).filter(User.firebase_uid == user_identifier).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    profile = db.query(ProProfile).filter(ProProfile.user_id == user.id).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    return profile


@router.patch("/{profile_id}", response_model=ProProfileResponse)
def update_pro_profile(profile_id: int, profile_update: ProProfileUpdate, db: Session = Depends(get_db)):
    """Update a pro profile"""
    db_profile = db.query(ProProfile).filter(ProProfile.id == profile_id).first()
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    
    # Update only the fields that are provided
    update_data = profile_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_profile, field, value)
    
    try:
        db.commit()
        db.refresh(db_profile)
        return db_profile
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error updating pro profile"
        )


@router.patch("/user/{user_identifier}", response_model=ProProfileResponse)
def update_pro_profile_by_user(user_identifier: str, profile_update: ProProfileUpdate, db: Session = Depends(get_db)):
    """Update a pro profile by user ID or Firebase UID (create if doesn't exist)"""
    # Try to find user by integer ID first, then by Firebase UID
    user = None
    try:
        # Try parsing as integer ID
        user_id = int(user_identifier)
        user = db.query(User).filter(User.id == user_id).first()
    except ValueError:
        # If not an integer, treat as Firebase UID
        user = db.query(User).filter(User.firebase_uid == user_identifier).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_profile = db.query(ProProfile).filter(ProProfile.user_id == user.id).first()
    
    # If profile doesn't exist, create it
    if db_profile is None:
        db_profile = ProProfile(user_id=user.id)
        db.add(db_profile)
    
    # Update only the fields that are provided
    update_data = profile_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_profile, field, value)
    
    try:
        db.commit()
        db.refresh(db_profile)
        return db_profile
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error updating pro profile"
        )


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pro_profile(profile_id: int, db: Session = Depends(get_db)):
    """Delete a pro profile"""
    db_profile = db.query(ProProfile).filter(ProProfile.id == profile_id).first()
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    
    db.delete(db_profile)
    db.commit()
    return None
