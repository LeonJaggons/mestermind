from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from app.db.session import get_db
from app.models.user import User
from app.models.customer_profile import CustomerProfile
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.schemas.customer_profile import CustomerProfileCreate, CustomerProfileUpdate, CustomerProfileResponse

router = APIRouter()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    db_user = User(**user.model_dump())
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )


@router.get("/", response_model=List[UserResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Retrieve all users with pagination"""
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
def read_user(user_id: int, db: Session = Depends(get_db)):
    """Retrieve a specific user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/email/{email}", response_model=UserResponse)
def read_user_by_email(email: str, db: Session = Depends(get_db)):
    """Retrieve a specific user by email"""
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/firebase/{firebase_uid}", response_model=UserResponse)
def read_user_by_firebase_uid(firebase_uid: str, db: Session = Depends(get_db)):
    """Retrieve a specific user by Firebase UID"""
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    """Update an existing user"""
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.model_dump(exclude_unset=True)
    
    # Check email uniqueness if email is being updated
    if "email" in update_data and update_data["email"] != db_user.email:
        existing_user = db.query(User).filter(User.email == update_data["email"]).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete a user"""
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return None


# Customer Profile Endpoints

@router.post("/{user_id}/profile", response_model=CustomerProfileResponse, status_code=status.HTTP_201_CREATED)
def create_customer_profile(user_id: int, profile: CustomerProfileCreate, db: Session = Depends(get_db)):
    """Create a customer profile for a user"""
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if profile already exists
    existing_profile = db.query(CustomerProfile).filter(CustomerProfile.user_id == user_id).first()
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer profile already exists for this user"
        )
    
    # Override user_id from URL
    profile_data = profile.model_dump()
    profile_data["user_id"] = user_id
    
    db_profile = CustomerProfile(**profile_data)
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile


@router.get("/{user_id}/profile", response_model=CustomerProfileResponse)
def get_customer_profile(user_id: int, db: Session = Depends(get_db)):
    """Get customer profile for a user"""
    profile = db.query(CustomerProfile).filter(CustomerProfile.user_id == user_id).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Customer profile not found")
    return profile


@router.put("/{user_id}/profile", response_model=CustomerProfileResponse)
def update_customer_profile(user_id: int, profile_update: CustomerProfileUpdate, db: Session = Depends(get_db)):
    """Update customer profile for a user"""
    db_profile = db.query(CustomerProfile).filter(CustomerProfile.user_id == user_id).first()
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Customer profile not found")
    
    update_data = profile_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_profile, field, value)
    
    db.commit()
    db.refresh(db_profile)
    return db_profile


@router.delete("/{user_id}/profile", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer_profile(user_id: int, db: Session = Depends(get_db)):
    """Delete customer profile for a user"""
    db_profile = db.query(CustomerProfile).filter(CustomerProfile.user_id == user_id).first()
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Customer profile not found")
    
    db.delete(db_profile)
    db.commit()
    return None
