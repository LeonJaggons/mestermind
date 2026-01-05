from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi import Request as FastAPIRequest
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional
from datetime import datetime, timedelta, timezone
from app.db.session import get_db
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.pro_profile import ProProfile
from app.schemas.subscription import SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse
import stripe
from app.core.config import get_settings

settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter()


@router.get("/pro-profile/{pro_profile_id}", response_model=Optional[SubscriptionResponse])
def get_subscription(pro_profile_id: int, db: Session = Depends(get_db)):
    """Get subscription for a pro profile"""
    subscription = db.query(Subscription).filter(Subscription.pro_profile_id == pro_profile_id).first()
    if not subscription:
        return None
    return subscription


@router.get("/pro-profile/{pro_profile_id}/status")
def get_subscription_status(pro_profile_id: int, db: Session = Depends(get_db)):
    """Check if pro has an active subscription"""
    subscription = db.query(Subscription).filter(Subscription.pro_profile_id == pro_profile_id).first()
    
    if not subscription:
        return {"has_subscription": False, "is_active": False}
    
    # Check if subscription is active and not expired
    is_active = (
        subscription.status == SubscriptionStatus.active and
        subscription.current_period_end and
        subscription.current_period_end > datetime.utcnow()
    )
    
    return {
        "has_subscription": True,
        "is_active": is_active,
        "status": subscription.status.value,
        "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None
    }


@router.post("/verify-checkout/{session_id}")
def verify_checkout_session(session_id: str, db: Session = Depends(get_db)):
    """Verify checkout session and create subscription if webhook hasn't fired yet"""
    try:
        # Retrieve the checkout session from Stripe
        session = stripe.checkout.Session.retrieve(session_id)
        
        if session["mode"] != "subscription" or session["payment_status"] != "paid":
            return {"success": False, "message": "Checkout session is not a paid subscription"}
        
        pro_profile_id = int(session["metadata"]["pro_profile_id"])
        subscription_id = session["subscription"]
        
        print(f"[VERIFY CHECKOUT] Verifying session {session_id} for pro_profile_id={pro_profile_id}")
        
        # Check if subscription already exists
        subscription = db.query(Subscription).filter(
            Subscription.pro_profile_id == pro_profile_id
        ).first()
        
        if subscription and subscription.stripe_subscription_id == subscription_id:
            print(f"[VERIFY CHECKOUT] Subscription already exists: id={subscription.id}")
            return {"success": True, "message": "Subscription already exists", "subscription_id": subscription.id}
        
        # Get subscription details from Stripe
        stripe_sub = stripe.Subscription.retrieve(subscription_id)
        
        if not subscription:
            # Create new subscription
            subscription = Subscription(
                pro_profile_id=pro_profile_id,
                stripe_subscription_id=subscription_id,
                stripe_customer_id=session["customer"],
                status=SubscriptionStatus.active,
                current_period_start=datetime.fromtimestamp(stripe_sub.current_period_start, tz=timezone.utc),
                current_period_end=datetime.fromtimestamp(stripe_sub.current_period_end, tz=timezone.utc)
            )
            db.add(subscription)
            print(f"[VERIFY CHECKOUT] Creating new subscription for pro_profile_id={pro_profile_id}")
        else:
            # Update existing subscription
            subscription.stripe_subscription_id = subscription_id
            subscription.status = SubscriptionStatus.active
            subscription.current_period_start = datetime.fromtimestamp(stripe_sub.current_period_start, tz=timezone.utc)
            subscription.current_period_end = datetime.fromtimestamp(stripe_sub.current_period_end, tz=timezone.utc)
            print(f"[VERIFY CHECKOUT] Updating existing subscription id={subscription.id}")
        
        db.commit()
        db.refresh(subscription)
        
        print(f"[VERIFY CHECKOUT] ✓ Subscription saved: id={subscription.id}, status={subscription.status}")
        return {"success": True, "message": "Subscription created", "subscription_id": subscription.id}
        
    except Exception as e:
        print(f"[VERIFY CHECKOUT] ✗ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error verifying checkout: {str(e)}")


