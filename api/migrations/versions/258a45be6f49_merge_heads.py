"""merge_heads

Revision ID: 258a45be6f49
Revises: 20251007_add_request_availability, d6ef9272f77d
Create Date: 2025-10-08 18:22:57.584562

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '258a45be6f49'
down_revision = ('20251007_add_request_availability', 'd6ef9272f77d')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
