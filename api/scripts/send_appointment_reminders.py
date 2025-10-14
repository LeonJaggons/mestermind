"""
Background worker to send appointment reminders

This script should be run periodically (e.g., every 5 minutes via cron) to:
1. Find reminders that need to be sent
2. Send notifications via email/push/SMS
3. Mark reminders as sent or failed

Usage:
    python scripts/send_appointment_reminders.py
"""

import sys
import os
from pathlib import Path

# Add the parent directory to the path so we can import from app
sys.path.insert(0, str(Path(__file__).parent.parent))

import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.services.appointments import AppointmentService
from app.services.notifications import NotificationService
from app.models.database import Appointment, User, Mester

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def send_reminder_email(reminder, appointment, recipient):
    """Send reminder via email"""
    # TODO: Implement email sending using your email service
    logger.info(
        f"Would send email reminder to {recipient.email if hasattr(recipient, 'email') else 'recipient'} "
        f"for appointment {appointment.id}"
    )
    # Placeholder - implement actual email sending
    return True


def send_reminder_push(reminder, appointment, recipient_id):
    """Send reminder via push notification"""
    # TODO: Implement push notification via Firebase or your notification service
    logger.info(
        f"Would send push notification to {recipient_id} for appointment {appointment.id}"
    )
    # Placeholder - implement actual push notification
    return True


def send_reminder_sms(reminder, appointment, phone_number):
    """Send reminder via SMS"""
    # TODO: Implement SMS sending using Twilio or similar service
    logger.info(
        f"Would send SMS to {phone_number} for appointment {appointment.id}"
    )
    # Placeholder - implement actual SMS sending
    return True


def process_reminder(db: Session, reminder, appointment_service: AppointmentService):
    """Process a single reminder"""
    
    try:
        # Get the appointment
        appointment = appointment_service.get_appointment(reminder.appointment_id)
        if not appointment:
            logger.error(f"Appointment {reminder.appointment_id} not found for reminder {reminder.id}")
            appointment_service.mark_reminder_sent(reminder.id, "Appointment not found")
            return
        
        # Get recipient details
        if reminder.recipient_type == "customer":
            recipient = db.query(User).filter(User.id == reminder.recipient_id).first()
        else:  # mester
            recipient = db.query(Mester).filter(Mester.id == reminder.recipient_id).first()
        
        if not recipient:
            logger.error(f"Recipient {reminder.recipient_id} not found for reminder {reminder.id}")
            appointment_service.mark_reminder_sent(reminder.id, "Recipient not found")
            return
        
        # Format reminder message
        time_str = appointment.scheduled_start.strftime("%Y-%m-%d at %H:%M")
        hours_before = reminder.minutes_before // 60
        
        if hours_before >= 24:
            days = hours_before // 24
            time_desc = f"{days} day{'s' if days > 1 else ''}"
        else:
            time_desc = f"{hours_before} hour{'s' if hours_before > 1 else ''}"
        
        subject = f"Appointment Reminder - {time_desc} notice"
        message = f"""
        You have an upcoming appointment on {time_str}.
        
        Location: {appointment.location}
        Duration: {appointment.duration_minutes} minutes
        
        {'Mester notes: ' + appointment.mester_notes if appointment.mester_notes else ''}
        {'Customer notes: ' + appointment.customer_notes if appointment.customer_notes else ''}
        """
        
        # Send notifications
        errors = []
        
        if reminder.send_email:
            try:
                send_reminder_email(reminder, appointment, recipient)
            except Exception as e:
                logger.error(f"Failed to send email for reminder {reminder.id}: {e}")
                errors.append(f"Email: {str(e)}")
        
        if reminder.send_push:
            try:
                send_reminder_push(reminder, appointment, reminder.recipient_id)
            except Exception as e:
                logger.error(f"Failed to send push for reminder {reminder.id}: {e}")
                errors.append(f"Push: {str(e)}")
        
        if reminder.send_sms:
            try:
                phone = getattr(recipient, 'phone', None)
                if phone:
                    send_reminder_sms(reminder, appointment, phone)
                else:
                    errors.append("SMS: No phone number")
            except Exception as e:
                logger.error(f"Failed to send SMS for reminder {reminder.id}: {e}")
                errors.append(f"SMS: {str(e)}")
        
        # Mark as sent or failed
        if errors:
            error_msg = "; ".join(errors)
            appointment_service.mark_reminder_sent(reminder.id, error_msg)
            logger.warning(f"Reminder {reminder.id} sent with errors: {error_msg}")
        else:
            appointment_service.mark_reminder_sent(reminder.id)
            logger.info(f"Successfully sent reminder {reminder.id}")
        
    except Exception as e:
        logger.error(f"Error processing reminder {reminder.id}: {e}")
        appointment_service.mark_reminder_sent(reminder.id, str(e))


def main():
    """Main function to process pending reminders"""
    
    logger.info("Starting appointment reminder worker...")
    
    db = SessionLocal()
    try:
        appointment_service = AppointmentService(db)
        
        # Get pending reminders
        cutoff_time = datetime.now(timezone.utc)
        reminders = appointment_service.get_pending_reminders(cutoff_time)
        
        logger.info(f"Found {len(reminders)} reminders to send")
        
        for reminder in reminders:
            process_reminder(db, reminder, appointment_service)
        
        logger.info("Finished processing reminders")
        
    except Exception as e:
        logger.error(f"Error in reminder worker: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()

