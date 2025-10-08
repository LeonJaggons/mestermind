"""add request_availability table

Revision ID: 20251007_add_request_availability
Revises: 20251007_add_notifications
Create Date: 2025-10-07
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '20251007_add_request_availability'
down_revision = '20251007_add_notifications'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'request_availability',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('request_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('requests.id', ondelete='CASCADE'), nullable=False),
        sa.Column('days', sa.JSON(), nullable=False),
        sa.Column('start', sa.String(length=5), nullable=False),
        sa.Column('end', sa.String(length=5), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, onupdate=sa.text('now()')),
        sa.UniqueConstraint('request_id', name='uq_request_availability_request'),
    )
    op.create_index('ix_request_availability_request_id', 'request_availability', ['request_id'])


def downgrade() -> None:
    op.drop_index('ix_request_availability_request_id', table_name='request_availability')
    op.drop_table('request_availability')


