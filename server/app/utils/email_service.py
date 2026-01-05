"""
Email service using Postmark.

This service sends transactional emails directly via the Postmark API.
"""
import os
from typing import List, Optional, Dict, Any
import requests
from string import Template
from pathlib import Path
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.email_log import EmailLog
import json

settings = get_settings()

# Postmark configuration
POSTMARK_API_KEY = os.getenv("POSTMARK_API_KEY", settings.POSTMARK_API_KEY)
POSTMARK_FROM_EMAIL = os.getenv("POSTMARK_FROM_EMAIL", settings.POSTMARK_FROM_EMAIL)
POSTMARK_API_URL = "https://api.postmarkapp.com/email"


def send_email(
    to_emails: List[str],
    subject: str,
    text_body: str,
    html_body: Optional[str] = None,
    from_email: Optional[str] = None,
    reply_to: Optional[str] = None,
    categories: Optional[List[str]] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[str]:
    """
    Send an email via Postmark.
    
    Args:
        to_emails: List of recipient email addresses
        subject: Email subject
        text_body: Plain text email body
        html_body: Optional HTML email body (if not provided, text_body is used)
        from_email: Optional sender email (defaults to POSTMARK_FROM_EMAIL)
        reply_to: Optional reply-to email
        categories: Optional list of categories (Postmark supports single Tag)
        metadata: Optional metadata (ignored for now)
    
    Returns:
        Response JSON if successful, None otherwise
    """
    if not POSTMARK_API_KEY:
        print("Warning: POSTMARK_API_KEY not configured; email not sent")
        return None
    if not to_emails:
        print("Warning: No recipient emails provided")
        return None

    sender = from_email or POSTMARK_FROM_EMAIL
    if not sender:
        print("Warning: No from email configured; email not sent")
        return None

    payload = {
        "From": sender,
        "To": ",".join(to_emails),
        "Subject": subject,
        "TextBody": text_body,
        "HtmlBody": html_body or text_body.replace("\n", "<br>"),
        "MessageStream": "outbound",
    }

    if reply_to:
        payload["ReplyTo"] = reply_to
    if categories:
        # Postmark supports a single Tag; use the first category
        payload["Tag"] = categories[0]

    try:
        response = requests.post(
            POSTMARK_API_URL,
            json=payload,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-Postmark-Server-Token": POSTMARK_API_KEY,
            },
            timeout=10,
        )
        if response.status_code >= 400:
            print(f"[email] Postmark error {response.status_code}: {response.text}")
            _log_email(
                to_emails=to_emails,
                from_email=sender,
                subject=subject,
                status="error",
                provider_response=response.text,
                error_message=f"HTTP {response.status_code}",
            )
            return None
        print(f"[email] Postmark sent to {to_emails}: {response.text}")
        resp_json = response.json()
        _log_email(
            to_emails=to_emails,
            from_email=sender,
            subject=subject,
            status="sent",
            provider_response=json.dumps(resp_json),
            provider_message_id=resp_json.get("MessageID"),
        )
        return resp_json
    except Exception as e:
        print(f"[email] Error sending email via Postmark: {e}")
        _log_email(
            to_emails=to_emails,
            from_email=sender,
            subject=subject,
            status="error",
            error_message=str(e),
        )
        return None


def _log_email(
    to_emails: List[str],
    from_email: Optional[str],
    subject: str,
    status: str,
    provider_response: Optional[str] = None,
    provider_message_id: Optional[str] = None,
    error_message: Optional[str] = None,
):
    """
    Persist an email send attempt to the database. Best-effort; errors are swallowed.
    """
    session = SessionLocal()
    try:
        entry = EmailLog(
            to_email=",".join(to_emails),
            from_email=from_email,
            subject=subject,
            status=status,
            provider_message_id=provider_message_id,
            provider_response=provider_response,
            error_message=error_message,
        )
        session.add(entry)
        session.commit()
    except Exception as e:
        print(f"[email] Failed to log email: {e}")
        session.rollback()
    finally:
        session.close()


TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "email_templates"
BODIES_DIR = TEMPLATES_DIR / "bodies"


def render_template(template_name: str, context: Dict[str, Any]) -> str:
    """
    Render an email template from the email_templates folder using string.Template.
    """
    template_path = TEMPLATES_DIR / template_name
    if not template_path.exists():
        raise FileNotFoundError(f"Template {template_name} not found")

    raw = template_path.read_text(encoding="utf-8")
    tpl = Template(raw)
    return tpl.safe_substitute(context)


def render_body_template(body_name: str, context: Dict[str, Any]) -> str:
    """
    Render a body template from email_templates/bodies using string.Template.
    """
    template_path = BODIES_DIR / body_name
    if not template_path.exists():
        raise FileNotFoundError(f"Body template {body_name} not found")
    raw = template_path.read_text(encoding="utf-8")
    tpl = Template(raw)
    return tpl.safe_substitute(context)


