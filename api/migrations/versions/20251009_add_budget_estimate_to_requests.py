"""add budget_estimate to requests

Revision ID: 20251009_add_budget_estimate
Revises: 20251007_add_request_availability
Create Date: 2025-10-09
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251009_add_budget_estimate'
down_revision = '20251007_add_request_availability'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'requests',
        sa.Column('budget_estimate', sa.Numeric(precision=10, scale=2), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('requests', 'budget_estimate')



