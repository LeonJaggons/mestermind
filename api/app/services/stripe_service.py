"""
Stripe payment service for handling payments and lead purchases
"""

import os
import logging
from typing import Optional
import uuid as _uuid
from datetime import datetime

import stripe
from sqlalchemy.orm import Session

from app.models.database import (
    Payment,
    PaymentStatus,
    LeadPurchase,
    Request as RequestModel,
    Mester,
    SavedPaymentMethod,
)
from app.routes.pricing import calculate_lead_price

logger = logging.getLogger(__name__)


def _get_stripe_config():
    """Lazy load Stripe configuration from environment variables"""
    api_key = os.getenv("STRIPE_SECRET_KEY")
    if not api_key:
        logger.error("STRIPE_SECRET_KEY not found in environment variables")
        raise ValueError(
            "STRIPE_SECRET_KEY environment variable is not set. "
            "Please add it to your .env file."
        )

    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        logger.warning("STRIPE_WEBHOOK_SECRET not set - webhooks will not work")

    # Set the Stripe API key
    stripe.api_key = api_key
    logger.info("Stripe API key configured successfully")

    return api_key, webhook_secret


class StripeService:
    """Service for handling Stripe payments"""

    def __init__(self, db: Session):
        self.db = db
        # Initialize Stripe on first use
        if not stripe.api_key:
            _get_stripe_config()
    
    def get_or_create_customer(self, mester_id: _uuid.UUID) -> str:
        """
        Get or create a Stripe customer for a mester
        
        Args:
            mester_id: ID of the mester
            
        Returns:
            Stripe customer ID
        """
        mester = self.db.query(Mester).filter(Mester.id == mester_id).first()
        if not mester:
            raise ValueError("Mester not found")
        
        # Return existing customer if available
        if mester.stripe_customer_id:
            return mester.stripe_customer_id
        
        # Create new Stripe customer
        try:
            customer_params = {
                "name": mester.full_name,
                "metadata": {
                    "mester_id": str(mester_id),
                },
            }
            if mester.email:
                customer_params["email"] = mester.email
            
            customer = stripe.Customer.create(**customer_params)
            
            # Save customer ID to database
            mester.stripe_customer_id = customer.id
            self.db.commit()
            
            logger.info("Created Stripe customer %s for mester %s", customer.id, mester_id)
            return customer.id
            
        except Exception as e:
            logger.error("Failed to create Stripe customer: %s", e)
            raise ValueError(f"Failed to create customer: {str(e)}") from e

    async def create_payment_intent(
        self,
        mester_id: _uuid.UUID,
        request_id: _uuid.UUID,
        thread_id: Optional[_uuid.UUID] = None,
        payment_method_id: Optional[str] = None,
        save_payment_method: bool = False,
    ) -> Payment:
        """
        Create a Stripe payment intent for a lead purchase

        Args:
            mester_id: ID of the mester making the purchase
            request_id: ID of the request/lead being purchased
            thread_id: Optional message thread ID
            payment_method_id: Optional Stripe payment method ID to use
            save_payment_method: Whether to save the payment method for future use

        Returns:
            Payment record with Stripe payment intent details
        """

        # Check if lead was already purchased by this mester
        existing_purchase = (
            self.db.query(LeadPurchase)
            .filter(
                LeadPurchase.mester_id == mester_id,
                LeadPurchase.request_id == request_id,
            )
            .first()
        )

        if existing_purchase:
            raise ValueError("Lead already purchased by this mester")

        # Fetch pricing data
        request = (
            self.db.query(RequestModel).filter(RequestModel.id == request_id).first()
        )
        if not request:
            raise ValueError("Request not found")

        # Get service and pricing
        from app.models.database import Service, PriceBand, PriceBandMapping

        service = (
            self.db.query(Service).filter(Service.id == request.service_id).first()
        )
        if not service:
            raise ValueError("Service not found")

        mapping = (
            self.db.query(PriceBandMapping)
            .filter(
                PriceBandMapping.category_id == service.category_id,
                PriceBandMapping.subcategory_id == service.subcategory_id,
            )
            .first()
        )

        if not mapping:
            price_band = self.db.query(PriceBand).filter(PriceBand.code == "B").first()
        else:
            price_band = (
                self.db.query(PriceBand)
                .filter(PriceBand.id == mapping.price_band_id)
                .first()
            )

        if not price_band:
            raise ValueError("Price band not found")

        # Calculate pricing
        pricing_data = calculate_lead_price(
            price_band=price_band,
            budget_estimate=float(request.budget_estimate)
            if request.budget_estimate
            else None,
            request_created_at=request.created_at,
        )

        amount_huf = int(pricing_data["price"])

        # Stripe requires HUF amounts in fillér (1 HUF = 100 fillér)
        # Minimum is 175 HUF = 17,500 fillér
        if amount_huf < 175:
            logger.warning(
                "Calculated amount %s is below Stripe minimum of 175 HUF, adjusting", amount_huf
            )
            amount_huf = max(175, amount_huf)

        # Convert HUF to fillér (smallest currency unit)
        amount_filler = amount_huf * 100

        # Get or create Stripe customer if using saved payment method
        customer_id = None
        if payment_method_id or save_payment_method:
            customer_id = self.get_or_create_customer(mester_id)
        
        # Create Stripe Payment Intent
        try:
            # Build metadata (Stripe doesn't accept None values)
            stripe_metadata = {
                "mester_id": str(mester_id),
                "request_id": str(request_id),
                "price_band_code": pricing_data["band_code"],
            }
            if thread_id:
                stripe_metadata["thread_id"] = str(thread_id)
            if save_payment_method:
                stripe_metadata["save_payment_method"] = "true"
            
            # Build payment intent params
            intent_params = {
                "amount": amount_filler,  # Amount in fillér (smallest unit)
                "currency": "huf",
                "metadata": stripe_metadata,
                "description": f"Lead purchase for {service.name}",
            }
            
            # Add customer and payment method if provided
            if customer_id:
                intent_params["customer"] = customer_id
            
            if payment_method_id:
                intent_params["payment_method"] = payment_method_id
                intent_params["confirm"] = True  # Auto-confirm with saved payment method
                intent_params["off_session"] = True  # Allow off-session payments
            else:
                intent_params["automatic_payment_methods"] = {"enabled": True}
            
            # Setup future usage if saving payment method
            if save_payment_method and not payment_method_id:
                intent_params["setup_future_usage"] = "off_session"
            
            intent = stripe.PaymentIntent.create(**intent_params)
        except Exception as e:
            logger.error("Failed to create Stripe payment intent: %s", e)
            raise ValueError(f"Payment intent creation failed: {str(e)}") from e

        # Create payment record
        payment = Payment(
            mester_id=mester_id,
            amount=amount_filler,  # Store in fillér (smallest unit) to match Stripe
            currency="HUF",
            status=PaymentStatus.PENDING,
            stripe_payment_intent_id=intent.id,
            stripe_client_secret=intent.client_secret,
            description=f"Lead purchase: {service.name}",
            payment_metadata={
                "request_id": str(request_id),
                "thread_id": str(thread_id) if thread_id else None,
                "price_band_code": pricing_data["band_code"],
                "band_label": pricing_data["band_label"],
            },
        )

        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)

        logger.info(
            "Created payment intent %s for mester %s, amount %s HUF",
            intent.id,
            mester_id,
            amount_huf,
        )

        return payment

    async def confirm_payment(
        self,
        payment_intent_id: str,
    ) -> Payment:
        """
        Confirm a payment and create lead purchase record

        Args:
            payment_intent_id: Stripe payment intent ID

        Returns:
            Updated payment record
        """

        # Find payment record
        payment = (
            self.db.query(Payment)
            .filter(Payment.stripe_payment_intent_id == payment_intent_id)
            .first()
        )

        if not payment:
            logger.error("Payment not found for intent: %s", payment_intent_id)
            raise ValueError("Payment not found")

        # Retrieve payment intent from Stripe
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        except Exception as e:
            logger.error("Failed to retrieve payment intent %s: %s", payment_intent_id, e)
            raise ValueError(f"Failed to retrieve payment: {str(e)}") from e

        # Update payment status
        if intent.status == "succeeded":
            payment.status = PaymentStatus.SUCCEEDED
            payment.completed_at = datetime.utcnow()
            if hasattr(intent, "latest_charge") and intent.latest_charge:
                payment.stripe_charge_id = str(intent.latest_charge)
            
            # Save payment method if requested
            if (payment.payment_metadata and 
                payment.payment_metadata.get("save_payment_method") == "true" and
                intent.payment_method):
                try:
                    # Get payment method ID as string
                    pm_id = str(intent.payment_method) if intent.payment_method else None
                    if pm_id:
                        # Check if payment method is already saved
                        existing_pm = (
                            self.db.query(SavedPaymentMethod)
                            .filter(SavedPaymentMethod.stripe_payment_method_id == pm_id)
                            .first()
                        )
                        if not existing_pm:
                            self.save_payment_method(
                                mester_id=payment.mester_id,
                                stripe_payment_method_id=pm_id,
                                is_default=True,  # Set as default if it's their first saved method
                            )
                            logger.info("Saved payment method %s for mester %s", pm_id, payment.mester_id)
                except ValueError as e:
                    logger.warning("Failed to save payment method after successful payment: %s", e)
                except Exception as e:
                    logger.warning("Unexpected error saving payment method: %s", e)

            # Create lead purchase record if metadata exists
            if payment.payment_metadata:
                request_id = _uuid.UUID(payment.payment_metadata["request_id"])
                thread_id = (
                    _uuid.UUID(payment.payment_metadata["thread_id"])
                    if payment.payment_metadata.get("thread_id")
                    else None
                )

                # Check if purchase already exists (idempotency)
                existing_purchase = (
                    self.db.query(LeadPurchase)
                    .filter(
                        LeadPurchase.mester_id == payment.mester_id,
                        LeadPurchase.request_id == request_id,
                    )
                    .first()
                )

                if not existing_purchase:
                    lead_purchase = LeadPurchase(
                        payment_id=payment.id,
                        mester_id=payment.mester_id,
                        request_id=request_id,
                        thread_id=thread_id,
                        price_paid=payment.amount,
                        currency=payment.currency,
                        price_band_code=payment.payment_metadata.get("price_band_code"),
                        lead_details=payment.payment_metadata,
                    )

                    self.db.add(lead_purchase)
                    logger.info(
                        "Lead purchase created for mester %s, request %s",
                        payment.mester_id,
                        request_id,
                    )

        elif intent.status == "processing":
            payment.status = PaymentStatus.PROCESSING
        elif intent.status in ["canceled", "requires_payment_method"]:
            logger.warning("Payment %s failed: %s", payment_intent_id, intent.status)
            payment.status = PaymentStatus.FAILED

        self.db.commit()
        self.db.refresh(payment)

        return payment

    def check_lead_access(
        self,
        mester_id: _uuid.UUID,
        request_id: _uuid.UUID,
    ) -> bool:
        """
        Check if a mester has purchased access to a lead

        Args:
            mester_id: ID of the mester
            request_id: ID of the request/lead

        Returns:
            True if mester has access, False otherwise
        """

        purchase = (
            self.db.query(LeadPurchase)
            .filter(
                LeadPurchase.mester_id == mester_id,
                LeadPurchase.request_id == request_id,
            )
            .first()
        )

        return purchase is not None

    async def handle_webhook(
        self,
        payload: bytes,
        sig_header: str,
    ) -> dict:
        """
        Handle Stripe webhook events

        Args:
            payload: Raw webhook payload
            sig_header: Stripe signature header

        Returns:
            dict with event details
        """

        # Get webhook secret
        _, webhook_secret = _get_stripe_config()
        if not webhook_secret:
            raise ValueError("STRIPE_WEBHOOK_SECRET not configured")

        try:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        except ValueError as e:
            logger.error("Invalid webhook payload: %s", e)
            raise ValueError("Invalid payload") from e
        except Exception as e:
            # Catch Stripe signature verification errors
            logger.error("Invalid webhook signature: %s", e)
            raise ValueError("Invalid signature") from e

        # Handle the event
        if event.type == "payment_intent.succeeded":
            payment_intent = event.data.object
            await self.confirm_payment(payment_intent.id)
            logger.info("Payment intent succeeded: %s", payment_intent.id)

        elif event.type == "payment_intent.payment_failed":
            payment_intent = event.data.object
            payment = (
                self.db.query(Payment)
                .filter(Payment.stripe_payment_intent_id == payment_intent.id)
                .first()
            )
            if payment:
                payment.status = PaymentStatus.FAILED
                self.db.commit()
            logger.warning("Payment intent failed: %s", payment_intent.id)

        return {"status": "success", "event_type": event.type}
    
    def save_payment_method(
        self,
        mester_id: _uuid.UUID,
        stripe_payment_method_id: str,
        is_default: bool = False,
    ) -> SavedPaymentMethod:
        """
        Save a payment method for a mester
        
        Args:
            mester_id: ID of the mester
            stripe_payment_method_id: Stripe payment method ID
            is_default: Whether to set as default payment method
            
        Returns:
            Saved payment method record
        """
        # Get or create Stripe customer
        customer_id = self.get_or_create_customer(mester_id)
        
        # Attach payment method to customer
        try:
            payment_method = stripe.PaymentMethod.attach(
                stripe_payment_method_id,
                customer=customer_id,
            )
        except Exception as e:
            logger.error("Failed to attach payment method: %s", e)
            raise ValueError(f"Failed to attach payment method: {str(e)}") from e
        
        # Check if payment method already saved
        existing = (
            self.db.query(SavedPaymentMethod)
            .filter(SavedPaymentMethod.stripe_payment_method_id == stripe_payment_method_id)
            .first()
        )
        
        if existing:
            raise ValueError("Payment method already saved")
        
        # If setting as default, unset other defaults
        if is_default:
            self.db.query(SavedPaymentMethod).filter(
                SavedPaymentMethod.mester_id == mester_id,
                SavedPaymentMethod.is_default == True,
            ).update({"is_default": False})
        
        # Create saved payment method record
        saved_method = SavedPaymentMethod(
            mester_id=mester_id,
            stripe_payment_method_id=stripe_payment_method_id,
            card_brand=payment_method.card.brand if payment_method.card else None,
            card_last4=payment_method.card.last4 if payment_method.card else None,
            card_exp_month=payment_method.card.exp_month if payment_method.card else None,
            card_exp_year=payment_method.card.exp_year if payment_method.card else None,
            is_default=is_default,
        )
        
        self.db.add(saved_method)
        self.db.commit()
        self.db.refresh(saved_method)
        
        logger.info(
            "Saved payment method %s for mester %s",
            stripe_payment_method_id,
            mester_id,
        )
        
        return saved_method
    
    def list_payment_methods(
        self,
        mester_id: _uuid.UUID,
    ) -> list[SavedPaymentMethod]:
        """
        List all saved payment methods for a mester
        
        Args:
            mester_id: ID of the mester
            
        Returns:
            List of saved payment methods
        """
        payment_methods = (
            self.db.query(SavedPaymentMethod)
            .filter(SavedPaymentMethod.mester_id == mester_id)
            .order_by(SavedPaymentMethod.is_default.desc(), SavedPaymentMethod.created_at.desc())
            .all()
        )
        
        return payment_methods
    
    def delete_payment_method(
        self,
        mester_id: _uuid.UUID,
        payment_method_id: _uuid.UUID,
    ) -> None:
        """
        Delete a saved payment method
        
        Args:
            mester_id: ID of the mester
            payment_method_id: ID of the saved payment method to delete
        """
        saved_method = (
            self.db.query(SavedPaymentMethod)
            .filter(
                SavedPaymentMethod.id == payment_method_id,
                SavedPaymentMethod.mester_id == mester_id,
            )
            .first()
        )
        
        if not saved_method:
            raise ValueError("Payment method not found")
        
        # Detach from Stripe customer
        try:
            stripe.PaymentMethod.detach(saved_method.stripe_payment_method_id)
        except Exception as e:
            logger.warning("Failed to detach payment method from Stripe: %s", e)
        
        # Delete from database
        self.db.delete(saved_method)
        self.db.commit()
        
        logger.info(
            "Deleted payment method %s for mester %s",
            payment_method_id,
            mester_id,
        )
    
    def set_default_payment_method(
        self,
        mester_id: _uuid.UUID,
        payment_method_id: _uuid.UUID,
    ) -> SavedPaymentMethod:
        """
        Set a payment method as default
        
        Args:
            mester_id: ID of the mester
            payment_method_id: ID of the saved payment method to set as default
            
        Returns:
            Updated payment method record
        """
        # Unset all defaults for this mester
        self.db.query(SavedPaymentMethod).filter(
            SavedPaymentMethod.mester_id == mester_id,
            SavedPaymentMethod.is_default == True,
        ).update({"is_default": False})
        
        # Set new default
        saved_method = (
            self.db.query(SavedPaymentMethod)
            .filter(
                SavedPaymentMethod.id == payment_method_id,
                SavedPaymentMethod.mester_id == mester_id,
            )
            .first()
        )
        
        if not saved_method:
            raise ValueError("Payment method not found")
        
        saved_method.is_default = True
        self.db.commit()
        self.db.refresh(saved_method)
        
        logger.info(
            "Set payment method %s as default for mester %s",
            payment_method_id,
            mester_id,
        )
        
        return saved_method
