"""add appointments and calendar management tables

Revision ID: 20251013_appointments_calendar
Revises: 20251013_appointments
Create Date: 2025-10-13

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20251013_appointments_calendar"
down_revision = "20251013_appointments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create appointment status enum
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE appointmentstatus AS ENUM (
                'confirmed', 
                'rescheduled', 
                'cancelled_by_customer', 
                'cancelled_by_mester', 
                'completed', 
                'no_show'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create reminder status enum
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE reminderstatus AS ENUM ('scheduled', 'sent', 'failed', 'cancelled');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create appointments table
    op.execute("""
        CREATE TABLE appointments (
            id UUID PRIMARY KEY,
            proposal_id UUID NOT NULL REFERENCES appointment_proposals(id),
            thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
            mester_id UUID NOT NULL REFERENCES mesters(id),
            request_id UUID NOT NULL REFERENCES requests(id),
            customer_user_id UUID NOT NULL REFERENCES users(id),
            scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
            scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
            duration_minutes INTEGER NOT NULL,
            location TEXT NOT NULL,
            location_address TEXT,
            location_coordinates VARCHAR(100),
            mester_notes TEXT,
            customer_notes TEXT,
            internal_notes TEXT,
            status appointmentstatus NOT NULL DEFAULT 'confirmed',
            cancelled_at TIMESTAMP WITH TIME ZONE,
            cancellation_reason TEXT,
            completed_at TIMESTAMP WITH TIME ZONE,
            rescheduled_from_id UUID REFERENCES appointments(id),
            rescheduled_to_id UUID REFERENCES appointments(id),
            confirmed_by_customer_at TIMESTAMP WITH TIME ZONE,
            confirmed_by_mester_at TIMESTAMP WITH TIME ZONE,
            google_calendar_event_id VARCHAR(255),
            ical_uid VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE
        )
    """)
    
    # Create mester_calendars table
    op.execute("""
        CREATE TABLE mester_calendars (
            id UUID PRIMARY KEY,
            mester_id UUID NOT NULL UNIQUE REFERENCES mesters(id),
            timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Budapest',
            default_working_hours JSONB,
            buffer_minutes INTEGER NOT NULL DEFAULT 15,
            min_advance_hours INTEGER NOT NULL DEFAULT 24,
            max_advance_days INTEGER NOT NULL DEFAULT 90,
            default_duration_minutes INTEGER NOT NULL DEFAULT 60,
            allow_online_booking BOOLEAN DEFAULT TRUE,
            google_calendar_enabled BOOLEAN DEFAULT FALSE,
            google_calendar_id VARCHAR(255),
            google_refresh_token TEXT,
            google_access_token TEXT,
            google_token_expires_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE
        )
    """)
    
    # Create mester_availability_slots table
    op.execute("""
        CREATE TABLE mester_availability_slots (
            id UUID PRIMARY KEY,
            mester_id UUID NOT NULL REFERENCES mesters(id),
            start_time TIMESTAMP WITH TIME ZONE NOT NULL,
            end_time TIMESTAMP WITH TIME ZONE NOT NULL,
            is_available BOOLEAN NOT NULL DEFAULT TRUE,
            reason VARCHAR(255),
            notes TEXT,
            is_recurring BOOLEAN DEFAULT FALSE,
            recurrence_pattern JSONB,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE
        )
    """)
    
    # Create appointment_reminders table
    op.execute("""
        CREATE TABLE appointment_reminders (
            id UUID PRIMARY KEY,
            appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
            recipient_type VARCHAR(20) NOT NULL,
            recipient_id UUID NOT NULL,
            remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
            minutes_before INTEGER NOT NULL,
            send_email BOOLEAN DEFAULT TRUE,
            send_sms BOOLEAN DEFAULT FALSE,
            send_push BOOLEAN DEFAULT TRUE,
            status reminderstatus NOT NULL DEFAULT 'scheduled',
            sent_at TIMESTAMP WITH TIME ZONE,
            error_message TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE
        )
    """)
    
    # Create indexes for appointments
    op.create_index(
        "ix_appointments_proposal_id",
        "appointments",
        ["proposal_id"],
        unique=False,
    )
    op.create_index(
        "ix_appointments_thread_id",
        "appointments",
        ["thread_id"],
        unique=False,
    )
    op.create_index(
        "ix_appointments_mester_id",
        "appointments",
        ["mester_id"],
        unique=False,
    )
    op.create_index(
        "ix_appointments_request_id",
        "appointments",
        ["request_id"],
        unique=False,
    )
    op.create_index(
        "ix_appointments_customer_user_id",
        "appointments",
        ["customer_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_appointments_scheduled_start",
        "appointments",
        ["scheduled_start"],
        unique=False,
    )
    op.create_index(
        "ix_appointments_scheduled_end",
        "appointments",
        ["scheduled_end"],
        unique=False,
    )
    op.create_index(
        "ix_appointments_status",
        "appointments",
        ["status"],
        unique=False,
    )
    op.create_index(
        "ix_appointments_created_at",
        "appointments",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        "ix_appointments_mester_date",
        "appointments",
        ["mester_id", "scheduled_start"],
        unique=False,
    )
    op.create_index(
        "ix_appointments_customer_date",
        "appointments",
        ["customer_user_id", "scheduled_start"],
        unique=False,
    )
    
    # Create indexes for mester_calendars
    op.create_index(
        "ix_mester_calendars_mester_id",
        "mester_calendars",
        ["mester_id"],
        unique=True,
    )
    
    # Create indexes for mester_availability_slots
    op.create_index(
        "ix_mester_availability_slots_mester_id",
        "mester_availability_slots",
        ["mester_id"],
        unique=False,
    )
    op.create_index(
        "ix_mester_availability_slots_start_time",
        "mester_availability_slots",
        ["start_time"],
        unique=False,
    )
    op.create_index(
        "ix_mester_availability_slots_end_time",
        "mester_availability_slots",
        ["end_time"],
        unique=False,
    )
    op.create_index(
        "ix_mester_availability_mester_time",
        "mester_availability_slots",
        ["mester_id", "start_time", "end_time"],
        unique=False,
    )
    
    # Create indexes for appointment_reminders
    op.create_index(
        "ix_appointment_reminders_appointment_id",
        "appointment_reminders",
        ["appointment_id"],
        unique=False,
    )
    op.create_index(
        "ix_appointment_reminders_remind_at",
        "appointment_reminders",
        ["remind_at"],
        unique=False,
    )
    op.create_index(
        "ix_appointment_reminders_status",
        "appointment_reminders",
        ["status"],
        unique=False,
    )
    op.create_index(
        "ix_appointment_reminders_status_time",
        "appointment_reminders",
        ["status", "remind_at"],
        unique=False,
    )


def downgrade() -> None:
    # Drop indexes for appointment_reminders
    op.drop_index("ix_appointment_reminders_status_time", table_name="appointment_reminders")
    op.drop_index("ix_appointment_reminders_status", table_name="appointment_reminders")
    op.drop_index("ix_appointment_reminders_remind_at", table_name="appointment_reminders")
    op.drop_index("ix_appointment_reminders_appointment_id", table_name="appointment_reminders")
    
    # Drop indexes for mester_availability_slots
    op.drop_index("ix_mester_availability_mester_time", table_name="mester_availability_slots")
    op.drop_index("ix_mester_availability_slots_end_time", table_name="mester_availability_slots")
    op.drop_index("ix_mester_availability_slots_start_time", table_name="mester_availability_slots")
    op.drop_index("ix_mester_availability_slots_mester_id", table_name="mester_availability_slots")
    
    # Drop indexes for mester_calendars
    op.drop_index("ix_mester_calendars_mester_id", table_name="mester_calendars")
    
    # Drop indexes for appointments
    op.drop_index("ix_appointments_customer_date", table_name="appointments")
    op.drop_index("ix_appointments_mester_date", table_name="appointments")
    op.drop_index("ix_appointments_created_at", table_name="appointments")
    op.drop_index("ix_appointments_status", table_name="appointments")
    op.drop_index("ix_appointments_scheduled_end", table_name="appointments")
    op.drop_index("ix_appointments_scheduled_start", table_name="appointments")
    op.drop_index("ix_appointments_customer_user_id", table_name="appointments")
    op.drop_index("ix_appointments_request_id", table_name="appointments")
    op.drop_index("ix_appointments_mester_id", table_name="appointments")
    op.drop_index("ix_appointments_thread_id", table_name="appointments")
    op.drop_index("ix_appointments_proposal_id", table_name="appointments")
    
    # Drop tables
    op.drop_table("appointment_reminders")
    op.drop_table("mester_availability_slots")
    op.drop_table("mester_calendars")
    op.drop_table("appointments")
    
    # Drop enum types
    op.execute("DROP TYPE IF EXISTS reminderstatus")
    op.execute("DROP TYPE IF EXISTS appointmentstatus")

