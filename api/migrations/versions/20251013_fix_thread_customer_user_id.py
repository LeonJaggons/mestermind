"""fix thread customer user id

Revision ID: 20251013_fix_thread_customer
Revises: 20251013_appointments
Create Date: 2025-10-13

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '20251013_fix_thread_customer'
down_revision = '20251013_appointments'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Update message_threads to set customer_user_id from requests.user_id where it's NULL
    op.execute("""
        UPDATE message_threads mt
        SET customer_user_id = r.user_id
        FROM requests r
        WHERE mt.request_id = r.id
        AND mt.customer_user_id IS NULL
        AND r.user_id IS NOT NULL
    """)
    
    # Update appointment_proposals to set customer_user_id from requests.user_id where it's NULL
    op.execute("""
        UPDATE appointment_proposals ap
        SET customer_user_id = r.user_id
        FROM requests r
        WHERE ap.request_id = r.id
        AND ap.customer_user_id IS NULL
        AND r.user_id IS NOT NULL
    """)


def downgrade() -> None:
    # No downgrade - we don't want to set customer_user_id back to NULL
    pass

