from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.faq import FAQ
from app.models.pro_profile import ProProfile
from app.schemas.faq import FAQCreate, FAQUpdate, FAQResponse

router = APIRouter()


@router.get("/pro-profile/{pro_profile_id}", response_model=List[FAQResponse])
def get_faqs(pro_profile_id: int, db: Session = Depends(get_db)):
    """Get all FAQs for a pro profile"""
    faqs = db.query(FAQ).filter(FAQ.pro_profile_id == pro_profile_id).order_by(FAQ.display_order, FAQ.created_at).all()
    return faqs


@router.post("/", response_model=FAQResponse, status_code=status.HTTP_201_CREATED)
def create_faq(faq: FAQCreate, db: Session = Depends(get_db)):
    """Create a new FAQ"""
    # Verify pro profile exists
    pro_profile = db.query(ProProfile).filter(ProProfile.id == faq.pro_profile_id).first()
    if not pro_profile:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    
    db_faq = FAQ(**faq.model_dump())
    db.add(db_faq)
    db.commit()
    db.refresh(db_faq)
    return db_faq


@router.put("/{faq_id}", response_model=FAQResponse)
def update_faq(faq_id: int, faq_update: FAQUpdate, db: Session = Depends(get_db)):
    """Update an existing FAQ"""
    db_faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not db_faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    update_data = faq_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_faq, field, value)
    
    db.commit()
    db.refresh(db_faq)
    return db_faq


@router.delete("/{faq_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_faq(faq_id: int, db: Session = Depends(get_db)):
    """Delete an FAQ"""
    db_faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not db_faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    db.delete(db_faq)
    db.commit()
    return None


@router.post("/bulk", response_model=List[FAQResponse])
def bulk_update_faqs(pro_profile_id: int, faqs: List[FAQUpdate], db: Session = Depends(get_db)):
    """Bulk update FAQs for a pro profile (used for reordering and batch updates)"""
    # Verify pro profile exists
    pro_profile = db.query(ProProfile).filter(ProProfile.id == pro_profile_id).first()
    if not pro_profile:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    
    # This endpoint can be used for bulk operations if needed
    # For now, we'll just return the existing FAQs
    existing_faqs = db.query(FAQ).filter(FAQ.pro_profile_id == pro_profile_id).all()
    return existing_faqs


