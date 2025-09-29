"""Add common_names field to districts

Revision ID: 39ce33d675e5
Revises: add_question_sets
Create Date: 2025-09-29 03:39:09.796416

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '39ce33d675e5'
down_revision = 'add_question_sets'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add common_names field to districts table
    op.add_column('districts', sa.Column('common_names', sa.JSON(), nullable=True))


def downgrade() -> None:
    # Remove common_names field from districts table
    op.drop_column('districts', 'common_names')