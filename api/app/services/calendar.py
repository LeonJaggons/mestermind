"""
Calendar integration service for Google Calendar and iCal
"""

import logging
from typing import Optional, List
from datetime import datetime, timedelta
import uuid as _uuid
from icalendar import Calendar, Event as ICalEvent
from pytz import timezone as pytz_timezone

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.database import (
    Appointment,
    MesterCalendar,
)

logger = logging.getLogger(__name__)


class CalendarService:
    """Service for calendar integration and export"""

    def __init__(self, db: Session):
        self.db = db

    def generate_ical(
        self,
        appointments: List[Appointment],
        calendar_name: str = "Mestermind Appointments",
    ) -> str:
        """
        Generate iCal format string from appointments
        
        Args:
            appointments: List of appointments to export
            calendar_name: Name of the calendar
            
        Returns:
            iCal formatted string
        """
        
        cal = Calendar()
        cal.add('prodid', '-//Mestermind//Appointments//EN')
        cal.add('version', '2.0')
        cal.add('x-wr-calname', calendar_name)
        cal.add('x-wr-timezone', 'Europe/Budapest')
        
        for apt in appointments:
            event = ICalEvent()
            
            # Use existing ical_uid or generate new one
            uid = apt.ical_uid or f"apt-{apt.id}@mestermind.com"
            event.add('uid', uid)
            
            event.add('summary', f"Appointment - {apt.location}")
            event.add('dtstart', apt.scheduled_start)
            event.add('dtend', apt.scheduled_end)
            
            # Location
            if apt.location_address:
                event.add('location', apt.location_address)
            else:
                event.add('location', apt.location)
            
            # Description with notes
            description_parts = []
            if apt.mester_notes:
                description_parts.append(f"Mester notes: {apt.mester_notes}")
            if apt.customer_notes:
                description_parts.append(f"Customer notes: {apt.customer_notes}")
            
            if description_parts:
                event.add('description', "\n\n".join(description_parts))
            
            # Status mapping
            status_map = {
                'confirmed': 'CONFIRMED',
                'cancelled_by_customer': 'CANCELLED',
                'cancelled_by_mester': 'CANCELLED',
                'completed': 'CONFIRMED',
                'no_show': 'CANCELLED',
            }
            event.add('status', status_map.get(apt.status.value, 'CONFIRMED'))
            
            # Timestamps
            event.add('created', apt.created_at)
            if apt.updated_at:
                event.add('last-modified', apt.updated_at)
            
            cal.add_component(event)
        
        return cal.to_ical().decode('utf-8')

    def export_appointment_ical(
        self,
        appointment_id: _uuid.UUID,
    ) -> str:
        """Export a single appointment as iCal"""
        
        appointment = (
            self.db.query(Appointment)
            .filter(Appointment.id == appointment_id)
            .first()
        )
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        return self.generate_ical([appointment])

    def export_mester_calendar_ical(
        self,
        mester_id: _uuid.UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> str:
        """
        Export all appointments for a mester as iCal
        
        Args:
            mester_id: Mester ID
            start_date: Optional start date filter
            end_date: Optional end date filter
            
        Returns:
            iCal formatted string
        """
        
        query = self.db.query(Appointment).filter(
            Appointment.mester_id == mester_id
        )
        
        if start_date:
            query = query.filter(Appointment.scheduled_start >= start_date)
        
        if end_date:
            query = query.filter(Appointment.scheduled_start <= end_date)
        
        appointments = query.order_by(Appointment.scheduled_start.asc()).all()
        
        return self.generate_ical(appointments, f"Mestermind - Mester Calendar")

    def export_customer_calendar_ical(
        self,
        customer_user_id: _uuid.UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> str:
        """
        Export all appointments for a customer as iCal
        
        Args:
            customer_user_id: Customer user ID
            start_date: Optional start date filter
            end_date: Optional end date filter
            
        Returns:
            iCal formatted string
        """
        
        query = self.db.query(Appointment).filter(
            Appointment.customer_user_id == customer_user_id
        )
        
        if start_date:
            query = query.filter(Appointment.scheduled_start >= start_date)
        
        if end_date:
            query = query.filter(Appointment.scheduled_start <= end_date)
        
        appointments = query.order_by(Appointment.scheduled_start.asc()).all()
        
        return self.generate_ical(appointments, f"Mestermind - My Appointments")

    # Google Calendar Integration (placeholder for future implementation)
    # These would require Google Calendar API setup and OAuth flow
    
    def connect_google_calendar(
        self,
        mester_id: _uuid.UUID,
        auth_code: str,
    ) -> MesterCalendar:
        """
        Connect mester calendar to Google Calendar
        
        This is a placeholder for future Google Calendar OAuth implementation.
        Requires:
        - Google Calendar API credentials
        - OAuth 2.0 flow implementation
        - Token storage and refresh logic
        """
        
        # TODO: Implement Google Calendar OAuth flow
        # 1. Exchange auth_code for access token and refresh token
        # 2. Store tokens in MesterCalendar
        # 3. Get calendar list and let mester select one
        # 4. Store calendar ID
        
        raise HTTPException(
            status_code=501,
            detail="Google Calendar integration not yet implemented"
        )

    def sync_to_google_calendar(
        self,
        appointment_id: _uuid.UUID,
    ) -> str:
        """
        Sync an appointment to Google Calendar
        
        This is a placeholder for future implementation.
        Would create/update an event in Google Calendar and return event ID.
        """
        
        # TODO: Implement Google Calendar sync
        # 1. Get mester's Google Calendar credentials
        # 2. Refresh access token if needed
        # 3. Create/update event in Google Calendar
        # 4. Store google_calendar_event_id in appointment
        # 5. Return event ID
        
        raise HTTPException(
            status_code=501,
            detail="Google Calendar sync not yet implemented"
        )

    def remove_from_google_calendar(
        self,
        appointment_id: _uuid.UUID,
    ) -> None:
        """
        Remove an appointment from Google Calendar
        
        This is a placeholder for future implementation.
        Would delete the event from Google Calendar.
        """
        
        # TODO: Implement Google Calendar event deletion
        # 1. Get appointment with google_calendar_event_id
        # 2. Get mester's Google Calendar credentials
        # 3. Refresh access token if needed
        # 4. Delete event from Google Calendar
        # 5. Clear google_calendar_event_id from appointment
        
        raise HTTPException(
            status_code=501,
            detail="Google Calendar removal not yet implemented"
        )