def build_email_html(body: str, cta_url: Optional[str] = None, cta_label: Optional[str] = None) -> str:
    """
    Build a full HTML email by injecting body and CTA into the base template.
    """
    cta_block = ""
    if cta_url and cta_label:
        cta_block = f'<a href="{cta_url}" class="cta">{cta_label}</a>'

    base_context = {
        "content": body,
        "cta_block": cta_block,
        "year": 2024,
    }
    return render_template("base.html", base_context)


# Email template functions for different notification types

def send_new_message_email(
    recipient_email: str,
    sender_name: str,
    conversation_link: str,
    site_url: str = "https://mestermind.com"
) -> Optional[str]:
    """Send email notification for new message"""
    subject = f"New message from {sender_name}"
    
    text_body = f"""You have a new message from {sender_name} on Mestermind.

View and reply to the message:
{site_url}{conversation_link}

Thank you,
The Mestermind Team"""
    
    body_html = render_body_template(
        "new_message.html",
        {"sender_name": sender_name},
    )
    html_body = build_email_html(
        body=body_html,
        cta_url=f"{site_url}{conversation_link}",
        cta_label="View Message",
    )
    
    return send_email(
        to_emails=[recipient_email],
        subject=subject,
        text_body=text_body,
        html_body=html_body,
        categories=["new_message"]
    )


def send_appointment_created_email(
    customer_email: str,
    pro_business_name: str,
    appointment_date: str,
    appointment_time: str,
    appointment_link: str,
    site_url: str = "https://mestermind.com"
) -> Optional[str]:
    """Send email notification when appointment is created"""
    subject = f"New appointment request from {pro_business_name}"
    
    text_body = f"""{pro_business_name} has scheduled an appointment with you.

Date: {appointment_date}
Time: {appointment_time}

Please confirm or modify this appointment:
{site_url}{appointment_link}

Thank you,
The Mestermind Team"""
    
    body_html = render_body_template(
        "appointment_created.html",
        {
            "pro_business_name": pro_business_name,
            "appointment_date": appointment_date,
            "appointment_time": appointment_time,
        },
    )
    html_body = build_email_html(
        body=body_html,
        cta_url=f"{site_url}{appointment_link}",
        cta_label="View Appointment",
    )
    
    return send_email(
        to_emails=[customer_email],
        subject=subject,
        text_body=text_body,
        html_body=html_body,
        categories=["appointment_created"]
    )


def send_appointment_confirmed_email(
    recipient_email: str,
    recipient_name: str,
    appointment_date: str,
    appointment_time: str,
    appointment_link: str,
    is_customer: bool = True,
    site_url: str = "https://mestermind.com"
) -> Optional[str]:
    """Send email notification when appointment is confirmed"""
    if is_customer:
        subject = "Your appointment has been confirmed"
        greeting = "Your appointment has been confirmed!"
    else:
        subject = f"Appointment confirmed by {recipient_name}"
        greeting = f"{recipient_name} has confirmed the appointment."
    
    text_body = f"""{greeting}

Date: {appointment_date}
Time: {appointment_time}

View appointment details:
{site_url}{appointment_link}

Thank you,
The Mestermind Team"""
    
    body_html = render_body_template(
        "appointment_confirmed.html",
        {
            "greeting": greeting,
            "appointment_date": appointment_date,
            "appointment_time": appointment_time,
        },
    )
    html_body = build_email_html(
        body=body_html,
        cta_url=f"{site_url}{appointment_link}",
        cta_label="View Appointment",
    )
    
    return send_email(
        to_emails=[recipient_email],
        subject=subject,
        text_body=text_body,
        html_body=html_body,
        categories=["appointment_confirmed"]
    )


def send_appointment_reminder_email(
    recipient_email: str,
    recipient_name: str,
    pro_business_name: str,
    appointment_date: str,
    appointment_time: str,
    appointment_link: str,
    reminder_type: str = "24h",  # "24h" or "1h"
    site_url: str = "https://mestermind.com"
) -> Optional[str]:
    """Send appointment reminder email"""
    if reminder_type == "24h":
        subject = f"Reminder: Appointment tomorrow with {pro_business_name}"
        time_text = "tomorrow"
    else:
        subject = f"Reminder: Appointment in 1 hour with {pro_business_name}"
        time_text = "in 1 hour"
    
    text_body = f"""Reminder: You have an appointment {time_text}

Professional: {pro_business_name}
Date: {appointment_date}
Time: {appointment_time}

View appointment details:
{site_url}{appointment_link}

Thank you,
The Mestermind Team"""
    
    body_html = render_body_template(
        "appointment_reminder.html",
        {
            "time_text": time_text,
            "pro_business_name": pro_business_name,
            "appointment_date": appointment_date,
            "appointment_time": appointment_time,
        },
    )
    html_body = build_email_html(
        body=body_html,
        cta_url=f"{site_url}{appointment_link}",
        cta_label="View Appointment",
    )
    
    return send_email(
        to_emails=[recipient_email],
        subject=subject,
        text_body=text_body,
        html_body=html_body,
        categories=["appointment_reminder", f"reminder_{reminder_type}"]
    )


