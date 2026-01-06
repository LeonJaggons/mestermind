from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from typing import Optional
import stripe
from app.core.config import get_settings
from app.db.session import get_db
from app.models.lead_purchase import LeadPurchase
from app.models.pro_profile import ProProfile
from app.models.user import User
from app.models.job import Job
from app.models.balance_transaction import BalanceTransaction, BalanceTransactionType
from app.schemas.balance_transaction import AddFundsRequest, BalanceResponse, BalanceTransactionResponse
from app.utils import notifications
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()
settings = get_settings()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


@router.get("/config")
async def get_stripe_config():
    """
    Returns the Stripe publishable key for frontend use.
    This is a public key and safe to expose.
    """
    return {
        "publishable_key": settings.STRIPE_PUBLISHABLE_KEY
    }


class CreateCheckoutSessionRequest(BaseModel):
    pro_profile_id: int
    job_id: int
    service_category: str
    job_size: str
    urgency: str
    city_tier: str
    base_price_huf: int
    urgency_multiplier: float
    city_tier_multiplier: float
    final_price_huf: int
    payment_method_id: Optional[str] = None  # Optional saved payment method ID


class CreateSetupIntentRequest(BaseModel):
    pro_profile_id: int


@router.post("/create-checkout-session")
async def create_checkout_session(
    request: CreateCheckoutSessionRequest,
    db: Session = Depends(get_db)
):
    """
    Create a Stripe checkout session for lead purchase.
    Returns the checkout session URL for redirect.
    """
    try:
        # Verify pro profile exists
        pro_profile = db.query(ProProfile).filter(ProProfile.id == request.pro_profile_id).first()
        if not pro_profile:
            raise HTTPException(status_code=404, detail="Pro profile not found")

        # Verify job exists
        job = db.query(Job).filter(Job.id == request.job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # Check if already purchased
        existing_purchase = db.query(LeadPurchase).filter(
            LeadPurchase.pro_profile_id == request.pro_profile_id,
            LeadPurchase.job_id == request.job_id
        ).first()

        if existing_purchase and existing_purchase.payment_status == "completed":
            raise HTTPException(
                status_code=400,
                detail="Lead already purchased"
            )

        # Create or update pending purchase record
        if existing_purchase:
            db_purchase = existing_purchase
            db_purchase.final_price_huf = request.final_price_huf
            db_purchase.payment_status = "pending"
        else:
            db_purchase = LeadPurchase(
                pro_profile_id=request.pro_profile_id,
                job_id=request.job_id,
                service_category=request.service_category,
                job_size=request.job_size,
                urgency=request.urgency,
                city_tier=request.city_tier,
                base_price_huf=request.base_price_huf,
                urgency_multiplier=request.urgency_multiplier,
                city_tier_multiplier=request.city_tier_multiplier,
                final_price_huf=request.final_price_huf,
                payment_status="pending"
            )
            db.add(db_purchase)

        db.commit()
        db.refresh(db_purchase)

        # Convert HUF to cents (Stripe uses smallest currency unit)
        # For HUF, the smallest unit is fillér (1/100 HUF), but Stripe typically uses 1 HUF as minimum
        amount_in_fillers = request.final_price_huf * 100

        # Create Stripe checkout session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "huf",
                        "unit_amount": amount_in_fillers,
                        "product_data": {
                            "name": f"Lead Access - {request.service_category}",
                            "description": f"Unlock unlimited messaging for job #{request.job_id}",
                        },
                    },
                    "quantity": 1,
                },
            ],
            mode="payment",
            success_url=f"{settings.FRONTEND_URL}/pro/messages/{request.job_id}?payment=success",
            cancel_url=f"{settings.FRONTEND_URL}/pro/messages/{request.job_id}?payment=cancelled",
            metadata={
                "lead_purchase_id": str(db_purchase.id),
                "pro_profile_id": str(request.pro_profile_id),
                "job_id": str(request.job_id),
            },
        )

        # Store Stripe session ID
        db_purchase.payment_transaction_id = checkout_session.id
        db.commit()

        return {
            "checkout_url": checkout_session.url,
            "session_id": checkout_session.id,
            "purchase_id": db_purchase.id
        }

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating checkout session: {str(e)}")


