"""add missing columns to mester_profiles

Revision ID: add_missing_profile_columns
Revises: add_mester_profiles_fix
Create Date: 2025-09-30 00:10:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'add_missing_profile_columns'
down_revision = 'add_mester_profiles_fix'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c['name'] for c in inspector.get_columns('mester_profiles')}

    def add_col(name, column):
        if name not in cols:
            op.add_column('mester_profiles', column)

    add_col('business_name', sa.Column('business_name', sa.String(length=255), nullable=True))
    add_col('display_name', sa.Column('display_name', sa.String(length=255), nullable=True))
    add_col('contact_email', sa.Column('contact_email', sa.String(length=255), nullable=True))
    add_col('contact_phone', sa.Column('contact_phone', sa.String(length=50), nullable=True))
    add_col('year_founded', sa.Column('year_founded', sa.Integer(), nullable=True))
    add_col('employees_count', sa.Column('employees_count', sa.Integer(), nullable=True))
    add_col('intro', sa.Column('intro', sa.Text(), nullable=True))
    add_col('languages', sa.Column('languages', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    add_col('availability_mode', sa.Column('availability_mode', sa.String(length=20), nullable=True))
    add_col('working_hours', sa.Column('working_hours', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    add_col('preferences', sa.Column('preferences', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    add_col('budget_mode', sa.Column('budget_mode', sa.String(length=20), nullable=True))
    add_col('weekly_budget', sa.Column('weekly_budget', sa.Integer(), nullable=True))
    add_col('radius_km', sa.Column('radius_km', sa.Float(), nullable=True))
    add_col('logo_url', sa.Column('logo_url', sa.Text(), nullable=True))
    # created_at/updated_at may already exist; add if missing
    add_col('created_at', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True))
    add_col('updated_at', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Only drop columns that we added (optional). Safe to leave as no-op for data safety.
    pass


