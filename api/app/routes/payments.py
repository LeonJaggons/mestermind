"""
Payment routes for Stripe integration
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from typing import Optional
import uuid as _uuid
import logging

from app.core.database import get_db
from app.models.schemas import (
    PaymentIntentCreate,
    PaymentIntentResponse,
    PaymentConfirm,
    PaymentResponse,
    PaymentIntentCreateWithMethod,
    SavedPaymentMethodCreate,
    SavedPaymentMethodUpdate,
    SavedPaymentMethodResponse,
    SavedPaymentMethodListResponse,
)
from app.services.stripe_service import StripeService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/create-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    payload: PaymentIntentCreate,
    mester_id: str,
    db: Session = Depends(get_db),
):
    """
    Create a Stripe payment intent for lead purchase (legacy endpoint)
    
    Args:
        payload: Payment intent creation data
        mester_id: ID of the mester making the purchase (from query param)
        db: Database session
        
    Returns:
        Payment intent details including client secret
    """
    
    try:
        mester_uuid = _uuid.UUID(mester_id)
        request_uuid = _uuid.UUID(payload.request_id)
        thread_uuid = _uuid.UUID(payload.thread_id) if payload.thread_id else None
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid UUID format") from exc
    
    stripe_service = StripeService(db)
    
    try:
        payment = await stripe_service.create_payment_intent(
            mester_id=mester_uuid,
            request_id=request_uuid,
            thread_id=thread_uuid,
        )
    except ValueError as e:
        logger.error("Failed to create payment intent: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Unexpected error creating payment intent: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e
    
    return PaymentIntentResponse(
        payment_id=str(payment.id),
        client_secret=payment.stripe_client_secret or "",
        amount=payment.amount,
        currency=payment.currency,
        status=payment.status.value,
    )


@router.post("/create-intent-v2", response_model=PaymentIntentResponse)
async def create_payment_intent_v2(
    payload: PaymentIntentCreateWithMethod,
    mester_id: str,
    db: Session = Depends(get_db),
):
    """
    Create a Stripe payment intent for lead purchase with optional saved payment method
    
    Args:
        payload: Payment intent creation data with optional payment method
        mester_id: ID of the mester making the purchase (from query param)
        db: Database session
        
    Returns:
        Payment intent details including client secret
    """
    
    try:
        mester_uuid = _uuid.UUID(mester_id)
        request_uuid = _uuid.UUID(payload.request_id)
        thread_uuid = _uuid.UUID(payload.thread_id) if payload.thread_id else None
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid UUID format") from exc
    
    stripe_service = StripeService(db)
    
    try:
        payment = await stripe_service.create_payment_intent(
            mester_id=mester_uuid,
            request_id=request_uuid,
            thread_id=thread_uuid,
            payment_method_id=payload.payment_method_id,
            save_payment_method=payload.save_payment_method,
        )
    except ValueError as e:
        logger.error("Failed to create payment intent: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Unexpected error creating payment intent: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e
    
    return PaymentIntentResponse(
        payment_id=str(payment.id),
        client_secret=payment.stripe_client_secret or "",
        amount=payment.amount,
        currency=payment.currency,
        status=payment.status.value,
    )


@router.post("/confirm", response_model=PaymentResponse)
async def confirm_payment(
    payload: PaymentConfirm,
    db: Session = Depends(get_db),
):
    """
    Confirm a payment and create lead purchase record
    
    Args:
        payload: Payment confirmation data
        db: Database session
        
    Returns:
        Updated payment record
    """
    
    stripe_service = StripeService(db)
    
    try:
        payment = await stripe_service.confirm_payment(
            payment_intent_id=payload.payment_intent_id,
        )
    except ValueError as e:
        logger.error("Failed to confirm payment: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Unexpected error confirming payment: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e
    
    return PaymentResponse(
        id=str(payment.id),
        mester_id=str(payment.mester_id),
        amount=payment.amount,
        currency=payment.currency,
        status=payment.status.value,
        stripe_payment_intent_id=payment.stripe_payment_intent_id,
        description=payment.description,
        created_at=payment.created_at,
        completed_at=payment.completed_at,
    )


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature"),
    db: Session = Depends(get_db),
):
    """
    Handle Stripe webhook events
    
    Args:
        request: FastAPI request with raw body
        stripe_signature: Stripe signature header
        db: Database session
        
    Returns:
        Success response
    """
    
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")
    
    payload = await request.body()
    
    stripe_service = StripeService(db)
    
    try:
        result = await stripe_service.handle_webhook(payload, stripe_signature)
    except ValueError as e:
        logger.error("Webhook validation failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Unexpected error handling webhook: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e
    
    return result


@router.get("/check-access/{request_id}")
async def check_lead_access(
    request_id: str,
    mester_id: str,
    db: Session = Depends(get_db),
):
    """
    Check if a mester has purchased access to a lead
    
    Args:
        request_id: ID of the request/lead
        mester_id: ID of the mester
        db: Database session
        
    Returns:
        dict with access status
    """
    
    try:
        mester_uuid = _uuid.UUID(mester_id)
        request_uuid = _uuid.UUID(request_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid UUID format") from exc
    
    stripe_service = StripeService(db)
    has_access = stripe_service.check_lead_access(mester_uuid, request_uuid)
    
    return {"has_access": has_access, "request_id": request_id, "mester_id": mester_id}


# -----------------------------
# Saved Payment Methods Routes
# -----------------------------


@router.get("/payment-methods", response_model=SavedPaymentMethodListResponse)
async def list_payment_methods(
    mester_id: str,
    db: Session = Depends(get_db),
):
    """
    List all saved payment methods for a mester
    
    Args:
        mester_id: ID of the mester (from query param)
        db: Database session
        
    Returns:
        List of saved payment methods
    """
    
    try:
        mester_uuid = _uuid.UUID(mester_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid UUID format") from exc
    
    stripe_service = StripeService(db)
    
    try:
        payment_methods = stripe_service.list_payment_methods(mester_uuid)
    except Exception as e:
        logger.error("Unexpected error listing payment methods: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e
    
    return SavedPaymentMethodListResponse(
        payment_methods=[
            SavedPaymentMethodResponse(
                id=str(pm.id),
                mester_id=str(pm.mester_id),
                stripe_payment_method_id=pm.stripe_payment_method_id,
                card_brand=pm.card_brand,
                card_last4=pm.card_last4,
                card_exp_month=pm.card_exp_month,
                card_exp_year=pm.card_exp_year,
                is_default=pm.is_default,
                created_at=pm.created_at,
                updated_at=pm.updated_at,
            )
            for pm in payment_methods
        ],
        total=len(payment_methods),
    )


@router.post("/payment-methods", response_model=SavedPaymentMethodResponse)
async def save_payment_method(
    payload: SavedPaymentMethodCreate,
    mester_id: str,
    db: Session = Depends(get_db),
):
    """
    Save a payment method for a mester
    
    Args:
        payload: Payment method data
        mester_id: ID of the mester (from query param)
        db: Database session
        
    Returns:
        Saved payment method record
    """
    
    try:
        mester_uuid = _uuid.UUID(mester_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid UUID format") from exc
    
    stripe_service = StripeService(db)
    
    try:
        saved_method = stripe_service.save_payment_method(
            mester_id=mester_uuid,
            stripe_payment_method_id=payload.stripe_payment_method_id,
            is_default=payload.is_default,
        )
    except ValueError as e:
        logger.error("Failed to save payment method: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Unexpected error saving payment method: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e
    
    return SavedPaymentMethodResponse(
        id=str(saved_method.id),
        mester_id=str(saved_method.mester_id),
        stripe_payment_method_id=saved_method.stripe_payment_method_id,
        card_brand=saved_method.card_brand,
        card_last4=saved_method.card_last4,
        card_exp_month=saved_method.card_exp_month,
        card_exp_year=saved_method.card_exp_year,
        is_default=saved_method.is_default,
        created_at=saved_method.created_at,
        updated_at=saved_method.updated_at,
    )


@router.patch("/payment-methods/{payment_method_id}", response_model=SavedPaymentMethodResponse)
async def update_payment_method(
    payment_method_id: str,
    payload: SavedPaymentMethodUpdate,
    mester_id: str,
    db: Session = Depends(get_db),
):
    """
    Update a saved payment method (e.g., set as default)
    
    Args:
        payment_method_id: ID of the payment method to update
        payload: Update data
        mester_id: ID of the mester (from query param)
        db: Database session
        
    Returns:
        Updated payment method record
    """
    
    try:
        mester_uuid = _uuid.UUID(mester_id)
        pm_uuid = _uuid.UUID(payment_method_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid UUID format") from exc
    
    stripe_service = StripeService(db)
    
    try:
        if payload.is_default is not None and payload.is_default:
            saved_method = stripe_service.set_default_payment_method(
                mester_id=mester_uuid,
                payment_method_id=pm_uuid,
            )
        else:
            raise HTTPException(status_code=400, detail="Only setting default is supported")
    except ValueError as e:
        logger.error("Failed to update payment method: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Unexpected error updating payment method: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e
    
    return SavedPaymentMethodResponse(
        id=str(saved_method.id),
        mester_id=str(saved_method.mester_id),
        stripe_payment_method_id=saved_method.stripe_payment_method_id,
        card_brand=saved_method.card_brand,
        card_last4=saved_method.card_last4,
        card_exp_month=saved_method.card_exp_month,
        card_exp_year=saved_method.card_exp_year,
        is_default=saved_method.is_default,
        created_at=saved_method.created_at,
        updated_at=saved_method.updated_at,
    )


@router.delete("/payment-methods/{payment_method_id}")
async def delete_payment_method(
    payment_method_id: str,
    mester_id: str,
    db: Session = Depends(get_db),
):
    """
    Delete a saved payment method
    
    Args:
        payment_method_id: ID of the payment method to delete
        mester_id: ID of the mester (from query param)
        db: Database session
        
    Returns:
        Success message
    """
    
    try:
        mester_uuid = _uuid.UUID(mester_id)
        pm_uuid = _uuid.UUID(payment_method_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid UUID format") from exc
    
    stripe_service = StripeService(db)
    
    try:
        stripe_service.delete_payment_method(
            mester_id=mester_uuid,
            payment_method_id=pm_uuid,
        )
    except ValueError as e:
        logger.error("Failed to delete payment method: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Unexpected error deleting payment method: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e
    
    return {"message": "Payment method deleted successfully"}


