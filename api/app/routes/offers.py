"""
Offer routes for mesters to send offers to customer requests.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
import uuid as _uuid
from datetime import datetime, timedelta
import logging

from app.core.database import get_db
from app.models.database import Offer as OfferModel, Request as RequestModel
from app.models.schemas import OfferCreate, OfferUpdate, OfferResponse
from app.services.notifications import NotificationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/offers", tags=["offers"])


@router.post("/", response_model=OfferResponse)
async def create_offer(
    payload: OfferCreate,
    mester_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Create a new offer for a request. Requires lead purchase."""

    # Verify the request exists
    request = (
        db.query(RequestModel).filter(RequestModel.id == payload.request_id).first()
    )
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    # Check if mester has purchased this lead
    from app.services.stripe_service import StripeService
    
    mester_uuid = _uuid.UUID(mester_id)
    request_uuid = _uuid.UUID(payload.request_id)
    
    stripe_service = StripeService(db)
    has_access = stripe_service.check_lead_access(
        mester_id=mester_uuid, request_id=request_uuid
    )
    
    if not has_access:
        raise HTTPException(
            status_code=402, 
            detail="You must purchase this lead before sending an offer"
        )

    # Check if mester already has a pending offer for this request
    existing_offer = (
        db.query(OfferModel)
        .filter(
            OfferModel.request_id == request_uuid,
            OfferModel.mester_id == mester_uuid,
            OfferModel.status == "PENDING",
        )
        .first()
    )

    if existing_offer:
        raise HTTPException(
            status_code=400, detail="You already have a pending offer for this request"
        )

    # Set expiration date (7 days from now)
    expires_at = datetime.utcnow() + timedelta(days=7)

    offer = OfferModel(
        request_id=request_uuid,
        mester_id=mester_uuid,
        price=payload.price,
        currency=payload.currency,
        message=payload.message,
        expires_at=expires_at,
        status="PENDING",
    )

    db.add(offer)
    db.commit()
    db.refresh(offer)

    # Trigger notification to user about new offer
    logger.info(f"[OFFER] Creating notification for offer {offer.id}")
    notification_service = NotificationService(db)
    try:
        notification = await notification_service.notify_new_offer(
            offer_id=offer.id,
            background_tasks=background_tasks,
        )
        if notification:
            logger.info(
                f"[OFFER] Notification {notification.id} created successfully for offer {offer.id}"
            )
        else:
            logger.warning(
                f"[OFFER] No notification created for offer {offer.id} (user may not exist or have no user_id)"
            )
    except Exception as e:
        logger.error(
            f"[OFFER] Error creating notification for offer {offer.id}: {e}",
            exc_info=True,
        )
        # Don't fail the offer creation if notification fails
    
    # Broadcast new offer via WebSocket (instant match notification)
    from app.services.websocket import manager
    
    if request.user_id:
        ws_event = {
            "type": "new_offer",
            "data": {
                "id": str(offer.id),
                "request_id": str(offer.request_id),
                "mester_id": str(offer.mester_id),
                "price": float(offer.price),
                "currency": offer.currency,
                "message": offer.message,
                "status": offer.status.value,
                "created_at": offer.created_at.isoformat() if offer.created_at else None,
                "expires_at": offer.expires_at.isoformat() if offer.expires_at else None,
            }
        }
        try:
            await manager.send_to_user(str(request.user_id), ws_event)
        except Exception as e:
            logger.error(f"[WEBSOCKET] Error broadcasting new offer: {e}")

    return OfferResponse(
        id=str(offer.id),
        request_id=str(offer.request_id),
        mester_id=str(offer.mester_id),
        price=float(offer.price),
        currency=offer.currency,
        message=offer.message,
        status=offer.status.value,
        created_at=offer.created_at,
        updated_at=offer.updated_at,
        expires_at=offer.expires_at,
    )


@router.get("/{offer_id}", response_model=OfferResponse)
async def get_offer(offer_id: str, db: Session = Depends(get_db)):
    """Get a specific offer by ID."""
    offer = db.query(OfferModel).filter(OfferModel.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    return OfferResponse(
        id=str(offer.id),
        request_id=str(offer.request_id),
        mester_id=str(offer.mester_id),
        price=float(offer.price),
        currency=offer.currency,
        message=offer.message,
        status=offer.status.value,
        created_at=offer.created_at,
        updated_at=offer.updated_at,
        expires_at=offer.expires_at,
    )


@router.patch("/{offer_id}", response_model=OfferResponse)
async def update_offer(
    offer_id: str, payload: OfferUpdate, db: Session = Depends(get_db)
):
    """Update an offer."""
    offer = db.query(OfferModel).filter(OfferModel.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    if payload.price is not None:
        offer.price = payload.price
    if payload.message is not None:
        offer.message = payload.message
    if payload.status is not None:
        status_upper = payload.status.upper()
        if status_upper not in ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        offer.status = status_upper  # type: ignore[assignment]

    db.add(offer)
    db.commit()
    db.refresh(offer)

    return OfferResponse(
        id=str(offer.id),
        request_id=str(offer.request_id),
        mester_id=str(offer.mester_id),
        price=float(offer.price),
        currency=offer.currency,
        message=offer.message,
        status=offer.status.value,
        created_at=offer.created_at,
        updated_at=offer.updated_at,
        expires_at=offer.expires_at,
    )


@router.get("/", response_model=List[OfferResponse])
async def list_offers(
    request_id: Optional[str] = None,
    mester_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List offers with optional filters."""
    query = db.query(OfferModel)

    if request_id:
        query = query.filter(OfferModel.request_id == _uuid.UUID(request_id))
    if mester_id:
        query = query.filter(OfferModel.mester_id == _uuid.UUID(mester_id))
    if status:
        query = query.filter(OfferModel.status == status.upper())

    offers = query.order_by(OfferModel.created_at.desc()).all()

    return [
        OfferResponse(
            id=str(offer.id),
            request_id=str(offer.request_id),
            mester_id=str(offer.mester_id),
            price=float(offer.price),
            currency=offer.currency,
            message=offer.message,
            status=offer.status.value,
            created_at=offer.created_at,
            updated_at=offer.updated_at,
            expires_at=offer.expires_at,
        )
        for offer in offers
    ]


@router.delete("/{offer_id}")
async def delete_offer(offer_id: str, db: Session = Depends(get_db)):
    """Delete an offer."""
    offer = db.query(OfferModel).filter(OfferModel.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    db.delete(offer)
    db.commit()

    return {"ok": True}
