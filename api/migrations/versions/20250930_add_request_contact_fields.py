"""add contact fields to requests

Revision ID: 20250930_add_request_contact_fields
Revises: 20250930_add_mester_profiles_fix
Create Date: 2025-09-30
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'req_contact_fields'
down_revision = 'add_mester_profiles_fix'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('requests', sa.Column('contact_email', sa.String(length=255), nullable=True))
    op.add_column('requests', sa.Column('contact_phone', sa.String(length=50), nullable=True))
    op.add_column('requests', sa.Column('postal_code', sa.String(length=20), nullable=True))
    op.add_column('requests', sa.Column('message_to_pro', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('requests', 'message_to_pro')
    op.drop_column('requests', 'postal_code')
    op.drop_column('requests', 'contact_phone')
    op.drop_column('requests', 'contact_email')


