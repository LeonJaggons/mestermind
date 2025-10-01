"""add mester_profiles.mester_id and constraints

Revision ID: add_mester_profiles_fix
Revises: add_mester_tables
Create Date: 2025-09-30 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'add_mester_profiles_fix'
down_revision = 'add_mester_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Ensure column exists
    cols = {c['name'] for c in inspector.get_columns('mester_profiles')}
    if 'mester_id' not in cols:
        op.add_column('mester_profiles', sa.Column('mester_id', postgresql.UUID(as_uuid=True), nullable=True))

    # Add FK if missing
    fks = {fk['name'] for fk in inspector.get_foreign_keys('mester_profiles') if fk.get('name')}
    if 'fk_mester_profiles_mester_id' not in fks:
        op.create_foreign_key('fk_mester_profiles_mester_id', 'mester_profiles', 'mesters', ['mester_id'], ['id'], ondelete='CASCADE')

    # Add unique constraint if missing
    uniques = {uc['name'] for uc in inspector.get_unique_constraints('mester_profiles')}
    if 'uq_mester_profiles_mester_id' not in uniques:
        op.create_unique_constraint('uq_mester_profiles_mester_id', 'mester_profiles', ['mester_id'])

    # Add index if missing
    indexes = {ix['name'] for ix in inspector.get_indexes('mester_profiles')}
    if 'ix_mester_profiles_mester_id' not in indexes:
        op.create_index('ix_mester_profiles_mester_id', 'mester_profiles', ['mester_id'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Drop index
    indexes = {ix['name'] for ix in inspector.get_indexes('mester_profiles')}
    if 'ix_mester_profiles_mester_id' in indexes:
        op.drop_index('ix_mester_profiles_mester_id', table_name='mester_profiles')

    # Drop unique
    uniques = {uc['name'] for uc in inspector.get_unique_constraints('mester_profiles')}
    if 'uq_mester_profiles_mester_id' in uniques:
        op.drop_constraint('uq_mester_profiles_mester_id', 'mester_profiles', type_='unique')

    # Drop FK
    fks = {fk['name'] for fk in inspector.get_foreign_keys('mester_profiles') if fk.get('name')}
    if 'fk_mester_profiles_mester_id' in fks:
        op.drop_constraint('fk_mester_profiles_mester_id', 'mester_profiles', type_='foreignkey')

    # Optionally drop column
    cols = {c['name'] for c in inspector.get_columns('mester_profiles')}
    if 'mester_id' in cols:
        op.drop_column('mester_profiles', 'mester_id')


