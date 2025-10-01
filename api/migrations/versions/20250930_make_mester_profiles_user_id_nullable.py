"""make mester_profiles.user_id nullable

Revision ID: mprof_user_nullable
Revises: add_missing_profile_columns
Create Date: 2025-09-30 10:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'mprof_user_nullable'
down_revision = 'add_missing_profile_columns'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c['name']: c for c in inspector.get_columns('mester_profiles')}
    if 'user_id' in cols and cols['user_id'].get('nullable') is False:
        op.alter_column('mester_profiles', 'user_id', nullable=True)


def downgrade() -> None:
    # Only revert if it previously existed and was not nullable. Keeping it nullable is safer.
    pass


