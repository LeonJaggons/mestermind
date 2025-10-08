"""merge_notifications_and_offers

Revision ID: b5ac40eaf1f8
Revises: 20251004_add_offers, 20251007_add_notifications
Create Date: 2025-10-07 07:51:51.155240

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b5ac40eaf1f8'
down_revision = ('20251004_add_offers', '20251007_add_notifications')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
