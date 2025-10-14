"""
Notification service for creating and sending notifications
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select
import uuid as _uuid
from datetime import datetime, timedelta
from fastapi import BackgroundTasks
import logging

from app.models.database import (
    Notification,
    NotificationPreference,
    NotificationLog,
    NotificationType,
    NotificationChannel,
    Request,
    Mester,
    MesterService,
    User,
    Service,
)
from app.services.email import send_email, send_sms

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for creating and sending notifications"""

    def __init__(self, db: Session):
        self.db = db

    async def notify_new_request(
        self, request_id: _uuid.UUID, background_tasks: BackgroundTasks
    ) -> List[Notification]:
        """
        Notify professionals about a new request matching their services.
        Called when request status changes from DRAFT to OPEN.

        Args:
            request_id: UUID of the request
            background_tasks: FastAPI background tasks for async operations

        Returns:
            List of created notifications
        """
        # 1. Fetch the request
        request = self.db.query(Request).filter(Request.id == request_id).first()
        if not request:
            logger.warning(f"Request {request_id} not found for notifications")
            return []

        # 2. Find matching professionals
        matching_mesters = self._find_matching_mesters(request)

        if not matching_mesters:
            logger.info(f"No matching mesters found for request {request_id}")
            return []

        # 3. Fetch service details for notification content
        service = (
            self.db.query(Service).filter(Service.id == request.service_id).first()
        )
        if not service:
            logger.warning(f"Service {request.service_id} not found")
            return []

        notifications = []

        for mester in matching_mesters:
            # Check if professional wants this notification
            if not self._should_notify(mester.id, NotificationType.NEW_REQUEST):
                logger.info(
                    f"Skipping notification for mester {mester.id} (preferences)"
                )
                continue

            # Create in-app notification
            notification = await self._create_notification_async(
                mester_id=mester.id,
                user_id=mester.user_id if mester.user_id else None,  # Include mester's user_id
                notification_type=NotificationType.NEW_REQUEST,
                title=f"New {service.name} lead in {request.postal_code or 'your area'}",
                body=self._build_request_body(request, service),
                request_id=request.id,
                action_url=f"/pro/requests/{request.id}",
                data={
                    "service_id": str(request.service_id),
                    "service_name": service.name,
                    "postal_code": request.postal_code,
                    "distance_km": None,  # Calculate if you have geo data
                },
            )
            notifications.append(notification)

            # Queue async notifications
            prefs = self._get_preferences(mester_id=mester.id)

            if prefs.get("new_request", {}).get("email", True):
                background_tasks.add_task(
                    self._send_email_notification,
                    mester=mester,
                    notification=notification,
                    request=request,
                    service=service,
                )

            if prefs.get("new_request", {}).get("sms", False):
                background_tasks.add_task(
                    self._send_sms_notification,
                    mester=mester,
                    notification=notification,
                )

        logger.info(
            f"Created {len(notifications)} notifications for request {request_id}"
        )
        return notifications

    async def notify_new_offer(
        self, offer_id: _uuid.UUID, background_tasks: BackgroundTasks
    ) -> Optional[Notification]:
        """
        Notify a user when they receive a new offer from a professional.

        Args:
            offer_id: UUID of the offer
            background_tasks: FastAPI background tasks for async operations

        Returns:
            Created notification or None if user not found
        """
        from app.models.database import Offer

        # 1. Fetch the offer
        offer = self.db.query(Offer).filter(Offer.id == offer_id).first()
        if not offer:
            logger.warning(f"Offer {offer_id} not found for notifications")
            return None

        # 2. Fetch the related request to get user_id
        request = self.db.query(Request).filter(Request.id == offer.request_id).first()
        if not request:
            logger.warning(f"Request {offer.request_id} not found for offer {offer_id}")
            return None

        if not request.user_id:
            logger.warning(f"Request {request.request_id} has no user_id")
            return None

        # 3. Fetch the user
        user = self.db.query(User).filter(User.id == request.user_id).first()
        if not user:
            logger.warning(f"User {request.user_id} not found")
            return None

        # 4. Fetch the mester who sent the offer
        mester = self.db.query(Mester).filter(Mester.id == offer.mester_id).first()
        if not mester:
            logger.warning(f"Mester {offer.mester_id} not found")
            return None

        # 5. Fetch service details for notification content
        service = (
            self.db.query(Service).filter(Service.id == request.service_id).first()
        )
        if not service:
            logger.warning(f"Service {request.service_id} not found")
            return None

        # 6. Check if user wants this notification
        if not self._should_notify_user(request.user_id, NotificationType.NEW_OFFER):
            logger.info(
                f"Skipping notification for user {request.user_id} (preferences)"
            )
            return None

        # 7. Create in-app notification
        notification = await self._create_notification_async(
            mester_id=None,
            user_id=request.user_id,
            notification_type=NotificationType.NEW_OFFER,
            title=f"New quote from {mester.full_name}",
            body=f"You received a quote of {offer.price} {offer.currency} for your {service.name} request.",
            request_id=request.id,
            offer_id=offer.id,
            action_url=f"/tasks",  # Or specific offer page
            data={
                "offer_id": str(offer.id),
                "mester_id": str(mester.id),
                "mester_name": mester.full_name,
                "price": float(offer.price),
                "currency": offer.currency,
                "service_name": service.name,
            },
        )

        # 8. Queue async notifications (email)
        prefs = self._get_preferences(user_id=request.user_id)

        if prefs.get("new_offer", {}).get("email", True):
            background_tasks.add_task(
                self._send_offer_email_notification,
                user=user,
                notification=notification,
                offer=offer,
                mester=mester,
                service=service,
            )

        logger.info(
            f"Created notification for offer {offer_id} to user {request.user_id}"
        )
        return notification

    async def notify_new_message(
        self, message_id: _uuid.UUID, background_tasks: BackgroundTasks
    ) -> Optional[Notification]:
        """
        Notify a user or mester when they receive a new message.

        Args:
            message_id: UUID of the message
            background_tasks: FastAPI background tasks for async operations

        Returns:
            Created notification or None if recipient not found
        """
        from app.models.database import Message, MessageThread

        # 1. Fetch the message
        message = self.db.query(Message).filter(Message.id == message_id).first()
        if not message:
            logger.warning(f"Message {message_id} not found for notifications")
            return None

        # 2. Fetch the thread
        thread = self.db.query(MessageThread).filter(MessageThread.id == message.thread_id).first()
        if not thread:
            logger.warning(f"Thread {message.thread_id} not found for message {message_id}")
            return None

        # 3. Determine recipient based on sender
        recipient_user_id = None
        recipient_mester_id = None
        sender_name = "Someone"
        
        if message.sender_type == "customer":
            # Message from customer, notify mester
            recipient_mester_id = thread.mester_id
            
            # Try to get customer name from request first, then user
            req = self.db.query(Request).filter(Request.id == thread.request_id).first()
            if req and req.first_name and req.last_name:
                sender_name = f"{req.first_name} {req.last_name}".strip()
            elif req and req.first_name:
                sender_name = req.first_name.strip()
            elif thread.customer_user_id:
                user = self.db.query(User).filter(User.id == thread.customer_user_id).first()
                if user:
                    sender_name = f"{user.first_name} {user.last_name}".strip() or "Customer"
            else:
                sender_name = "Customer"
        else:
            # Message from mester, notify customer
            recipient_user_id = thread.customer_user_id
            mester = self.db.query(Mester).filter(Mester.id == thread.mester_id).first()
            if mester:
                sender_name = mester.full_name or "Professional"

        if not recipient_user_id and not recipient_mester_id:
            logger.warning(f"No recipient found for message {message_id}")
            return None

        # 4. Check if recipient wants this notification
        if recipient_user_id:
            if not self._should_notify_user(recipient_user_id, NotificationType.NEW_MESSAGE):
                logger.info(f"Skipping notification for user {recipient_user_id} (preferences)")
                return None
        elif recipient_mester_id:
            if not self._should_notify(recipient_mester_id, NotificationType.NEW_MESSAGE):
                logger.info(f"Skipping notification for mester {recipient_mester_id} (preferences)")
                return None

        # 5. Determine if content should be masked for mesters (customer messages after first mester reply)
        from app.models.database import Message as MessageModel

        masked_for_mester = False
        if recipient_mester_id and message.sender_type == "customer":
            mester_prior_replies = (
                self.db.query(MessageModel)
                .filter(
                    MessageModel.thread_id == thread.id,
                    MessageModel.sender_type == "mester",
                    MessageModel.created_at <= message.created_at,
                )
                .count()
            )
            masked_for_mester = mester_prior_replies >= 1

        # 6. Build safe preview body
        if recipient_mester_id and masked_for_mester:
            preview_body = "New customer message — continue to view in Mestermind"
        else:
            preview_body = message.body[:100] + ("..." if len(message.body) > 100 else "")

        # 7. Create in-app notification with role-aware action URL
        action_url = "/messages" if recipient_user_id else "/pro/messages"
        notification = await self._create_notification_async(
            mester_id=recipient_mester_id,
            user_id=recipient_user_id,
            notification_type=NotificationType.NEW_MESSAGE,
            title=f"New message from {sender_name}",
            body=preview_body,
            request_id=thread.request_id,
            message_id=message.id,
            action_url=action_url,  # Customer -> /messages, Mester -> /pro/messages
            data={
                "message_id": str(message.id),
                "thread_id": str(thread.id),
                "sender_type": message.sender_type,
                "sender_name": sender_name,
                "masked": bool(recipient_mester_id and masked_for_mester),
            },
        )

        # 6. Queue async notifications (email)
        if recipient_user_id:
            prefs = self._get_preferences(user_id=recipient_user_id)
            if prefs.get("new_message", {}).get("email", True):
                background_tasks.add_task(
                    self._send_message_email_notification,
                    user_id=recipient_user_id,
                    notification=notification,
                    message=message,
                    sender_name=sender_name,
                )
        else:
            prefs = self._get_preferences(mester_id=recipient_mester_id)
            if prefs.get("new_message", {}).get("email", True):
                background_tasks.add_task(
                    self._send_message_email_notification,
                    mester_id=recipient_mester_id,
                    notification=notification,
                    message=message,
                    sender_name=sender_name,
                )

        logger.info(
            f"Created notification for message {message_id} to {'user' if recipient_user_id else 'mester'} {recipient_user_id or recipient_mester_id}"
        )
        return notification

    async def notify_appointment_proposal(
        self, proposal_id: _uuid.UUID, background_tasks: BackgroundTasks
    ) -> Optional[Notification]:
        """
        Notify a customer when they receive a new appointment proposal.

        Args:
            proposal_id: UUID of the appointment proposal
            background_tasks: FastAPI background tasks for async operations

        Returns:
            Created notification or None if customer not found
        """
        from app.models.database import AppointmentProposal, MessageThread

        # Fetch the proposal
        proposal = (
            self.db.query(AppointmentProposal)
            .filter(AppointmentProposal.id == proposal_id)
            .first()
        )
        if not proposal:
            logger.warning(f"Proposal {proposal_id} not found for notifications")
            return None

        if not proposal.customer_user_id:
            logger.warning(f"Proposal {proposal_id} has no customer_user_id")
            return None

        # Fetch the mester
        mester = self.db.query(Mester).filter(Mester.id == proposal.mester_id).first()
        if not mester:
            logger.warning(f"Mester {proposal.mester_id} not found")
            return None

        # Fetch the thread to get request info
        thread = (
            self.db.query(MessageThread)
            .filter(MessageThread.id == proposal.thread_id)
            .first()
        )
        if not thread:
            logger.warning(f"Thread {proposal.thread_id} not found")
            return None

        # Format date
        from datetime import datetime

        proposal_date = proposal.proposed_date.strftime("%B %d, %Y at %I:%M %p") if proposal.proposed_date else "TBD"
        
        # Get price from linked offer
        price_text = ""
        if proposal.offer:
            price_formatted = f"{int(proposal.offer.price):,} {proposal.offer.currency or 'HUF'}"
            price_text = f" for {price_formatted}"

        # Check if customer wants this notification
        if not self._should_notify_user(
            proposal.customer_user_id, NotificationType.BOOKING_CONFIRMED
        ):
            logger.info(
                f"Skipping notification for user {proposal.customer_user_id} (preferences)"
            )
            return None

        # Create in-app notification
        notification = await self._create_notification_async(
            mester_id=None,
            user_id=proposal.customer_user_id,
            notification_type=NotificationType.BOOKING_CONFIRMED,
            title=f"Appointment proposal from {mester.full_name}",
            body=f"{mester.full_name} proposed an appointment for {proposal_date}{price_text}",
            request_id=thread.request_id,
            action_url=f"/messages/{thread.id}",
            data={
                "proposal_id": str(proposal.id),
                "thread_id": str(thread.id),
                "mester_id": str(mester.id),
                "mester_name": mester.full_name,
                "proposed_date": proposal.proposed_date.isoformat()
                if proposal.proposed_date
                else None,
                "duration_minutes": proposal.duration_minutes,
                "location": proposal.location,
                "price": float(proposal.offer.price) if proposal.offer else None,
                "currency": proposal.offer.currency if proposal.offer else None,
                "offer_message": proposal.offer.message if proposal.offer else None,
            },
        )

        # Queue async email notification
        prefs = self._get_preferences(user_id=proposal.customer_user_id)
        if prefs.get("booking_confirmed", {}).get("email", True):
            background_tasks.add_task(
                self._send_appointment_proposal_email,
                proposal=proposal,
                mester=mester,
                notification=notification,
            )

        logger.info(
            f"Created notification for appointment proposal {proposal_id} to user {proposal.customer_user_id}"
        )
        return notification

    async def _send_appointment_proposal_email(
        self, proposal, mester: Mester, notification: Notification
    ):
        """Send email notification for new appointment proposal"""
        try:
            # Get customer email
            user = (
                self.db.query(User)
                .filter(User.id == proposal.customer_user_id)
                .first()
            )
            if not user or not user.email:
                logger.warning(f"No email found for user {proposal.customer_user_id}")
                return

            proposal_date = (
                proposal.proposed_date.strftime("%B %d, %Y at %I:%M %p")
                if proposal.proposed_date
                else "TBD"
            )

            subject = f"Appointment Proposal from {mester.full_name} - Mestermind"

            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Appointment Proposal</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                    .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                    .proposal-box {{ background: white; border: 2px solid #4F46E5; border-radius: 8px; padding: 20px; margin: 20px 0; }}
                    .button {{ display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }}
                    .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📅 New Appointment Proposal</h1>
                    </div>
                    <div class="content">
                        <p>Hi {user.first_name or "there"},</p>

                        <p><strong>{mester.full_name}</strong> has proposed an appointment for your service request!</p>

                        <div class="proposal-box">
                            <h3>Appointment Details:</h3>
                            <p><strong>Date & Time:</strong> {proposal_date}</p>
                            <p><strong>Duration:</strong> {proposal.duration_minutes} minutes</p>
                            {f'<p><strong>Location:</strong> {proposal.location}</p>' if proposal.location else ''}
                            {f'<p><strong>Notes:</strong> {proposal.notes}</p>' if proposal.notes else ''}
                        </div>

                        <p style="text-align: center;">
                            <a href="https://mestermind.hu{notification.action_url}" class="button">
                                View & Respond to Proposal
                            </a>
                        </p>

                        <p style="color: #666; font-size: 14px;">
                            You can accept or suggest changes to this appointment from your messages.
                        </p>
                    </div>
                    <div class="footer">
                        <p>
                            <a href="https://mestermind.hu/settings/notifications">
                                Update your notification preferences
                            </a>
                        </p>
                        <p>© 2025 Mestermind. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """

            # Send via email provider
            success = await send_email(
                to=user.email, subject=subject, html_body=html_body
            )

            # Log success/failure
            self._log_notification(
                notification_id=notification.id,
                channel=NotificationChannel.EMAIL,
                recipient=user.email,
                status="sent" if success else "failed",
                error_message=None if success else "Email send failed",
            )

        except Exception as e:
            logger.error(
                f"Error sending appointment proposal email to {user.email}: {str(e)}"
            )
            self._log_notification(
                notification_id=notification.id,
                channel=NotificationChannel.EMAIL,
                recipient=user.email if user else "unknown",
                status="failed",
                error_message=str(e),
            )

    async def notify_appointment_accepted(
        self, proposal_id: _uuid.UUID, background_tasks: BackgroundTasks
    ) -> Optional[Notification]:
        """
        Notify a mester when customer accepts their appointment proposal.

        Args:
            proposal_id: UUID of the appointment proposal
            background_tasks: FastAPI background tasks for async operations

        Returns:
            Created notification or None if mester not found
        """
        from app.models.database import AppointmentProposal, MessageThread

        # Fetch the proposal
        proposal = (
            self.db.query(AppointmentProposal)
            .filter(AppointmentProposal.id == proposal_id)
            .first()
        )
        if not proposal:
            logger.warning(f"Proposal {proposal_id} not found for notifications")
            return None

        # Fetch the mester
        mester = self.db.query(Mester).filter(Mester.id == proposal.mester_id).first()
        if not mester:
            logger.warning(f"Mester {proposal.mester_id} not found")
            return None

        # Fetch the thread to get request info
        thread = (
            self.db.query(MessageThread)
            .filter(MessageThread.id == proposal.thread_id)
            .first()
        )
        if not thread:
            logger.warning(f"Thread {proposal.thread_id} not found")
            return None

        # Get customer name - try request first, then user
        customer_name = "Customer"
        
        # First, try to get name from the request
        req = (
            self.db.query(Request)
            .filter(Request.id == thread.request_id)
            .first()
        )
        if req and req.first_name and req.last_name:
            customer_name = f"{req.first_name} {req.last_name}".strip()
        elif req and req.first_name:
            customer_name = req.first_name.strip()
        elif proposal.customer_user_id:
            # Fallback to user table
            user = (
                self.db.query(User)
                .filter(User.id == proposal.customer_user_id)
                .first()
            )
            if user:
                customer_name = f"{user.first_name} {user.last_name}".strip() or "Customer"

        # Format date
        proposal_date = (
            proposal.proposed_date.strftime("%B %d, %Y at %I:%M %p")
            if proposal.proposed_date
            else "TBD"
        )

        # Check if mester wants this notification
        if not self._should_notify(
            proposal.mester_id, NotificationType.BOOKING_CONFIRMED
        ):
            logger.info(
                f"Skipping notification for mester {proposal.mester_id} (preferences)"
            )
            return None

        # Get mester's user_id for notification
        mester_user_id = mester.user_id if mester.user_id else None

        # Create in-app notification
        notification = await self._create_notification_async(
            mester_id=proposal.mester_id,
            user_id=mester_user_id,  # Include mester's user_id so they see it when logged in
            notification_type=NotificationType.BOOKING_CONFIRMED,
            title=f"Appointment confirmed with {customer_name}",
            body=f"{customer_name} accepted your appointment proposal for {proposal_date}",
            request_id=thread.request_id,
            action_url=f"/pro/messages/{thread.id}",
            data={
                "proposal_id": str(proposal.id),
                "thread_id": str(thread.id),
                "customer_user_id": str(proposal.customer_user_id)
                if proposal.customer_user_id
                else None,
                "customer_name": customer_name,
                "proposed_date": proposal.proposed_date.isoformat()
                if proposal.proposed_date
                else None,
                "duration_minutes": proposal.duration_minutes,
                "location": proposal.location,
            },
        )

        # Queue async email notification
        prefs = self._get_preferences(mester_id=proposal.mester_id)
        if prefs.get("booking_confirmed", {}).get("email", True):
            background_tasks.add_task(
                self._send_appointment_accepted_email,
                proposal=proposal,
                mester=mester,
                customer_name=customer_name,
                notification=notification,
            )

        logger.info(
            f"Created notification for appointment acceptance {proposal_id} to mester {proposal.mester_id}"
        )
        return notification

    async def _send_appointment_accepted_email(
        self, proposal, mester: Mester, customer_name: str, notification: Notification
    ):
        """Send email notification when appointment is accepted"""
        try:
            if not mester.email:
                logger.warning(f"Mester {mester.id} has no email address")
                return

            proposal_date = (
                proposal.proposed_date.strftime("%B %d, %Y at %I:%M %p")
                if proposal.proposed_date
                else "TBD"
            )

            subject = f"Appointment Confirmed with {customer_name} - Mestermind"

            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Appointment Confirmed</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                    .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                    .confirmation-box {{ background: white; border: 2px solid #10B981; border-radius: 8px; padding: 20px; margin: 20px 0; }}
                    .button {{ display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }}
                    .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Appointment Confirmed!</h1>
                    </div>
                    <div class="content">
                        <p>Hi {mester.full_name},</p>

                        <p>Great news! <strong>{customer_name}</strong> has accepted your appointment proposal!</p>

                        <div class="confirmation-box">
                            <h3>Confirmed Appointment:</h3>
                            <p><strong>Customer:</strong> {customer_name}</p>
                            <p><strong>Date & Time:</strong> {proposal_date}</p>
                            <p><strong>Duration:</strong> {proposal.duration_minutes} minutes</p>
                            {f'<p><strong>Location:</strong> {proposal.location}</p>' if proposal.location else ''}
                            {f'<p><strong>Response:</strong> {proposal.response_message}</p>' if proposal.response_message else ''}
                        </div>

                        <p style="text-align: center;">
                            <a href="https://mestermind.hu{notification.action_url}" class="button">
                                View Appointment Details
                            </a>
                        </p>

                        <p style="color: #666; font-size: 14px;">
                            💡 <strong>Tip:</strong> Make sure to prepare for the appointment and arrive on time to provide excellent service!
                        </p>
                    </div>
                    <div class="footer">
                        <p>
                            <a href="https://mestermind.hu/pro/settings/notifications">
                                Update your notification preferences
                            </a>
                        </p>
                        <p>© 2025 Mestermind. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """

            # Send via email provider
            success = await send_email(
                to=mester.email, subject=subject, html_body=html_body
            )

            # Log success/failure
            self._log_notification(
                notification_id=notification.id,
                channel=NotificationChannel.EMAIL,
                recipient=mester.email,
                status="sent" if success else "failed",
                error_message=None if success else "Email send failed",
            )

        except Exception as e:
            logger.error(
                f"Error sending appointment accepted email to {mester.email}: {str(e)}"
            )
            self._log_notification(
                notification_id=notification.id,
                channel=NotificationChannel.EMAIL,
                recipient=mester.email if mester else "unknown",
                status="failed",
                error_message=str(e),
            )

    def _should_notify_user(
        self, user_id: _uuid.UUID, notification_type: NotificationType
    ) -> bool:
        """Check if user wants this notification type"""
        prefs = self._get_preferences(user_id=user_id)

        # Check quiet hours
        if self._in_quiet_hours(prefs):
            return False

        return True

    def _find_matching_mesters(self, request: Request) -> List[Mester]:
        """Find professionals who offer the requested service in the area"""
        # Get mesters who offer this service
        query = (
            select(Mester)
            .join(MesterService)
            .where(
                MesterService.service_id == request.service_id,
                MesterService.is_active == True,  # noqa: E712
                Mester.is_active == True,  # noqa: E712
            )
        )

        # TODO: Add geographic filtering based on request.postal_code
        # and mester coverage areas for better targeting

        mesters = self.db.execute(query).scalars().all()
        return list(mesters)

    async def _create_notification_async(
        self,
        mester_id: Optional[_uuid.UUID],
        notification_type: NotificationType,
        title: str,
        body: str,
        request_id: Optional[_uuid.UUID] = None,
        offer_id: Optional[_uuid.UUID] = None,
        message_id: Optional[_uuid.UUID] = None,
        action_url: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        user_id: Optional[_uuid.UUID] = None,
    ) -> Notification:
        """Create an in-app notification and broadcast via WebSocket"""
        notification = Notification(
            mester_id=mester_id,
            user_id=user_id,
            type=notification_type,
            title=title,
            body=body,
            request_id=request_id,
            offer_id=offer_id,
            message_id=message_id,
            action_url=action_url,
            data=data,
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        logger.info(f"Created notification {notification.id} for {'user' if user_id else 'mester'} {user_id or mester_id}")
        
        # Broadcast notification via WebSocket
        await self._broadcast_notification_ws(notification)
        
        return notification
    
    def _create_notification(
        self,
        mester_id: Optional[_uuid.UUID],
        notification_type: NotificationType,
        title: str,
        body: str,
        request_id: Optional[_uuid.UUID] = None,
        offer_id: Optional[_uuid.UUID] = None,
        message_id: Optional[_uuid.UUID] = None,
        action_url: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        user_id: Optional[_uuid.UUID] = None,
    ) -> Notification:
        """Create an in-app notification (sync version without WebSocket broadcast)"""
        notification = Notification(
            mester_id=mester_id,
            user_id=user_id,
            type=notification_type,
            title=title,
            body=body,
            request_id=request_id,
            offer_id=offer_id,
            message_id=message_id,
            action_url=action_url,
            data=data,
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        logger.info(f"Created notification {notification.id} for {'user' if user_id else 'mester'} {user_id or mester_id}")
        return notification
    
    async def _broadcast_notification_ws(self, notification: Notification):
        """Broadcast notification via WebSocket"""
        try:
            from app.services.websocket import manager
            
            ws_notification = {
                "type": "notification",
                "data": {
                    "id": str(notification.id),
                    "notification_type": notification.type.value,
                    "title": notification.title,
                    "body": notification.body,
                    "request_id": str(notification.request_id) if notification.request_id else None,
                    "offer_id": str(notification.offer_id) if notification.offer_id else None,
                    "message_id": str(notification.message_id) if notification.message_id else None,
                    "action_url": notification.action_url,
                    "data": notification.data,
                    "is_read": notification.is_read,
                    "created_at": notification.created_at.isoformat() if notification.created_at else None,
                }
            }
            
            # Send to appropriate recipient
            if notification.user_id:
                await manager.send_to_user(str(notification.user_id), ws_notification)
            elif notification.mester_id:
                await manager.send_to_mester(str(notification.mester_id), ws_notification)
                
        except Exception as e:
            logger.error(f"Error broadcasting notification via WebSocket: {e}")

    def _should_notify(
        self, mester_id: _uuid.UUID, notification_type: NotificationType
    ) -> bool:
        """Check if mester wants this notification type"""
        prefs = self._get_preferences(mester_id=mester_id)

        # Check quiet hours
        if self._in_quiet_hours(prefs):
            return False

        return True

    def _get_preferences(
        self,
        mester_id: Optional[_uuid.UUID] = None,
        user_id: Optional[_uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """Get notification preferences for a user/mester"""
        query = self.db.query(NotificationPreference)

        if mester_id:
            query = query.filter(NotificationPreference.mester_id == mester_id)
        elif user_id:
            query = query.filter(NotificationPreference.user_id == user_id)
        else:
            return self._get_default_preferences()

        pref = query.first()

        if pref:
            return pref.preferences

        # Return defaults
        return self._get_default_preferences()

    def _get_default_preferences(self) -> Dict[str, Any]:
        """Get default notification preferences"""
        return {
            "new_request": {"email": True, "in_app": True, "sms": False},
            "new_offer": {"email": True, "in_app": True, "sms": False},
            "new_message": {"email": True, "in_app": True, "sms": False},
            "booking_confirmed": {"email": True, "in_app": True, "sms": True},
        }

    def _in_quiet_hours(self, prefs: Dict[str, Any]) -> bool:
        """Check if current time is in user's quiet hours"""
        # TODO: Implement quiet hours logic based on user timezone
        # This would require storing user timezone preference
        return False

    def _build_request_body(self, request: Request, service: Service) -> str:
        """Build notification body text"""
        answers_summary = ""
        if request.answers:
            # Extract key info from answers
            timeline = request.answers.get("timeline", {})
            if isinstance(timeline, dict):
                timeline_value = timeline.get("value", "Not specified")
            else:
                timeline_value = str(timeline)
            answers_summary = f"Timeline: {timeline_value}"

        body = f"New {service.name} request"
        if answers_summary:
            body += f". {answers_summary}"
        body += ". Click to view details and send a quote."

        return body

    async def _send_email_notification(
        self,
        mester: Mester,
        notification: Notification,
        request: Request,
        service: Service,
    ):
        """Send email notification (async)"""
        if not mester.email:
            logger.warning(f"Mester {mester.id} has no email address")
            return

        try:
            # Build email content
            subject = notification.title

            # Extract customer info
            customer_name = "A customer"
            if request.first_name:
                customer_name = request.first_name
                if request.last_name:
                    customer_name += f" {request.last_name}"

            # Build answer summary
            answer_items = []
            if request.answers:
                for key, value in request.answers.items():
                    if key == "timeline":
                        continue  # Already shown
                    if isinstance(value, dict):
                        val = value.get("value", "")
                    else:
                        val = value
                    if val:
                        answer_items.append(f"<li><strong>{key}:</strong> {val}</li>")

            answers_html = ""
            if answer_items:
                answers_html = f"<ul>{''.join(answer_items[:5])}</ul>"

            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                    .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
                    .button {{
                        display: inline-block;
                        background: #2563eb;
                        color: white;
                        padding: 14px 28px;
                        text-decoration: none;
                        border-radius: 6px;
                        font-weight: bold;
                        margin: 20px 0;
                    }}
                    .details {{ background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }}
                    .footer {{ color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0;">🔔 New Lead Available!</h1>
                    </div>
                    <div class="content">
                        <h2>New {service.name} Request</h2>
                        <p>{customer_name} is looking for {service.name} services in your area!</p>

                        <div class="details">
                            <h3>Job Details:</h3>
                            <ul>
                                <li><strong>Service:</strong> {service.name}</li>
                                <li><strong>Location:</strong> {request.postal_code or "Not specified"}</li>
                                <li><strong>Timeline:</strong> {request.answers.get("timeline", {}).get("value", "Not specified") if request.answers else "Not specified"}</li>
                            </ul>

                            {f"<h4>Additional Details:</h4>{answers_html}" if answer_items else ""}

                            {f"<p><strong>Message from customer:</strong><br>{request.message_to_pro}</p>" if request.message_to_pro else ""}
                        </div>

                        <p style="text-align: center;">
                            <a href="https://mestermind.hu{notification.action_url}" class="button">
                                View Request & Send Quote
                            </a>
                        </p>

                        <p style="color: #666; font-size: 14px;">
                            <strong>💡 Tip:</strong> Respond quickly to increase your chances of winning this job.
                            Customers typically choose professionals who respond within the first few hours.
                        </p>

                        <div class="footer">
                            <p>
                                Don't want these emails?
                                <a href="https://mestermind.hu/pro/settings/notifications">
                                    Update your notification preferences
                                </a>
                            </p>
                            <p>© 2025 Mestermind. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """

            # Send via email provider
            success = await send_email(
                to=mester.email, subject=subject, html_body=html_body
            )

            # Log success/failure
            self._log_notification(
                notification_id=notification.id,
                channel=NotificationChannel.EMAIL,
                recipient=mester.email,
                status="sent" if success else "failed",
                error_message=None if success else "Email send failed",
            )

        except Exception as e:
            logger.error(
                f"Error sending email notification to {mester.email}: {str(e)}"
            )
            # Log failure
            self._log_notification(
                notification_id=notification.id,
                channel=NotificationChannel.EMAIL,
                recipient=mester.email,
                status="failed",
                error_message=str(e),
            )

    async def _send_offer_email_notification(
        self,
        user: User,
        notification: Notification,
        offer,
        mester: Mester,
        service: Service,
    ):
        """Send email notification to user when they receive an offer"""
        if not user.email:
            logger.warning(f"User {user.id} has no email address")
            return

        try:
            # Build email content
            subject = notification.title

            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #4F46E5; color: white; padding: 20px; text-align: center; }}
                    .content {{ background-color: #f9fafb; padding: 20px; }}
                    .offer-box {{ background-color: white; border: 2px solid #4F46E5; border-radius: 8px; padding: 20px; margin: 20px 0; }}
                    .price {{ font-size: 32px; font-weight: bold; color: #4F46E5; }}
                    .button {{ display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }}
                    .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 You received a new quote!</h1>
                    </div>
                    <div class="content">
                        <p>Hi {user.first_name or "there"},</p>

                        <p>Great news! <strong>{mester.full_name}</strong> has sent you a quote for your <strong>{service.name}</strong> request.</p>

                        <div class="offer-box">
                            <p style="margin: 0; color: #666; font-size: 14px;">Quote Amount</p>
                            <p class="price">{offer.price:,.0f} {offer.currency}</p>

                            {f'<p style="margin-top: 15px;"><strong>Message from the pro:</strong></p><p style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 10px 0;">{offer.message}</p>' if offer.message else ""}
                        </div>

                        <p>This quote is valid until {offer.expires_at.strftime("%B %d, %Y")}.</p>

                        <a href="https://mestermind.hu/tasks" class="button">View Quote & Respond</a>

                        <p style="margin-top: 30px; font-size: 14px; color: #666;">
                            You can review this quote, ask questions, or accept it from your dashboard.
                        </p>
                    </div>
                    <div class="footer">
                        <p>
                            <a href="https://mestermind.hu/settings/notifications">
                                Update your notification preferences
                            </a>
                        </p>
                        <p>© 2025 Mestermind. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """

            # Send via email provider
            success = await send_email(
                to=user.email, subject=subject, html_body=html_body
            )

            # Log success/failure
            self._log_notification(
                notification_id=notification.id,
                channel=NotificationChannel.EMAIL,
                recipient=user.email,
                status="sent" if success else "failed",
                error_message=None if success else "Email send failed",
            )

        except Exception as e:
            logger.error(
                f"Error sending offer email notification to {user.email}: {str(e)}"
            )
            self._log_notification(
                notification_id=notification.id,
                channel=NotificationChannel.EMAIL,
                recipient=user.email,
                status="failed",
                error_message=str(e),
            )

    async def _send_message_email_notification(
        self,
        notification: Notification,
        message,
        sender_name: str,
        user_id: Optional[_uuid.UUID] = None,
        mester_id: Optional[_uuid.UUID] = None,
    ):
        """Send email notification for new message"""
        try:
            # Get recipient email
            recipient_email = None
            recipient_name = None
            
            if user_id:
                user = self.db.query(User).filter(User.id == user_id).first()
                if user:
                    recipient_email = user.email
                    recipient_name = f"{user.first_name} {user.last_name}".strip() or "Customer"
            elif mester_id:
                mester = self.db.query(Mester).filter(Mester.id == mester_id).first()
                if mester:
                    recipient_email = mester.email
                    recipient_name = mester.full_name or "Professional"

            if not recipient_email:
                logger.warning(f"No email found for {'user' if user_id else 'mester'} {user_id or mester_id}")
                return

            subject = f"New message from {sender_name} - Mestermind"
            
            # Mask message body for mesters when required
            masked = bool(notification.data and notification.data.get("masked"))

            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>New Message - Mestermind</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: #3b82f6; color: white; padding: 20px; text-align: center; }}
                    .content {{ padding: 20px; background: #f9f9f9; }}
                    .message {{ background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }}
                    .button {{ display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }}
                    .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>New Message</h1>
                    </div>
                    <div class="content">
                        <p>Hi {recipient_name},</p>
                        <p>You have received a new message from <strong>{sender_name}</strong>:</p>
                        <div class="message">
                            <p>{('New customer message — continue to view in Mestermind' if masked and mester_id else message.body)}</p>
                        </div>
                        <p>
                            <a href="https://mestermind.hu{notification.action_url}" class="button">
                                View Message
                            </a>
                        </p>
                        <p>
                            You can respond to this message directly from your Mestermind dashboard.
                        </p>
                    </div>
                    <div class="footer">
                        <p>
                            <a href="https://mestermind.hu/settings/notifications">
                                Update your notification preferences
                            </a>
                        </p>
                        <p>© 2025 Mestermind. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """

            # Send via email provider
            success = await send_email(
                to=recipient_email, subject=subject, html_body=html_body
            )

            # Log success/failure
            self._log_notification(
                notification_id=notification.id,
                channel=NotificationChannel.EMAIL,
                recipient=recipient_email or "unknown",
                status="sent" if success else "failed",
                error_message=None if success else "Email send failed",
            )

        except Exception as e:
            logger.error(
                f"Error sending message email notification to {recipient_email}: {str(e)}"
            )
            self._log_notification(
                notification_id=notification.id,
                channel=NotificationChannel.EMAIL,
                recipient=recipient_email or "unknown",
                status="failed",
                error_message=str(e),
            )

    async def _send_sms_notification(self, mester: Mester, notification: Notification):
        """Send SMS notification (async, optional)"""
        if not mester.phone:
            logger.warning(f"Mester {mester.id} has no phone number")
            return

        try:
            message = f"{notification.title}. View: https://mestermind.hu{notification.action_url}"

            success = await send_sms(to=mester.phone, body=message)

            self._log_notification(
                notification_id=notification.id,
                channel=NotificationChannel.SMS,
                recipient=mester.phone,
                status="sent" if success else "failed",
            )

        except Exception as e:
            logger.error(f"Error sending SMS notification to {mester.phone}: {str(e)}")
            self._log_notification(
                notification_id=notification.id,
                channel=NotificationChannel.SMS,
                recipient=mester.phone or "unknown",
                status="failed",
                error_message=str(e),
            )

    def _log_notification(
        self,
        notification_id: _uuid.UUID,
        channel: NotificationChannel,
        recipient: str,
        status: str,
        error_message: Optional[str] = None,
    ):
        """Log sent notification"""
        log = NotificationLog(
            notification_id=notification_id,
            channel=channel,
            recipient=recipient,
            status=status,
            error_message=error_message,
        )
        self.db.add(log)
        self.db.commit()
        logger.info(f"Logged {channel.value} notification to {recipient}: {status}")