def send_job_created_email(
    customer_email: str,
    service_category: str,
    job_link: str,
    site_url: str = "https://mestermind.com"
) -> Optional[str]:
    """Send email notification when job is created"""
    subject = f"Your {service_category} job request has been posted"
    
    text_body = f"""Your {service_category} job request has been created and is now open for professionals to view.

View your job posting:
{site_url}{job_link}

Professionals will be able to contact you about your job. You'll receive notifications when they message you.

Thank you,
The Mestermind Team"""
    
    body_html = render_body_template(
        "job_created.html",
        {"service_category": service_category},
    )
    html_body = build_email_html(
        body=body_html,
        cta_url=f"{site_url}{job_link}",
        cta_label="View Job Posting",
    )
    
    return send_email(
        to_emails=[customer_email],
        subject=subject,
        text_body=text_body,
        html_body=html_body,
        categories=["job_created"]
    )


def send_new_job_opportunity_email(
    pro_email: str,
    pro_name: str,
    service_category: str,
    city: str,
    jobs_link: str,
    site_url: str = "https://mestermind.com"
) -> Optional[str]:
    """Send email notification about new job opportunity"""
    subject = f"New {service_category} job opportunity in {city}"
    
    text_body = f"""Hi {pro_name},

A new {service_category} job is available in {city}.

View available jobs:
{site_url}{jobs_link}

Thank you,
The Mestermind Team"""
    
    body_html = render_body_template(
        "job_opportunity.html",
        {
            "pro_name": pro_name,
            "service_category": service_category,
            "city": city,
        },
    )
    html_body = build_email_html(
        body=body_html,
        cta_url=f"{site_url}{jobs_link}",
        cta_label="View Available Jobs",
    )
    
    return send_email(
        to_emails=[pro_email],
        subject=subject,
        text_body=text_body,
        html_body=html_body,
        categories=["job_opportunity"]
    )


def send_lead_purchased_email(
    pro_email: str,
    pro_name: str,
    service_category: str,
    lead_price_huf: int,
    conversation_link: str,
    site_url: str = "https://mestermind.com"
) -> Optional[str]:
    """Send email confirmation when lead is purchased"""
    subject = f"Lead purchased - {service_category} job"
    
    text_body = f"""Hi {pro_name},

You successfully purchased a {service_category} lead for {lead_price_huf:,} HUF.

You now have access to the customer's contact information. Start the conversation:
{site_url}{conversation_link}

Thank you,
The Mestermind Team"""
    
    body_html = render_body_template(
        "lead_purchased.html",
        {
            "pro_name": pro_name,
            "service_category": service_category,
            "lead_price_huf": f"{lead_price_huf:,}",
        },
    )
    html_body = build_email_html(
        body=body_html,
        cta_url=f"{site_url}{conversation_link}",
        cta_label="Start Conversation",
    )
    
    return send_email(
        to_emails=[pro_email],
        subject=subject,
        text_body=text_body,
        html_body=html_body,
        categories=["lead_purchased", "payment"]
    )


def send_payment_confirmation_email(
    recipient_email: str,
    recipient_name: str,
    amount_huf: int,
    description: str,
    payment_link: str,
    site_url: str = "https://mestermind.com"
) -> Optional[str]:
    """Send email confirmation for payment"""
    subject = f"Payment confirmation - {amount_huf:,} HUF"
    
    text_body = f"""Hi {recipient_name},

Payment confirmed: {amount_huf:,} HUF
Description: {description}

View payment details:
{site_url}{payment_link}

Thank you,
The Mestermind Team"""
    
    body_html = render_body_template(
        "payment_confirmation.html",
        {
            "recipient_name": recipient_name,
            "amount_huf": f"{amount_huf:,}",
            "description": description,
        },
    )
    html_body = build_email_html(
        body=body_html,
        cta_url=f"{site_url}{payment_link}",
        cta_label="View Payment Details",
    )
    
    return send_email(
        to_emails=[recipient_email],
        subject=subject,
        text_body=text_body,
        html_body=html_body,
        categories=["payment_confirmation"]
    )


def send_review_request_email(
    customer_email: str,
    customer_name: str,
    pro_business_name: str,
    job_description: str,
    review_link: str,
    site_url: str = "https://mestermind.com"
) -> Optional[str]:
    """Send email requesting review after job completion"""
    subject = f"How was your experience with {pro_business_name}?"
    
    text_body = f"""Hi {customer_name},

We hope you had a great experience with {pro_business_name} for your {job_description} job.

Your feedback helps other customers find great professionals. Please take a moment to leave a review:
{site_url}{review_link}

Thank you,
The Mestermind Team"""
    
    body_html = render_body_template(
        "review_request.html",
        {
            "customer_name": customer_name,
            "pro_business_name": pro_business_name,
            "job_description": job_description,
        },
    )
    html_body = build_email_html(
        body=body_html,
        cta_url=f"{site_url}{review_link}",
        cta_label="Leave a Review",
    )
    
    return send_email(
        to_emails=[customer_email],
        subject=subject,
        text_body=text_body,
        html_body=html_body,
        categories=["review_request"]
    )

