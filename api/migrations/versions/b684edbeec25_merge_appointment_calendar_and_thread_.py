"""merge appointment calendar and thread fix

Revision ID: b684edbeec25
Revises: 20251013_appointments_calendar, 20251013_fix_thread_customer
Create Date: 2025-10-13 06:01:55.517453

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b684edbeec25'
down_revision = ('20251013_appointments_calendar', '20251013_fix_thread_customer')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
