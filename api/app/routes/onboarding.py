"""
Onboarding draft endpoints and finalize for mester activation.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import exc as sa_exc
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
import uuid

from app.core.database import get_db
from app.models.database import (
    OnboardingDraft,
    Mester,
    MesterService,
    MesterCoverageArea,
    MesterProfile,
    MesterProfileService,
    MesterProfileAddress,
    MesterProfileCoverage,
    MesterProfileWorkingHour,
    MesterProfilePreference,
    MesterProfileBudget,
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
    def next_available_slug(base_slug: str) -> str:
        # Fetch all slugs starting with base or base-<number>
        existing = db.query(Mester.slug).filter(Mester.slug.like(f"{base_slug}%")).all()
        if not existing:
            return base_slug
        taken = {row[0] for row in existing}
        if base_slug not in taken:
            return base_slug
        # find highest numeric suffix
        max_n = 1
        for s in taken:
            if s == base_slug:
                continue
            if s.startswith(base_slug + "-"):
                tail = s[len(base_slug) + 1:]
                if tail.isdigit():
                    try:
                        n = int(tail)
                        if n > max_n:
                            max_n = n
                    except ValueError:
                        continue
        return f"{base_slug}-{max_n + 1}"

    db.add(mester)
    try:
        db.commit()
    except sa_exc.IntegrityError as e:
        db.rollback()
        msg = str(e.orig)
        # Handle duplicate email gracefully by clearing email and retrying
        if 'uq_mesters_email' in msg or 'mesters_email_key' in msg:
            mester.email = None
            mester.slug = next_available_slug(mester.slug)
            db.add(mester)
            db.commit()
        # Handle duplicate slug with deterministic increment
        elif 'uq_mesters_slug' in msg or 'ix_mesters_slug' in msg or 'mesters_slug_key' in msg:
            mester.slug = next_available_slug(mester.slug)
            db.add(mester)
            db.commit()
        else:
            raise
    db.refresh(mester)

    # Create selected services
    for svc in services:
        service_id = svc.get("service_id")
        if not service_id:
            continue
        ms = MesterService(
            mester_id=mester.id,
            service_id=uuid.UUID(service_id) if isinstance(service_id, str) else service_id,
            price_hour_min=svc.get("price") or svc.get("price_hour_min"),
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

    # Helpers
    def _to_float(val):
        try:
            if val is None:
                return None
            return float(val)
        except (TypeError, ValueError):
            return None

    # Persist extended profile (normalized tables)
    preferences = data.get("preferences")
    cov_list = data.get("coverage") or []
    cov0 = cov_list[0] if isinstance(cov_list, list) and len(cov_list) > 0 else {}
    # prefer explicit km, else convert miles, else None
    radius_km_val = _to_float(data.get("radius_km"))
    if radius_km_val is None:
        miles = _to_float(data.get("radius_miles")) or _to_float(cov0.get("radius_miles"))
        if miles is not None:
            radius_km_val = miles * 1.60934
    if radius_km_val is None:
        radius_km_val = _to_float(cov0.get("radius_km"))
    def _to_int(val: Any) -> Optional[int]:
        try:
            if val is None:
                return None
            return int(val)
        except (TypeError, ValueError):
            return None

    profile = MesterProfile(
        mester_id=mester.id,
        business_name=data.get("business_name"),
        display_name=data.get("display_name"),
        slug=slug,
        contact_email=email,
        contact_phone=phone,
        year_founded=_to_int(data.get("year_founded")),
        employees_count=_to_int(data.get("num_employees")),
        intro=data.get("intro") or data.get("bio"),
        languages=languages,
        availability_mode=data.get("availability_mode"),
        budget_mode=data.get("budget_mode"),
        weekly_budget=_to_int(data.get("weekly_budget")),
        logo_url=data.get("logo_url") or (data.get("logo", {}) or {}).get("data_url"),
    )
    db.add(profile)
    db.flush()  # get profile.id

    # Address (1–1)
    addr = data.get("address") or {}
    db.add(MesterProfileAddress(
        profile_id=profile.id,
        street=addr.get("street"),
        unit=addr.get("unit"),
        city=addr.get("city"),
        zip=addr.get("zip"),
        home_city_id=(uuid.UUID(data.get("home_city_id")) if data.get("home_city_id") else None),
    ))

    # Services selected in onboarding (normalized per profile)
    for svc in services:
        service_id = svc.get("service_id")
        if not service_id:
            continue
        db.add(MesterProfileService(
            profile_id=profile.id,
            service_id=uuid.UUID(service_id) if isinstance(service_id, str) else service_id,
            service_name=svc.get("service_name"),
            pricing_model=svc.get("pricing_model"),
            price=_to_int(svc.get("price")),
        ))

    # Coverage entries tied to profile (mirror onboarding coverage)
    for cov in cov_list:
        km = _to_float(cov.get("radius_km"))
        if km is None:
            miles = _to_float(cov.get("radius_miles"))
            km = miles * 1.60934 if miles is not None else None
        db.add(MesterProfileCoverage(
            profile_id=profile.id,
            city_id=(uuid.UUID(cov.get("city_id")) if cov.get("city_id") else None),
            district_id=(uuid.UUID(cov.get("district_id")) if cov.get("district_id") else None),
            postal_code_id=(uuid.UUID(cov.get("postal_code_id")) if cov.get("postal_code_id") else None),
            radius_km=km,
            priority=int(cov.get("priority", 0)),
        ))

    # Working hours: expand dictionary into rows
    hours = data.get("working_hours") or {}
    for day in ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]:
        h = hours.get(day)
        if not isinstance(h, dict):
            continue
        db.add(MesterProfileWorkingHour(
            profile_id=profile.id,
            day=day,
            open=h.get("open", "09:00"),
            close=h.get("close", "17:00"),
            enabled=bool(h.get("enabled", True)),
        ))

    # Preferences (1–1)
    if isinstance(preferences, dict):
        db.add(MesterProfilePreference(
            profile_id=profile.id,
            property_type=preferences.get("property_type"),
            job_size=preferences.get("job_size"),
            frequency=preferences.get("frequency"),
            remove_debris=bool(preferences.get("remove_debris", False)),
        ))

    # Budget (1–1)
    db.add(MesterProfileBudget(
        profile_id=profile.id,
        budget_mode=data.get("budget_mode"),
        weekly_budget=_to_int(data.get("weekly_budget")),
    ))

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


