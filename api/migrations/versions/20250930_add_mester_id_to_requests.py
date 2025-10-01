"""add mester_id to requests

Revision ID: add_req_mester_id
Revises: ensure_req_contact_fields
Create Date: 2025-09-30 11:20:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'add_req_mester_id'
down_revision = 'ensure_req_contact_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('requests', sa.Column('mester_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index('ix_requests_mester_id', 'requests', ['mester_id'])
    op.create_foreign_key('fk_requests_mester_id', 'requests', 'mesters', ['mester_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_requests_mester_id', 'requests', type_='foreignkey')
    op.drop_index('ix_requests_mester_id', table_name='requests')
    op.drop_column('requests', 'mester_id')


