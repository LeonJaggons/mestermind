"""
Notification utility for creating notifications in Firestore.
Notifications are stored in Firebase Firestore and synced in real-time to clients.
Also sends email notifications using Firebase Firestore Send Email extension.
"""
import os
from typing import Optional, Dict, Any
from datetime import datetime
from firebase_admin import initialize_app, firestore, credentials
from firebase_admin.exceptions import FirebaseError
from app.utils import email_service
from app.core.config import get_settings

settings = get_settings()
DEFAULT_SITE_URL = settings.SITE_URL

# Initialize Firebase Admin SDK (only once)
_app = None
_db = None


def should_send_email(user_id: int) -> bool:
    """Check if user has email notifications enabled"""
    try:
        from app.db.session import SessionLocal
        from app.models.user import User

        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        db.close()

        if user:
            return user.email_notifications_enabled
        return True  # Default to sending if user not found
    except Exception as e:
        print(f"Error checking email preferences: {e}")
        return True  # Default to sending on error

def get_firestore_client():
    """Get or initialize Firestore client"""
    global _app, _db

    if _db is not None:
        return _db

    try:
        # Try to get the default app if it already exists
        from firebase_admin import get_app
        try:
            _app = get_app()
        except ValueError:
            # App doesn't exist yet, initialize it
            cred = None

            # Try to load service account from file (if it exists)
            import os
            service_account_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "mestermind-sa.json"
            )

            if os.path.exists(service_account_path):
                try:
                    cred = credentials.Certificate(service_account_path)
                    print(f"✓ Using Firebase service account from {service_account_path}")
                except Exception as e:
                    print(f"Warning: Could not load service account file: {e}")

            # If no service account file, try default credentials
            if not cred:
                try:
                    cred = credentials.ApplicationDefault()
                    print("✓ Using Firebase Application Default Credentials")
                except Exception:
                    print("Warning: No Firebase credentials found.")
                    print("To enable notifications:")
                    print("1. Download service account key from Firebase Console")
                    print("2. Save as server/firebase-service-account.json")
                    print("Or set GOOGLE_APPLICATION_CREDENTIALS environment variable")
                    return None

            # Initialize Firebase with credentials
            _app = initialize_app(credential=cred)

        # Get Firestore client
        _db = firestore.client()
        print("✓ Firestore client initialized successfully")
        return _db

    except Exception as e:
        print(f"Error getting Firestore client: {e}")
        return None


