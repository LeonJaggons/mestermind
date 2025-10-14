"""add appointment proposals table

Revision ID: 20251013_appointments
Revises: 20251012_payments
Create Date: 2025-10-13

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20251013_appointments"
down_revision = "20251012_payments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create appointment_proposal_status enum using raw SQL to avoid duplication issues
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE appointmentproposalstatus AS ENUM ('proposed', 'accepted', 'rejected', 'cancelled', 'expired');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create appointment_proposals table with raw SQL to avoid enum type duplication issues
    op.execute("""
        CREATE TABLE appointment_proposals (
            id UUID PRIMARY KEY,
            thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
            mester_id UUID NOT NULL REFERENCES mesters(id),
            request_id UUID NOT NULL REFERENCES requests(id),
            customer_user_id UUID REFERENCES users(id),
            proposed_date TIMESTAMP WITH TIME ZONE NOT NULL,
            duration_minutes INTEGER,
            location TEXT,
            notes TEXT,
            status appointmentproposalstatus NOT NULL,
            response_message TEXT,
            responded_at TIMESTAMP WITH TIME ZONE,
            expires_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE
        )
    """)
    
    # Create indexes
    op.create_index(
        "ix_appointment_proposals_thread_id",
        "appointment_proposals",
        ["thread_id"],
        unique=False,
    )
    op.create_index(
        "ix_appointment_proposals_mester_id",
        "appointment_proposals",
        ["mester_id"],
        unique=False,
    )
    op.create_index(
        "ix_appointment_proposals_request_id",
        "appointment_proposals",
        ["request_id"],
        unique=False,
    )
    op.create_index(
        "ix_appointment_proposals_customer_user_id",
        "appointment_proposals",
        ["customer_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_appointment_proposals_status",
        "appointment_proposals",
        ["status"],
        unique=False,
    )
    op.create_index(
        "ix_appointment_proposals_created_at",
        "appointment_proposals",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        "ix_appointment_proposals_thread_status",
        "appointment_proposals",
        ["thread_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_appointment_proposals_mester_status",
        "appointment_proposals",
        ["mester_id", "status"],
        unique=False,
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_appointment_proposals_mester_status", table_name="appointment_proposals")
    op.drop_index("ix_appointment_proposals_thread_status", table_name="appointment_proposals")
    op.drop_index("ix_appointment_proposals_created_at", table_name="appointment_proposals")
    op.drop_index("ix_appointment_proposals_status", table_name="appointment_proposals")
    op.drop_index("ix_appointment_proposals_customer_user_id", table_name="appointment_proposals")
    op.drop_index("ix_appointment_proposals_request_id", table_name="appointment_proposals")
    op.drop_index("ix_appointment_proposals_mester_id", table_name="appointment_proposals")
    op.drop_index("ix_appointment_proposals_thread_id", table_name="appointment_proposals")
    
    # Drop table
    op.drop_table("appointment_proposals")
    
    # Drop enum type
    op.execute("DROP TYPE IF EXISTS appointmentproposalstatus")

