"""
Onboarding draft endpoints and finalize for mester activation.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
import uuid

from app.core.database import get_db
from app.models.database import (
    OnboardingDraft,
    Mester,
    MesterService,
    MesterCoverageArea,
)
from app.models.schemas import (
    OnboardingDraftCreate,
    OnboardingDraftUpdate,
    OnboardingDraftResponse,
    MesterResponse,
)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

def _draft_to_response(draft: OnboardingDraft) -> OnboardingDraftResponse:
    return OnboardingDraftResponse(
        id=str(draft.id),
        email=draft.email,
        phone=draft.phone,
        data=draft.data,
        current_step=draft.current_step,
        is_submitted=draft.is_submitted,
        created_at=draft.created_at,
        updated_at=draft.updated_at,
    )


@router.post("/drafts", response_model=OnboardingDraftResponse)
async def create_draft(payload: OnboardingDraftCreate, db: Session = Depends(get_db)):
    draft = OnboardingDraft(
        email=payload.email,
        phone=payload.phone,
        data=payload.data or {},
        current_step=payload.current_step or 0,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return _draft_to_response(draft)


@router.get("/drafts/{draft_id}", response_model=OnboardingDraftResponse)
async def get_draft(draft_id: str, db: Session = Depends(get_db)):
    draft = db.query(OnboardingDraft).filter(OnboardingDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return _draft_to_response(draft)


@router.patch("/drafts/{draft_id}", response_model=OnboardingDraftResponse)
async def update_draft(draft_id: str, payload: OnboardingDraftUpdate, db: Session = Depends(get_db)):
    draft = db.query(OnboardingDraft).filter(OnboardingDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    if payload.email is not None:
        draft.email = payload.email
    if payload.phone is not None:
        draft.phone = payload.phone
    if payload.data is not None:
        current: Dict[str, Any] = draft.data or {}
        draft.data = {**current, **payload.data}
    if payload.current_step is not None:
        draft.current_step = payload.current_step
    if payload.is_submitted is not None:
        draft.is_submitted = payload.is_submitted

    db.add(draft)
    db.commit()
    db.refresh(draft)
    return _draft_to_response(draft)


@router.delete("/drafts/{draft_id}")
async def delete_draft(draft_id: str, db: Session = Depends(get_db)):
    draft = db.query(OnboardingDraft).filter(OnboardingDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    db.delete(draft)
    db.commit()
    return {"ok": True}


@router.post("/drafts/{draft_id}/finalize", response_model=MesterResponse)
async def finalize_draft(draft_id: str, db: Session = Depends(get_db)):
    draft = db.query(OnboardingDraft).filter(OnboardingDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    data: Dict[str, Any] = draft.data or {}

    # Validate minimal requirements
    full_name = data.get("full_name")
    email = data.get("email") or draft.email
    phone = data.get("phone") or draft.phone
    languages: Optional[List[str]] = data.get("languages")
    services: List[Dict[str, Any]] = data.get("services") or []
    coverage: List[Dict[str, Any]] = data.get("coverage") or []
    slug = data.get("slug")

    if not full_name or not slug:
        raise HTTPException(status_code=400, detail="full_name and slug are required")

    mester = Mester(
        full_name=full_name,
        slug=slug,
        email=email,
        phone=phone,
        languages=languages,
        bio=data.get("bio"),
        home_city_id=data.get("home_city_id"),
        lat=data.get("lat"),
        lon=data.get("lon"),
        is_verified=False,
        is_active=True,
    )
    db.add(mester)
    db.commit()
    db.refresh(mester)

    # Create selected services
    for svc in services:
        service_id = svc.get("service_id")
        if not service_id:
            continue
        ms = MesterService(
            mester_id=mester.id,
            service_id=uuid.UUID(service_id) if isinstance(service_id, str) else service_id,
            price_hour_min=svc.get("price_hour_min"),
            price_hour_max=svc.get("price_hour_max"),
            pricing_notes=svc.get("pricing_notes"),
            is_active=True,
        )
        db.add(ms)

    # Create coverage areas
    for cov in coverage:
        area = MesterCoverageArea(
            mester_id=mester.id,
            city_id=uuid.UUID(cov["city_id"]) if cov.get("city_id") else None,
            district_id=uuid.UUID(cov["district_id"]) if cov.get("district_id") else None,
            postal_code_id=uuid.UUID(cov["postal_code_id"]) if cov.get("postal_code_id") else None,
            radius_km=cov.get("radius_km"),
            priority=int(cov.get("priority", 0)),
        )
        db.add(area)

    draft.is_submitted = True
    db.add(draft)
    db.commit()
    db.refresh(mester)

    return MesterResponse(
        id=str(mester.id),
        full_name=mester.full_name,
        slug=mester.slug,
        email=mester.email,
        phone=mester.phone,
        bio=mester.bio,
        skills=mester.skills,
        tags=mester.tags,
        languages=mester.languages,
        years_experience=mester.years_experience,
        is_verified=mester.is_verified,
        is_active=mester.is_active,
        home_city_id=str(mester.home_city_id) if mester.home_city_id else None,
        lat=mester.lat,
        lon=mester.lon,
        rating_avg=mester.rating_avg,
        review_count=mester.review_count,
        created_at=mester.created_at,
        updated_at=mester.updated_at,
    )