def create_notification(
    user_id: int,
    firebase_uid: str,
    notification_type: str,
    title: str,
    message: str,
    link: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[str]:
    """
    Create a notification in Firestore.

    Args:
        user_id: Backend user ID
        firebase_uid: Firebase UID for the user
        notification_type: Type of notification (e.g., 'appointment_created')
        title: Notification title
        message: Notification message
        link: Optional link to navigate when clicked
        metadata: Optional additional data

    Returns:
        Notification document ID if successful, None otherwise
    """
    db = get_firestore_client()
    if not db:
        print(f"Warning: Could not create notification for user {user_id} - Firestore not initialized")
        return None

    try:
        notification_data = {
            "userId": user_id,
            "firebaseUid": firebase_uid,
            "type": notification_type,
            "status": "unread",
            "title": title,
            "message": message,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "readAt": None,
        }

        if link:
            notification_data["link"] = link

        if metadata:
            notification_data["metadata"] = metadata

        doc_ref = db.collection("notifications").add(notification_data)
        return doc_ref[1].id  # Return document ID
    except FirebaseError as e:
        print(f"Error creating notification: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error creating notification: {e}")
        return None


# Helper functions for common notification types

def notify_appointment_created(
    customer_id: int,
    customer_firebase_uid: str,
    pro_id: int,
    pro_firebase_uid: str,
    appointment_id: int,
    appointment_date: str,
    appointment_time: str,
    pro_business_name: str,
    customer_email: Optional[str] = None,
    site_url: Optional[str] = None
):
    """Notify customer that an appointment was created"""
    # Create in-app notification
    create_notification(
        user_id=customer_id,
        firebase_uid=customer_firebase_uid,
        notification_type="appointment_created",
        title="New Appointment Request",
        message=f"{pro_business_name} has scheduled an appointment for {appointment_date} at {appointment_time}",
        link=f"/customer/appointments",
        metadata={"appointment_id": appointment_id, "pro_id": pro_id}
    )

    # Send email notification (only if user has emails enabled)
    if customer_email and should_send_email(customer_id):
        try:
            email_service.send_appointment_created_email(
                customer_email=customer_email,
                pro_business_name=pro_business_name,
                appointment_date=appointment_date,
                appointment_time=appointment_time,
                appointment_link=f"/customer/appointments",
                site_url=site_url or DEFAULT_SITE_URL
            )
        except Exception as e:
            print(f"Failed to send appointment created email: {e}")


def notify_appointment_confirmed(
    pro_id: int,
    pro_firebase_uid: str,
    customer_id: int,
    customer_firebase_uid: str,
    appointment_id: int,
    appointment_date: str,
    appointment_time: str,
    customer_name: str,
    pro_email: Optional[str] = None,
    customer_email: Optional[str] = None,
    site_url: Optional[str] = None
):
    """Notify pro that customer confirmed appointment"""
    # Notify pro
    create_notification(
        user_id=pro_id,
        firebase_uid=pro_firebase_uid,
        notification_type="appointment_confirmed",
        title="Appointment Confirmed",
        message=f"{customer_name} confirmed the appointment for {appointment_date} at {appointment_time}",
        link=f"/pro/appointments/{appointment_id}",
        metadata={"appointment_id": appointment_id, "customer_id": customer_id}
    )

    # Send email to pro
    if pro_email:
        try:
            email_service.send_appointment_confirmed_email(
                recipient_email=pro_email,
                recipient_name="Professional",
                appointment_date=appointment_date,
                appointment_time=appointment_time,
                appointment_link=f"/pro/appointments/{appointment_id}",
                is_customer=False,
                site_url=site_url or DEFAULT_SITE_URL
            )
        except Exception as e:
            print(f"Failed to send appointment confirmed email to pro: {e}")

    # Also notify customer
    create_notification(
        user_id=customer_id,
        firebase_uid=customer_firebase_uid,
        notification_type="appointment_confirmed",
        title="Appointment Confirmed",
        message=f"Your appointment for {appointment_date} at {appointment_time} has been confirmed",
        link=f"/customer/appointments",
        metadata={"appointment_id": appointment_id}
    )

    # Send email to customer
    if customer_email:
        try:
            email_service.send_appointment_confirmed_email(
                recipient_email=customer_email,
                recipient_name=customer_name,
                appointment_date=appointment_date,
                appointment_time=appointment_time,
                appointment_link=f"/customer/appointments",
                is_customer=True,
                site_url=site_url or DEFAULT_SITE_URL
            )
        except Exception as e:
            print(f"Failed to send appointment confirmed email to customer: {e}")


def notify_appointment_cancelled(
    pro_id: int,
    pro_firebase_uid: str,
    customer_id: int,
    customer_firebase_uid: str,
    appointment_id: int,
    cancelled_by: str,  # "customer" or "pro"
    appointment_date: str,
    appointment_time: str
):
    """Notify when appointment is cancelled"""
    if cancelled_by == "customer":
        # Notify pro
        create_notification(
            user_id=pro_id,
            firebase_uid=pro_firebase_uid,
            notification_type="appointment_cancelled",
            title="Appointment Cancelled",
            message=f"Appointment for {appointment_date} at {appointment_time} was cancelled by the customer",
            link=f"/pro/appointments/{appointment_id}",
            metadata={"appointment_id": appointment_id}
        )
    else:
        # Notify customer
        create_notification(
            user_id=customer_id,
            firebase_uid=customer_firebase_uid,
            notification_type="appointment_cancelled",
            title="Appointment Cancelled",
            message=f"Your appointment for {appointment_date} at {appointment_time} was cancelled",
            link=f"/customer/appointments",
            metadata={"appointment_id": appointment_id}
        )


def notify_appointment_completed(
    pro_id: int,
    pro_firebase_uid: str,
    customer_id: int,
    customer_firebase_uid: str,
    appointment_id: int,
    appointment_date: str
):
    """Notify when appointment is completed"""
    create_notification(
        user_id=customer_id,
        firebase_uid=customer_firebase_uid,
        notification_type="appointment_completed",
        title="Appointment Completed",
        message=f"Your appointment on {appointment_date} has been marked as completed",
        link=f"/customer/appointments",
        metadata={"appointment_id": appointment_id}
    )


def notify_job_created(
    customer_id: int,
    customer_firebase_uid: str,
    job_id: int,
    service_category: str,
    customer_email: Optional[str] = None,
    site_url: Optional[str] = None
):
    """Notify customer that their job was created"""
    # Create in-app notification
    create_notification(
        user_id=customer_id,
        firebase_uid=customer_firebase_uid,
        notification_type="job_created",
        title="Job Request Created",
        message=f"Your {service_category} job request has been created and is now open for professionals",
        link=f"/results?job_id={job_id}",
        metadata={"job_id": job_id}
    )

    # Send email notification (only if user has emails enabled)
    if customer_email and should_send_email(customer_id):
        try:
            email_service.send_job_created_email(
                customer_email=customer_email,
                service_category=service_category,
                job_link=f"/results?job_id={job_id}",
                site_url=site_url or DEFAULT_SITE_URL
            )
        except Exception as e:
            print(f"Failed to send job created email: {e}")


def notify_job_opened(
    pro_ids: list[tuple[int, str]],  # List of (pro_id, firebase_uid) tuples
    job_id: int,
    service_category: str,
    city: str,
    pro_emails: Optional[Dict[int, tuple[str, str]]] = None,  # Dict of pro_id -> (email, name)
    site_url: Optional[str] = None
):
    """Notify pros about a new job opportunity"""
    for pro_id, pro_firebase_uid in pro_ids:
        # Create in-app notification
        create_notification(
            user_id=pro_id,
            firebase_uid=pro_firebase_uid,
            notification_type="job_opened",
            title="New Job Opportunity",
            message=f"A new {service_category} job is available in {city}",
            link=f"/pro/jobs",
            metadata={"job_id": job_id, "service_category": service_category}
        )

        # Send email notification
        if pro_emails and pro_id in pro_emails:
            pro_email, pro_name = pro_emails[pro_id]
            try:
                email_service.send_new_job_opportunity_email(
                    pro_email=pro_email,
                    pro_name=pro_name,
                    service_category=service_category,
                    city=city,
                    jobs_link=f"/pro/jobs",
                    site_url=site_url or DEFAULT_SITE_URL
                )
            except Exception as e:
                print(f"Failed to send job opportunity email to pro {pro_id}: {e}")


def notify_new_message(
    recipient_id: int,
    recipient_firebase_uid: str,
    sender_name: str,
    conversation_id: int,
    is_customer: bool,
    recipient_email: Optional[str] = None,
    site_url: Optional[str] = None
):
    """Notify user about a new message"""
    link = f"/customer/messages/{conversation_id}" if is_customer else f"/pro/messages/{conversation_id}"

    # Create in-app notification (best-effort)
    try:
        create_notification(
            user_id=recipient_id,
            firebase_uid=recipient_firebase_uid,
            notification_type="new_message",
            title="New Message",
            message=f"You have a new message from {sender_name}",
            link=link,
            metadata={"conversation_id": conversation_id}
        )
    except Exception as e:
        print(f"[notify] in-app notification skipped (new_message): {e}")

    # Send email notification (only if user has emails enabled)
    if recipient_email and should_send_email(recipient_id):
        try:
            result = email_service.send_new_message_email(
                recipient_email=recipient_email,
                sender_name=sender_name,
                conversation_link=link,
                site_url=site_url or DEFAULT_SITE_URL
            )
            if not result:
                print(f"[notify] email not sent (new_message) to {recipient_email}")
        except Exception as e:
            print(f"[notify] Failed to send new message email to {recipient_email}: {e}")


def notify_lead_purchased(
    pro_id: int,
    pro_firebase_uid: str,
    job_id: int,
    service_category: str,
    pro_email: Optional[str] = None,
    pro_name: Optional[str] = None,
    lead_price_huf: Optional[int] = None,
    site_url: Optional[str] = None
):
    """Notify pro that they purchased a lead"""
    # Create in-app notification
    create_notification(
        user_id=pro_id,
        firebase_uid=pro_firebase_uid,
        notification_type="lead_purchased",
        title="Lead Purchased",
        message=f"You successfully purchased a {service_category} lead",
        link=f"/pro/messages/{job_id}",
        metadata={"job_id": job_id}
    )

    # Send email notification
    if pro_email:
        try:
            email_service.send_lead_purchased_email(
                pro_email=pro_email,
                pro_name=pro_name or "Professional",
                service_category=service_category,
                lead_price_huf=lead_price_huf or 0,
                conversation_link=f"/pro/messages/{job_id}",
                site_url=site_url or DEFAULT_SITE_URL
            )
        except Exception as e:
            print(f"Failed to send lead purchased email: {e}")


def notify_payment_received(
    pro_id: int,
    pro_firebase_uid: str,
    amount_huf: int,
    description: str,
    pro_email: Optional[str] = None,
    pro_name: Optional[str] = None,
    site_url: Optional[str] = None
):
    """Notify pro about payment received"""
    # Create in-app notification
    create_notification(
        user_id=pro_id,
        firebase_uid=pro_firebase_uid,
        notification_type="payment_received",
        title="Payment Received",
        message=f"Payment of {amount_huf} HUF received: {description}",
        link=f"/pro/payments",
        metadata={"amount_huf": amount_huf, "description": description}
    )

    # Send email notification
    if pro_email:
        try:
            email_service.send_payment_confirmation_email(
                recipient_email=pro_email,
                recipient_name=pro_name or "Professional",
                amount_huf=amount_huf,
                description=description,
                payment_link=f"/pro/payments",
                site_url=site_url or DEFAULT_SITE_URL
            )
        except Exception as e:
            print(f"Failed to send payment confirmation email: {e}")