@router.post("/", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_subscription(subscription: SubscriptionCreate, db: Session = Depends(get_db)):
    """Create a new subscription"""
    # Verify pro profile exists
    pro_profile = db.query(ProProfile).filter(ProProfile.id == subscription.pro_profile_id).first()
    if not pro_profile:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    
    # Check if subscription already exists
    existing = db.query(Subscription).filter(Subscription.pro_profile_id == subscription.pro_profile_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subscription already exists for this pro profile")
    
    db_subscription = Subscription(**subscription.model_dump())
    db.add(db_subscription)
    db.commit()
    db.refresh(db_subscription)
    return db_subscription


@router.post("/pro-profile/{pro_profile_id}/create-checkout")
async def create_subscription_checkout(pro_profile_id: int, db: Session = Depends(get_db)):
    """Create Stripe checkout session for subscription"""
    pro_profile = db.query(ProProfile).filter(ProProfile.id == pro_profile_id).first()
    if not pro_profile:
        raise HTTPException(status_code=404, detail="Pro profile not found")
    
    # Check if subscription already exists
    existing = db.query(Subscription).filter(Subscription.pro_profile_id == pro_profile_id).first()
    if existing and existing.status == SubscriptionStatus.active:
        raise HTTPException(status_code=400, detail="Active subscription already exists")
    
    # Get or create Stripe customer
    if not pro_profile.stripe_customer_id:
        customer = stripe.Customer.create(
            email=pro_profile.user.email if pro_profile.user else None,
            metadata={"pro_profile_id": pro_profile_id}
        )
        pro_profile.stripe_customer_id = customer.id
        db.commit()
    else:
        customer = stripe.Customer.retrieve(pro_profile.stripe_customer_id)
    
    # Create Stripe checkout session for subscription
    try:
        # First, create or get the product
        products = stripe.Product.list(limit=100, active=True)
        product = None
        for p in products.data:
            if p.name == "Mestermind Pro Monthly Subscription":
                product = p
                break
        
        if not product:
            product = stripe.Product.create(
                name="Mestermind Pro Monthly Subscription",
                description="Access to open opportunities and leads"
            )
        
        price = stripe.Price.create(
            unit_amount=500000,  # 5000 HUF (zero-decimal currency, so 5000 = 5000 HUF, not 50.00)
            currency="huf",  # Hungarian Forint - lowercase as per Stripe API
            recurring={"interval": "month"},
            product=product.id
          )
        
        print(f"[SUBSCRIPTION] Created Stripe Price: ID={price.id}, amount={price.unit_amount}, currency={price.currency}, type={price.type}")
        
        checkout_session = stripe.checkout.Session.create(
            customer=customer.id,
            payment_method_types=["card"],
            mode="subscription",
            line_items=[{
                "price": price.id,
                "quantity": 1
            }],
            success_url=f"{settings.FRONTEND_URL}/pro/subscribe?subscription=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/pro/subscribe?subscription=cancelled",
            metadata={"pro_profile_id": pro_profile_id}
        )
        
        print(f"[SUBSCRIPTION] Created checkout session: {checkout_session.id}, amount_total={checkout_session.amount_total}, currency={checkout_session.currency}")
        
        return {
            "checkout_url": checkout_session.url, 
            "session_id": checkout_session.id,
            "amount": price.unit_amount,
            "currency": price.currency
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating checkout session: {str(e)}")


@router.put("/{subscription_id}", response_model=SubscriptionResponse)
def update_subscription(subscription_id: int, subscription_update: SubscriptionUpdate, db: Session = Depends(get_db)):
    """Update a subscription"""
    db_subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not db_subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    update_data = subscription_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_subscription, field, value)
    
    db.commit()
    db.refresh(db_subscription)
    return db_subscription


@router.post("/{subscription_id}/cancel")
def cancel_subscription(subscription_id: int, db: Session = Depends(get_db)):
    """Cancel a subscription"""
    db_subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not db_subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    # Cancel in Stripe if subscription ID exists
    if db_subscription.stripe_subscription_id:
        try:
            stripe.Subscription.modify(
                db_subscription.stripe_subscription_id,
                cancel_at_period_end=True
            )
        except Exception as e:
            # Log error but continue with database update
            print(f"Error cancelling Stripe subscription: {e}")
    
    db_subscription.cancel_at_period_end = True
    db_subscription.status = SubscriptionStatus.cancelled
    db_subscription.cancelled_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_subscription)
    
    return db_subscription


@router.post("/webhook")
async def stripe_subscription_webhook(request: FastAPIRequest, db: Session = Depends(get_db)):
    """Handle Stripe subscription webhooks"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    print(f"[WEBHOOK] Received webhook event")
    
    # For testing without webhook secret, we'll skip signature verification
    # In production, you should ALWAYS verify the signature
    if settings.STRIPE_WEBHOOK_SECRET and sig_header:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            print(f"[WEBHOOK] Invalid payload: {e}")
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            print(f"[WEBHOOK] Invalid signature: {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # For testing: parse the event without signature verification
        import json
        event = json.loads(payload)
        print(f"[WEBHOOK] WARNING: Webhook signature verification skipped (testing mode)")
    
    print(f"[WEBHOOK] Event type: {event.get('type')}")
    
    # Handle subscription events
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        print(f"[WEBHOOK] Checkout session completed: mode={session.get('mode')}, subscription={session.get('subscription')}")
        
        if session["mode"] == "subscription":
            try:
                pro_profile_id = int(session["metadata"]["pro_profile_id"])
                subscription_id = session["subscription"]
                
                print(f"[WEBHOOK] Processing subscription: pro_profile_id={pro_profile_id}, subscription_id={subscription_id}")
                
                # Get or create subscription
                subscription = db.query(Subscription).filter(
                    Subscription.pro_profile_id == pro_profile_id
                ).first()
                
                if not subscription:
                    print(f"[WEBHOOK] Creating new subscription for pro_profile_id={pro_profile_id}")
                    subscription = Subscription(
                        pro_profile_id=pro_profile_id,
                        stripe_subscription_id=subscription_id,
                        stripe_customer_id=session["customer"],
                        status=SubscriptionStatus.active
                    )
                    db.add(subscription)
                else:
                    print(f"[WEBHOOK] Updating existing subscription id={subscription.id}")
                    subscription.stripe_subscription_id = subscription_id
                    subscription.status = SubscriptionStatus.active
                
                # Get subscription details from Stripe
                stripe_sub = stripe.Subscription.retrieve(subscription_id)
                subscription.current_period_start = datetime.fromtimestamp(stripe_sub.current_period_start, tz=timezone.utc)
                subscription.current_period_end = datetime.fromtimestamp(stripe_sub.current_period_end, tz=timezone.utc)
                
                db.commit()
                db.refresh(subscription)
                print(f"[WEBHOOK] ✓ Subscription saved: id={subscription.id}, status={subscription.status}")
            except Exception as e:
                print(f"[WEBHOOK] ✗ Error processing checkout.session.completed: {e}")
                import traceback
                traceback.print_exc()
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Error processing webhook: {str(e)}")
    
    elif event["type"] == "customer.subscription.updated":
        stripe_subscription = event["data"]["object"]
        subscription = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == stripe_subscription["id"]
        ).first()
        
        if subscription:
            subscription.current_period_start = datetime.fromtimestamp(stripe_subscription["current_period_start"], tz=timezone.utc)
            subscription.current_period_end = datetime.fromtimestamp(stripe_subscription["current_period_end"], tz=timezone.utc)
            subscription.cancel_at_period_end = stripe_subscription.get("cancel_at_period_end", False)
            
            if stripe_subscription["status"] in ["active", "trialing"]:
                subscription.status = SubscriptionStatus.active
            elif stripe_subscription["status"] == "past_due":
                subscription.status = SubscriptionStatus.past_due
            elif stripe_subscription["status"] in ["canceled", "unpaid"]:
                subscription.status = SubscriptionStatus.cancelled
                subscription.cancelled_at = datetime.now(timezone.utc)
            
            db.commit()
    
    elif event["type"] == "customer.subscription.deleted":
        stripe_subscription = event["data"]["object"]
        subscription = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == stripe_subscription["id"]
        ).first()
        
        if subscription:
            subscription.status = SubscriptionStatus.cancelled
            subscription.cancelled_at = datetime.now(timezone.utc)
            db.commit()
    
    return {"status": "success"}

