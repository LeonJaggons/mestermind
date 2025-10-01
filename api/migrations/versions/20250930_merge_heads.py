"""merge heads mprof_norm and prune_unused_tables

Revision ID: merge_heads_20250930
Revises: mprof_norm, prune_unused_tables
Create Date: 2025-09-30 11:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'merge_heads_20250930'
down_revision = ('mprof_norm', 'prune_unused_tables')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass


