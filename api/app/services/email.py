"""
Email service for sending notifications via SendGrid
"""

import os
from typing import Optional
import httpx
import logging

logger = logging.getLogger(__name__)

# Configuration from environment variables
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@mestermind.hu")
FROM_NAME = os.getenv("FROM_NAME", "Mestermind")


async def send_email(
    to: str,
    subject: str,
    html_body: str,
    from_email: Optional[str] = None,
    from_name: Optional[str] = None,
) -> bool:
    """
    Send email via SendGrid API

    Args:
        to: Recipient email address
        subject: Email subject
        html_body: HTML content of email
        from_email: Sender email (defaults to FROM_EMAIL env var)
        from_name: Sender name (defaults to FROM_NAME env var)

    Returns:
        True if email was sent successfully, False otherwise
    """

    # Development mode: just log the email
    if not SENDGRID_API_KEY:
        logger.info(
            f"[DEV MODE] Would send email to {to}:\n"
            f"Subject: {subject}\n"
            f"Body preview: {html_body[:100]}..."
        )
        return True

    url = "https://api.sendgrid.com/v3/mail/send"

    payload = {
        "personalizations": [{"to": [{"email": to}], "subject": subject}],
        "from": {"email": from_email or FROM_EMAIL, "name": from_name or FROM_NAME},
        "content": [{"type": "text/html", "value": html_body}],
    }

    headers = {
        "Authorization": f"Bearer {SENDGRID_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)

            if response.status_code == 202:
                logger.info(f"Email sent successfully to {to}")
                return True
            else:
                logger.error(
                    f"Failed to send email to {to}. "
                    f"Status: {response.status_code}, "
                    f"Response: {response.text}"
                )
                return False

    except Exception as e:
        logger.error(f"Error sending email to {to}: {str(e)}")
        return False


async def send_sms(to: str, body: str) -> bool:
    """
    Send SMS via Twilio (optional, for future implementation)

    Args:
        to: Phone number in E.164 format
        body: SMS message body

    Returns:
        True if SMS was sent successfully, False otherwise
    """

    # TODO: Implement Twilio integration when needed
    logger.info(f"[NOT IMPLEMENTED] Would send SMS to {to}: {body}")
    return True
