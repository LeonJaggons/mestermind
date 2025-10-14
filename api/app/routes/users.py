from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.database import User, Mester, MesterProfile
from app.models.schemas import UserCreate, UserResponse

router = APIRouter(prefix="/v1/users", tags=["users"])


@router.post("", response_model=UserResponse)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    # Check for existing email
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=409, detail="User with this email already exists"
        )

    user = User(
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        email=payload.email.strip().lower(),
        firebase_uid=payload.firebase_uid.strip() if payload.firebase_uid else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get the current authenticated user's information."""
    return current_user


@router.get("/pro-status")
def get_pro_status(
    email: str = Query(..., description="User email to check"),
    db: Session = Depends(get_db),
):
    # Normalize email
    normalized = email.strip().lower()
    
    # First, try to find user by email
    user = db.query(User).filter(func.lower(User.email) == normalized).first()
    
    if user:
        # Check if user has a mester profile
        mester = db.query(Mester).filter(Mester.user_id == user.id).first()
        if mester:
            profile = (
                db.query(MesterProfile).filter(MesterProfile.mester_id == mester.id).first()
            )
            return {
                "is_pro": True,
                "mester_id": str(mester.id),
                "logo_url": getattr(profile, "logo_url", None) if profile else None,
                "display_name": getattr(profile, "display_name", None) if profile else None,
            }
    
    # Fallback: check by email in mester table (legacy)
    mester = db.query(Mester).filter(func.lower(Mester.email) == normalized).first()
    profile = None
    if not mester:
        profile = (
            db.query(MesterProfile)
            .filter(func.lower(MesterProfile.contact_email) == normalized)
            .first()
        )
        is_pro = profile is not None
        mester_id = getattr(profile, "mester_id", None) if profile else None
    else:
        is_pro = True
        mester_id = mester.id
        profile = (
            db.query(MesterProfile).filter(MesterProfile.mester_id == mester.id).first()
        )

    return {
        "is_pro": bool(is_pro),
        "mester_id": str(mester_id) if mester_id else None,
        "logo_url": getattr(profile, "logo_url", None) if profile else None,
        "display_name": getattr(profile, "display_name", None) if profile else None,
    }
