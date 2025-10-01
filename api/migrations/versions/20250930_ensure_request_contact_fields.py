"""ensure request contact fields exist

Revision ID: ensure_req_contact_fields
Revises: merge_heads_20250930
Create Date: 2025-09-30 11:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ensure_req_contact_fields'
down_revision = 'merge_heads_20250930'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c['name'] for c in inspector.get_columns('requests')}

    if 'contact_email' not in cols:
        op.add_column('requests', sa.Column('contact_email', sa.String(length=255), nullable=True))
    if 'contact_phone' not in cols:
        op.add_column('requests', sa.Column('contact_phone', sa.String(length=50), nullable=True))
    if 'postal_code' not in cols:
        op.add_column('requests', sa.Column('postal_code', sa.String(length=20), nullable=True))
    if 'message_to_pro' not in cols:
        op.add_column('requests', sa.Column('message_to_pro', sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c['name'] for c in inspector.get_columns('requests')}

    if 'message_to_pro' in cols:
        op.drop_column('requests', 'message_to_pro')
    if 'postal_code' in cols:
        op.drop_column('requests', 'postal_code')
    if 'contact_phone' in cols:
        op.drop_column('requests', 'contact_phone')
    if 'contact_email' in cols:
        op.drop_column('requests', 'contact_email')


