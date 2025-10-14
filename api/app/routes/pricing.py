"""
Lead pricing routes for calculating dynamic lead prices based on price bands.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import uuid as _uuid
import logging
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.database import (
    Request as RequestModel,
    Service,
    PriceBand,
    PriceBandMapping,
)
from app.models.schemas import LeadPriceResponse, LeadPriceBreakdown, JobMetrics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pricing", tags=["pricing"])


def calculate_lead_price(
    price_band: PriceBand,
    budget_estimate: Optional[float] = None,
    request_created_at: Optional[datetime] = None,
) -> dict:
    """
    Calculate the lead price based on the price band and optional budget estimate.
    
    Formula:
    - Use customer's budget_estimate if provided, otherwise use the midpoint of typical job value
    - Apply target_take_of_expected_value percentage
    - Enforce price_floor_huf and price_cap_huf constraints
    
    Returns dict with price, breakdown, and metadata.
    """
    
    # Determine the expected job value
    if budget_estimate and budget_estimate > 0:
        expected_value = budget_estimate
        value_source = "customer_estimate"
    else:
        # Use midpoint of typical job value range
        if price_band.typical_job_value_min_huf and price_band.typical_job_value_max_huf:
            expected_value = (
                price_band.typical_job_value_min_huf + price_band.typical_job_value_max_huf
            ) / 2
            value_source = "typical_range_midpoint"
        else:
            # Fallback to floor if no typical values set
            expected_value = price_band.price_floor_huf or 1000
            value_source = "fallback_floor"
    
    # Calculate base price using target take rate
    target_take = price_band.target_take_of_expected_value or 0.25
    base_price = expected_value * target_take
    
    # Apply floor and cap constraints
    floor = price_band.price_floor_huf or 400
    cap = price_band.price_cap_huf or 9000
    
    final_price = max(floor, min(base_price, cap))
    
    # Round to nearest 100 HUF for cleaner pricing
    final_price = round(final_price / 100) * 100
    
    # Ensure minimum Stripe amount (175 HUF for HUF currency)
    if final_price < 175:
        logger.warning(f"Price {final_price} below Stripe minimum, adjusting to 175 HUF")
        final_price = 175
    
    # Build breakdown
    breakdown = {
        "expected_job_value": expected_value,
        "value_source": value_source,
        "target_take_rate": target_take,
        "base_price_before_constraints": base_price,
        "price_floor": floor,
        "price_cap": cap,
        "final_price": final_price,
        "applied_constraint": None,
    }
    
    # Track which constraint was applied
    if base_price < floor:
        breakdown["applied_constraint"] = "floor"
    elif base_price > cap:
        breakdown["applied_constraint"] = "cap"
    
    # Calculate job metrics
    job_value_min = price_band.typical_job_value_min_huf or floor * 10
    job_value_max = price_band.typical_job_value_max_huf or cap * 10
    job_value_mid = (job_value_min + job_value_max) / 2
    
    close_rate_min = price_band.typical_close_rate_min or 0.15
    close_rate_max = price_band.typical_close_rate_max or 0.25
    close_rate_avg = (close_rate_min + close_rate_max) / 2
    
    # Calculate ROI and expected profit
    roi = job_value_mid / final_price if final_price > 0 else 0
    expected_profit_min = (job_value_min * close_rate_min) - final_price
    expected_profit_max = (job_value_max * close_rate_max) - final_price
    expected_value = job_value_mid * close_rate_avg
    
    # Determine competition level based on seats
    seats = price_band.seats_per_lead or 3
    if seats <= 2:
        competition = "low"
    elif seats <= 4:
        competition = "medium"
    else:
        competition = "high"
    
    # Calculate urgency score (1-10, higher = more recent)
    urgency_score = 7  # Default
    if request_created_at:
        now = datetime.now(timezone.utc)
        if request_created_at.tzinfo is None:
            request_created_at = request_created_at.replace(tzinfo=timezone.utc)
        age_hours = (now - request_created_at).total_seconds() / 3600
        if age_hours < 1:
            urgency_score = 10
        elif age_hours < 6:
            urgency_score = 9
        elif age_hours < 24:
            urgency_score = 8
        elif age_hours < 72:
            urgency_score = 7
        else:
            urgency_score = max(1, 7 - int(age_hours / 168))  # Decay after 3 days
    
    job_metrics = {
        "estimated_job_value_min": job_value_min,
        "estimated_job_value_max": job_value_max,
        "estimated_job_value_midpoint": job_value_mid,
        "customer_budget": budget_estimate,
        "has_customer_budget": budget_estimate is not None and budget_estimate > 0,
        "expected_roi": roi,
        "expected_profit_min": expected_profit_min,
        "expected_profit_max": expected_profit_max,
        "win_rate_min": close_rate_min,
        "win_rate_max": close_rate_max,
        "win_rate_avg": close_rate_avg,
        "expected_value": expected_value,
        "competition_level": competition,
        "urgency_score": urgency_score,
    }
    
    # Generate value proposition
    roi_multiplier = int(roi)
    profit_text = f"{int(expected_profit_min):,}-{int(expected_profit_max):,}"
    
    if roi_multiplier >= 20:
        value_prop = f"Exceptional opportunity: {roi_multiplier}x ROI with {profit_text} HUF potential profit"
    elif roi_multiplier >= 10:
        value_prop = f"Strong opportunity: {roi_multiplier}x ROI with {profit_text} HUF potential profit"
    elif roi_multiplier >= 5:
        value_prop = f"Good opportunity: {roi_multiplier}x ROI with {profit_text} HUF potential profit"
    else:
        value_prop = f"Standard lead: {roi_multiplier}x ROI with {profit_text} HUF potential profit"
    
    return {
        "price": final_price,
        "currency": price_band.currency,
        "breakdown": breakdown,
        "band_code": price_band.code,
        "band_label": price_band.label,
        "job_metrics": job_metrics,
        "value_proposition": value_prop,
    }


@router.get("/lead/{request_id}", response_model=LeadPriceResponse)
async def get_lead_price(
    request_id: str,
    db: Session = Depends(get_db),
):
    """
    Calculate and return the price for unlocking a lead (request).
    
    This endpoint:
    1. Fetches the request and its service
    2. Looks up the price band mapping for the service's category/subcategory
    3. Calculates the dynamic price based on the customer's budget estimate
    4. Returns the price with a breakdown for transparency
    """
    
    # Validate and fetch request
    try:
        request_uuid = _uuid.UUID(request_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid request ID format") from exc
    
    request = db.query(RequestModel).filter(RequestModel.id == request_uuid).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Fetch the service to get category and subcategory
    service = db.query(Service).filter(Service.id == request.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Look up the price band mapping
    mapping = (
        db.query(PriceBandMapping)
        .filter(
            PriceBandMapping.category_id == service.category_id,
            PriceBandMapping.subcategory_id == service.subcategory_id,
        )
        .first()
    )
    
    if not mapping:
        # Fallback: try to find a default band or use Band B as default
        logger.warning(
            "No price band mapping found for category %s, subcategory %s. Using default Band B.",
            service.category_id,
            service.subcategory_id,
        )
        price_band = db.query(PriceBand).filter(PriceBand.code == "B").first()
        if not price_band:
            raise HTTPException(
                status_code=500,
                detail="No price band configuration found. Please contact support.",
            )
    else:
        # Fetch the price band
        price_band = (
            db.query(PriceBand).filter(PriceBand.id == mapping.price_band_id).first()
        )
        if not price_band:
            raise HTTPException(status_code=500, detail="Price band not found")
    
    # Calculate the price
    pricing_data = calculate_lead_price(
        price_band=price_band,
        budget_estimate=float(request.budget_estimate) if request.budget_estimate else None,
        request_created_at=request.created_at,
    )
    
    return LeadPriceResponse(
        request_id=request_id,
        price=pricing_data["price"],
        currency=pricing_data["currency"],
        band_code=pricing_data["band_code"],
        band_label=pricing_data["band_label"],
        band_description=price_band.description,
        seats_available=price_band.seats_per_lead or 3,
        estimated_close_rate=pricing_data["job_metrics"]["win_rate_avg"],
        breakdown=LeadPriceBreakdown(**pricing_data["breakdown"]),
        job_metrics=JobMetrics(**pricing_data["job_metrics"]),
        value_proposition=pricing_data["value_proposition"],
    )


@router.get("/thread/{thread_id}", response_model=LeadPriceResponse)
async def get_thread_lead_price(
    thread_id: str,
    db: Session = Depends(get_db),
):
    """
    Calculate and return the price for unlocking a message thread.
    
    This is a convenience endpoint that looks up the request from the thread.
    """
    from app.models.database import MessageThread
    
    # Validate and fetch thread
    try:
        thread_uuid = _uuid.UUID(thread_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid thread ID format") from exc
    
    thread = db.query(MessageThread).filter(MessageThread.id == thread_uuid).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Delegate to the main pricing endpoint
    return await get_lead_price(str(thread.request_id), db)