@router.post("/create-payment-intent")
async def create_payment_intent(
    request: CreateCheckoutSessionRequest,
    db: Session = Depends(get_db)
):
    """
    Create a Stripe PaymentIntent for embedded checkout.
    Returns the client secret for Stripe Elements.
    """
    try:
        # Verify pro profile exists
        pro_profile = db.query(ProProfile).filter(ProProfile.id == request.pro_profile_id).first()
        if not pro_profile:
            raise HTTPException(status_code=404, detail="Pro profile not found")

        # Verify job exists
        job = db.query(Job).filter(Job.id == request.job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # Check if already purchased
        existing_purchase = db.query(LeadPurchase).filter(
            LeadPurchase.pro_profile_id == request.pro_profile_id,
            LeadPurchase.job_id == request.job_id
        ).first()

        if existing_purchase and existing_purchase.payment_status == "completed":
            raise HTTPException(
                status_code=400,
                detail="Lead already purchased"
            )

        # Create or update pending purchase record
        if existing_purchase:
            db_purchase = existing_purchase
            db_purchase.final_price_huf = request.final_price_huf
            db_purchase.payment_status = "pending"
        else:
            db_purchase = LeadPurchase(
                pro_profile_id=request.pro_profile_id,
                job_id=request.job_id,
                service_category=request.service_category,
                job_size=request.job_size,
                urgency=request.urgency,
                city_tier=request.city_tier,
                base_price_huf=request.base_price_huf,
                urgency_multiplier=request.urgency_multiplier,
                city_tier_multiplier=request.city_tier_multiplier,
                final_price_huf=request.final_price_huf,
                payment_status="pending"
            )
            db.add(db_purchase)

        db.commit()
        db.refresh(db_purchase)

        # Check if user has enough balance
        current_balance = pro_profile.balance_huf or 0
        amount_to_charge = request.final_price_huf
        amount_from_balance = 0
        payment_intent = None
        client_secret = None

        # Use balance if available
        if current_balance > 0:
            if current_balance >= request.final_price_huf:
                # Full amount from balance
                amount_from_balance = request.final_price_huf
                amount_to_charge = 0

                # Deduct from balance immediately
                update_balance(
                    db=db,
                    pro_profile_id=request.pro_profile_id,
                    amount_huf=-amount_from_balance,
                    transaction_type=BalanceTransactionType.withdrawal,
                    description=f"Lead purchase - {request.service_category} (Job #{request.job_id})",
                    lead_purchase_id=db_purchase.id
                )

                # Mark purchase as completed
                db_purchase.payment_status = "completed"
                db_purchase.payment_completed_at = datetime.utcnow()
                db_purchase.payment_transaction_id = f"balance-{db_purchase.id}"
                db.commit()

                return {
                    "client_secret": None,
                    "purchase_id": db_purchase.id,
                    "paid_from_balance": True,
                    "amount_from_balance": amount_from_balance,
                    "amount_charged": 0
                }
            else:
                # Partial amount from balance
                amount_from_balance = current_balance
                amount_to_charge = request.final_price_huf - current_balance

                # Deduct available balance
                update_balance(
                    db=db,
                    pro_profile_id=request.pro_profile_id,
                    amount_huf=-amount_from_balance,
                    transaction_type=BalanceTransactionType.withdrawal,
                    description=f"Lead purchase (partial) - {request.service_category} (Job #{request.job_id})",
                    lead_purchase_id=db_purchase.id
                )

        # Create PaymentIntent for remaining amount (if any)
        if amount_to_charge > 0:
            # Convert HUF to fillers (Stripe uses smallest currency unit)
            amount_in_fillers = amount_to_charge * 100

            # Get or create Stripe customer
            if not pro_profile.stripe_customer_id:
                customer = stripe.Customer.create(
                    metadata={
                        "pro_profile_id": str(pro_profile.id),
                    }
                )
                pro_profile.stripe_customer_id = customer.id
                db.commit()

            # Create Stripe PaymentIntent
            payment_intent_params = {
                "amount": amount_in_fillers,
                "currency": "huf",
                "customer": pro_profile.stripe_customer_id,
                "metadata": {
                    "lead_purchase_id": str(db_purchase.id),
                    "pro_profile_id": str(request.pro_profile_id),
                    "job_id": str(request.job_id),
                    "amount_from_balance": str(amount_from_balance),
                },
                "description": f"Lead Access - {request.service_category} (Job #{request.job_id})",
            }

            # If a saved payment method is provided, use it
            if request.payment_method_id:
                payment_intent_params["payment_method"] = request.payment_method_id
                payment_intent_params["confirmation_method"] = "automatic"
                payment_intent_params["confirm"] = True

            payment_intent = stripe.PaymentIntent.create(**payment_intent_params)

            # Store Stripe payment intent ID
            db_purchase.payment_transaction_id = payment_intent.id
            db.commit()

            # If using saved payment method and it's already confirmed, mark purchase as complete
            if request.payment_method_id and payment_intent.status == "succeeded":
                db_purchase.payment_status = "completed"
                db_purchase.payment_completed_at = datetime.utcnow()
                db.commit()

                return {
                    "client_secret": None,
                    "purchase_id": db_purchase.id,
                    "paid_from_balance": amount_from_balance > 0,
                    "amount_from_balance": amount_from_balance,
                    "amount_charged": amount_to_charge,
                    "status": "succeeded"
                }

            client_secret = payment_intent.client_secret

        return {
            "client_secret": client_secret,
            "purchase_id": db_purchase.id,
            "paid_from_balance": amount_from_balance > 0,
            "amount_from_balance": amount_from_balance,
            "amount_charged": amount_to_charge
        }

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating payment intent: {str(e)}")


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db)
):
    """
    Handle Stripe webhook events.
    This endpoint is called by Stripe when payment events occur.
    """
    payload = await request.body()

    # For testing without webhook secret, we'll skip signature verification
    # In production, you should ALWAYS verify the signature
    if settings.STRIPE_WEBHOOK_SECRET and stripe_signature:
        try:
            event = stripe.Webhook.construct_event(
                payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # For testing: parse the event without signature verification
        import json
        event = json.loads(payload)

    # Handle the event
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        # Get the purchase ID from metadata
        lead_purchase_id = session.get("metadata", {}).get("lead_purchase_id")

        if lead_purchase_id:
            # Update the purchase record
            purchase = db.query(LeadPurchase).filter(LeadPurchase.id == int(lead_purchase_id)).first()

            if purchase:
                purchase.payment_status = "completed"
                purchase.payment_completed_at = datetime.utcnow()
                purchase.payment_transaction_id = session.get("payment_intent") or session.get("id")
                db.commit()

                print(f"✓ Payment completed for lead purchase #{lead_purchase_id}")

    elif event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        metadata = payment_intent.get("metadata", {})

        # Handle add_funds payment intents
        if metadata.get("type") == "add_funds":
            pro_profile_id = int(metadata.get("pro_profile_id"))
            amount_huf = int(metadata.get("amount_huf", 0))
            payment_intent_id = payment_intent.get("id")

            # Check if already processed to prevent duplicate updates
            existing_transaction = db.query(BalanceTransaction).filter(
                BalanceTransaction.stripe_payment_intent_id == payment_intent_id
            ).first()

            if not existing_transaction:
                # Update balance
                update_balance(
                    db=db,
                    pro_profile_id=pro_profile_id,
                    amount_huf=amount_huf,
                    transaction_type=BalanceTransactionType.deposit,
                    description=f"Added {amount_huf} HUF to balance",
                    stripe_payment_intent_id=payment_intent_id
                )
                print(f"✓ Funds added to balance for pro profile #{pro_profile_id}: {amount_huf} HUF")
            else:
                print(f"⚠ Balance already updated for payment intent {payment_intent_id}, skipping duplicate update")

        # Handle lead purchase payment intents
        else:
            lead_purchase_id = metadata.get("lead_purchase_id")

            if lead_purchase_id:
                # Update the purchase record
                purchase = db.query(LeadPurchase).filter(LeadPurchase.id == int(lead_purchase_id)).first()

                if purchase:
                    purchase.payment_status = "completed"
                    purchase.payment_completed_at = datetime.utcnow()
                    purchase.payment_transaction_id = payment_intent.get("id")

                    # If there was a partial balance payment, we already deducted it
                    # This webhook is for the card payment portion
                    db.commit()

                    print(f"✓ Payment intent succeeded for lead purchase #{lead_purchase_id}")

    elif event["type"] == "payment_intent.payment_failed":
        payment_intent = event["data"]["object"]
        lead_purchase_id = payment_intent.get("metadata", {}).get("lead_purchase_id")

        if lead_purchase_id:
            purchase = db.query(LeadPurchase).filter(LeadPurchase.id == int(lead_purchase_id)).first()
            if purchase and purchase.payment_status == "pending":
                purchase.payment_status = "failed"
                db.commit()
                print(f"✗ Payment intent failed for lead purchase #{lead_purchase_id}")

    elif event["type"] == "checkout.session.expired":
        session = event["data"]["object"]
        lead_purchase_id = session.get("metadata", {}).get("lead_purchase_id")

        if lead_purchase_id:
            purchase = db.query(LeadPurchase).filter(LeadPurchase.id == int(lead_purchase_id)).first()
            if purchase and purchase.payment_status == "pending":
                purchase.payment_status = "failed"
                db.commit()
                print(f"✗ Payment expired for lead purchase #{lead_purchase_id}")

    return {"status": "success"}


@router.get("/payment-status/{purchase_id}")
def get_payment_status(purchase_id: int, db: Session = Depends(get_db)):
    """
    Check the payment status of a lead purchase.
    Used to verify payment after redirect from Stripe.
    """
    purchase = db.query(LeadPurchase).filter(LeadPurchase.id == purchase_id).first()

    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    return {
        "purchase_id": purchase.id,
        "payment_status": purchase.payment_status,
        "completed_at": purchase.payment_completed_at,
        "amount_huf": purchase.final_price_huf
    }


@router.post("/create-setup-intent")
async def create_setup_intent(
    request: CreateSetupIntentRequest,
    db: Session = Depends(get_db)
):
    """
    Create a Stripe SetupIntent for saving payment methods.
    Returns the client secret for Stripe Elements.
    """
    try:
        # Verify pro profile exists
        pro_profile = db.query(ProProfile).filter(ProProfile.id == request.pro_profile_id).first()
        if not pro_profile:
            raise HTTPException(status_code=404, detail="Pro profile not found")

        # Get or create Stripe customer for this pro
        if not pro_profile.stripe_customer_id:
            # Create a new Stripe customer
            customer = stripe.Customer.create(
                metadata={
                    "pro_profile_id": str(pro_profile.id),
                }
            )
            pro_profile.stripe_customer_id = customer.id
            db.commit()

        # Create SetupIntent
        setup_intent = stripe.SetupIntent.create(
            customer=pro_profile.stripe_customer_id,
            payment_method_types=["card"],
            metadata={
                "pro_profile_id": str(request.pro_profile_id),
            },
        )

        return {
            "client_secret": setup_intent.client_secret,
            "setup_intent_id": setup_intent.id
        }

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating setup intent: {str(e)}")


@router.get("/payment-methods/{pro_profile_id}")
async def get_payment_methods(pro_profile_id: int, db: Session = Depends(get_db)):
    """
    Get all payment methods for a pro profile.
    """
    try:
        # Verify pro profile exists
        pro_profile = db.query(ProProfile).filter(ProProfile.id == pro_profile_id).first()
        if not pro_profile:
            raise HTTPException(status_code=404, detail="Pro profile not found")

        if not pro_profile.stripe_customer_id:
            return {"payment_methods": []}

        # Get payment methods from Stripe
        payment_methods = stripe.PaymentMethod.list(
            customer=pro_profile.stripe_customer_id,
            type="card",
        )

        # Format payment methods
        formatted_methods = []
        for pm in payment_methods.data:
            formatted_methods.append({
                "id": pm.id,
                "brand": pm.card.brand,
                "last4": pm.card.last4,
                "exp_month": pm.card.exp_month,
                "exp_year": pm.card.exp_year,
                "is_default": pm.id == pro_profile.stripe_default_payment_method_id,
            })

        return {"payment_methods": formatted_methods}

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching payment methods: {str(e)}")


@router.delete("/payment-methods/{pro_profile_id}/{payment_method_id}")
async def delete_payment_method(
    pro_profile_id: int,
    payment_method_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete a payment method.
    """
    try:
        # Verify pro profile exists
        pro_profile = db.query(ProProfile).filter(ProProfile.id == pro_profile_id).first()
        if not pro_profile:
            raise HTTPException(status_code=404, detail="Pro profile not found")

        # Detach payment method from Stripe
        stripe.PaymentMethod.detach(payment_method_id)

        # If this was the default, clear it
        if pro_profile.stripe_default_payment_method_id == payment_method_id:
            pro_profile.stripe_default_payment_method_id = None
            db.commit()

        return {"status": "success", "message": "Payment method deleted"}

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting payment method: {str(e)}")


@router.post("/payment-methods/{pro_profile_id}/{payment_method_id}/set-default")
async def set_default_payment_method(
    pro_profile_id: int,
    payment_method_id: str,
    db: Session = Depends(get_db)
):
    """
    Set a payment method as the default.
    """
    try:
        # Verify pro profile exists
        pro_profile = db.query(ProProfile).filter(ProProfile.id == pro_profile_id).first()
        if not pro_profile:
            raise HTTPException(status_code=404, detail="Pro profile not found")

        # Update default payment method in Stripe customer
        if pro_profile.stripe_customer_id:
            stripe.Customer.modify(
                pro_profile.stripe_customer_id,
                invoice_settings={
                    "default_payment_method": payment_method_id,
                },
            )

        # Update in database
        pro_profile.stripe_default_payment_method_id = payment_method_id
        db.commit()

        return {"status": "success", "message": "Default payment method updated"}

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error setting default payment method: {str(e)}")


def update_balance(
    db: Session,
    pro_profile_id: int,
    amount_huf: int,
    transaction_type: BalanceTransactionType,
    description: Optional[str] = None,
    lead_purchase_id: Optional[int] = None,
    stripe_payment_intent_id: Optional[str] = None
) -> BalanceTransaction:
    """
    Helper function to update balance and create a transaction record.
    Returns the created BalanceTransaction.
    """
    pro_profile = db.query(ProProfile).filter(ProProfile.id == pro_profile_id).first()
    if not pro_profile:
        raise HTTPException(status_code=404, detail="Pro profile not found")

    balance_before = pro_profile.balance_huf
    pro_profile.balance_huf += amount_huf
    balance_after = pro_profile.balance_huf

    # Create transaction record
    transaction = BalanceTransaction(
        pro_profile_id=pro_profile_id,
        transaction_type=transaction_type,
        amount_huf=amount_huf,
        balance_before_huf=balance_before,
        balance_after_huf=balance_after,
        lead_purchase_id=lead_purchase_id,
        stripe_payment_intent_id=stripe_payment_intent_id,
        description=description
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction


@router.get("/balance/{pro_profile_id}")
async def get_balance(pro_profile_id: int, db: Session = Depends(get_db)):
    """
    Get the current balance for a pro profile.
    """
    try:
        pro_profile = db.query(ProProfile).filter(ProProfile.id == pro_profile_id).first()
        if not pro_profile:
            raise HTTPException(status_code=404, detail="Pro profile not found")

        return BalanceResponse(balance_huf=pro_profile.balance_huf or 0)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching balance: {str(e)}")


@router.post("/add-funds")
async def add_funds(
    request: AddFundsRequest,
    db: Session = Depends(get_db)
):
    """
    Create a PaymentIntent to add funds to the pro profile's balance.
    Returns the client secret for Stripe Elements.
    """
    try:
        # Verify pro profile exists
        pro_profile = db.query(ProProfile).filter(ProProfile.id == request.pro_profile_id).first()
        if not pro_profile:
            raise HTTPException(status_code=404, detail="Pro profile not found")

        if request.amount_huf <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than 0")

        # Get or create Stripe customer
        if not pro_profile.stripe_customer_id:
            customer = stripe.Customer.create(
                metadata={
                    "pro_profile_id": str(pro_profile.id),
                }
            )
            pro_profile.stripe_customer_id = customer.id
            db.commit()

        # Convert HUF to fillers (smallest currency unit)
        amount_in_fillers = request.amount_huf * 100

        # Create PaymentIntent for adding funds
        payment_intent_params = {
            "amount": amount_in_fillers,
            "currency": "huf",
            "customer": pro_profile.stripe_customer_id,
            "payment_method_types": ["card"],
            "metadata": {
                "pro_profile_id": str(request.pro_profile_id),
                "type": "add_funds",
                "amount_huf": str(request.amount_huf),
            },
            "description": f"Add funds to balance - {request.amount_huf} HUF",
        }

        # If a saved payment method is provided, use it
        if request.payment_method_id:
            payment_intent_params["payment_method"] = request.payment_method_id
            payment_intent_params["confirmation_method"] = "automatic"
            payment_intent_params["confirm"] = True

        payment_intent = stripe.PaymentIntent.create(**payment_intent_params)

        print(f"Created payment intent for add_funds: {payment_intent.id}, status: {payment_intent.status}, amount: {amount_in_fillers} HUF")

        # If using saved payment method and it's already confirmed, update balance immediately
        # But only if payment actually succeeded (not just processing)
        if request.payment_method_id and payment_intent.status == "succeeded":
            # Check if already processed to prevent duplicates
            existing_transaction = db.query(BalanceTransaction).filter(
                BalanceTransaction.stripe_payment_intent_id == payment_intent.id
            ).first()

            if not existing_transaction:
                update_balance(
                    db=db,
                    pro_profile_id=request.pro_profile_id,
                    amount_huf=request.amount_huf,
                    transaction_type=BalanceTransactionType.deposit,
                    description=f"Added {request.amount_huf} HUF to balance",
                    stripe_payment_intent_id=payment_intent.id
                )

            return {
                "client_secret": None,
                "payment_intent_id": payment_intent.id,
                "amount_huf": request.amount_huf,
                "status": "succeeded",
                "requires_action": False
            }

        return {
            "client_secret": payment_intent.client_secret,
            "payment_intent_id": payment_intent.id,
            "amount_huf": request.amount_huf,
            "status": payment_intent.status,
            "requires_action": payment_intent.status == "requires_action"
        }

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating payment intent: {str(e)}")


@router.post("/add-funds-confirm/{payment_intent_id}")
async def confirm_add_funds(
    payment_intent_id: str,
    db: Session = Depends(get_db)
):
    """
    Confirm that funds were added and update the balance.
    This should be called after the payment intent is confirmed on the frontend.
    """
    try:
        # Retrieve the payment intent from Stripe
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)

        # Only proceed if payment actually succeeded
        if payment_intent.status != "succeeded":
            raise HTTPException(
                status_code=400,
                detail=f"Payment not succeeded. Status: {payment_intent.status}. Payment must be completed before funds can be added."
            )

        # Get metadata
        metadata = payment_intent.metadata
        pro_profile_id = int(metadata.get("pro_profile_id"))
        amount_huf = int(metadata.get("amount_huf", 0))

        if metadata.get("type") != "add_funds":
            raise HTTPException(status_code=400, detail="This payment intent is not for adding funds")

        # Check if balance was already updated (e.g., by webhook) to prevent duplicate updates
        existing_transaction = db.query(BalanceTransaction).filter(
            BalanceTransaction.stripe_payment_intent_id == payment_intent_id
        ).first()

        if existing_transaction:
            # Balance already updated, return existing transaction
            return {
                "status": "success",
                "balance_huf": existing_transaction.balance_after_huf,
                "transaction": BalanceTransactionResponse.model_validate(existing_transaction),
                "already_processed": True
            }

        # Update balance
        transaction = update_balance(
            db=db,
            pro_profile_id=pro_profile_id,
            amount_huf=amount_huf,
            transaction_type=BalanceTransactionType.deposit,
            description=f"Added {amount_huf} HUF to balance",
            stripe_payment_intent_id=payment_intent_id
        )

        return {
            "status": "success",
            "balance_huf": transaction.balance_after_huf,
            "transaction": BalanceTransactionResponse.model_validate(transaction)
        }

    except HTTPException:
        raise
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error confirming funds: {str(e)}")


@router.get("/balance-transactions/{pro_profile_id}")
async def get_balance_transactions(
    pro_profile_id: int,
    limit: int = 50,
    skip: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get balance transaction history for a pro profile.
    """
    try:
        pro_profile = db.query(ProProfile).filter(ProProfile.id == pro_profile_id).first()
        if not pro_profile:
            raise HTTPException(status_code=404, detail="Pro profile not found")

        transactions = db.query(BalanceTransaction)\
            .filter(BalanceTransaction.pro_profile_id == pro_profile_id)\
            .order_by(BalanceTransaction.created_at.desc())\
            .offset(skip)\
            .limit(limit)\
            .all()

        return [BalanceTransactionResponse.model_validate(t) for t in transactions]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching transactions: {str(e)}")
