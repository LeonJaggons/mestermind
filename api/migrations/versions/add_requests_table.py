"""add requests table

Revision ID: add_requests
Revises: 39ce33d675e5
Create Date: 2025-09-29 00:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'add_requests'
down_revision = '39ce33d675e5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('service_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('services.id'), nullable=False, index=True),
        sa.Column('question_set_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('question_sets.id'), nullable=False, index=True),
        sa.Column('place_id', sa.String(length=255), nullable=True),
        sa.Column('current_step', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('answers', sa.JSON(), nullable=True),
        sa.Column('status', postgresql.ENUM('draft', 'submitted', name='requeststatus', create_type=False), nullable=False, server_default='draft'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('requests')

