"""rebuild mester profile with normalized tables

Revision ID: mprof_norm
Revises: mprof_user_nullable
Create Date: 2025-09-30 10:15:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'mprof_norm'
down_revision = 'mprof_user_nullable'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop old profile artifacts
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    def drop_if_exists(name):
        if name in tables:
            op.drop_table(name)

    # Drop in dependency order
    for t in [
        'mester_profile_budgets',
        'mester_profile_preferences',
        'mester_profile_working_hours',
        'mester_profile_coverage',
        'mester_profile_addresses',
        'mester_profile_services',
    ]:
        if t in tables:
            op.drop_table(t)
    drop_if_exists('mester_profiles')

    # Create fresh normalized schema
    op.create_table(
        'mester_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('mester_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mesters.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('business_name', sa.String(length=255), nullable=True),
        sa.Column('display_name', sa.String(length=255), nullable=True),
        sa.Column('slug', sa.String(length=160), nullable=True),
        sa.Column('contact_email', sa.String(length=255), nullable=True),
        sa.Column('contact_phone', sa.String(length=50), nullable=True),
        sa.Column('year_founded', sa.Integer(), nullable=True),
        sa.Column('employees_count', sa.Integer(), nullable=True),
        sa.Column('intro', sa.Text(), nullable=True),
        sa.Column('languages', postgresql.ARRAY(sa.String(length=10)), nullable=True),
        sa.Column('availability_mode', sa.String(length=20), nullable=True),
        sa.Column('budget_mode', sa.String(length=20), nullable=True),
        sa.Column('weekly_budget', sa.Integer(), nullable=True),
        sa.Column('logo_url', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_mester_profiles_mester_id', 'mester_profiles', ['mester_id'], unique=False)

    op.create_table(
        'mester_profile_services',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mester_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('service_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('services.id'), nullable=False),
        sa.Column('service_name', sa.String(length=255), nullable=True),
        sa.Column('pricing_model', sa.String(length=50), nullable=True),
        sa.Column('price', sa.Integer(), nullable=True),
    )
    op.create_index('ix_mprof_svcs_profile_id', 'mester_profile_services', ['profile_id'], unique=False)

    op.create_table(
        'mester_profile_addresses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mester_profiles.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('street', sa.String(length=255), nullable=True),
        sa.Column('unit', sa.String(length=50), nullable=True),
        sa.Column('city', sa.String(length=150), nullable=True),
        sa.Column('zip', sa.String(length=20), nullable=True),
        sa.Column('home_city_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('cities.id'), nullable=True),
    )

    op.create_table(
        'mester_profile_coverage',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mester_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('city_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('cities.id'), nullable=True),
        sa.Column('district_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('districts.id'), nullable=True),
        sa.Column('postal_code_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('postal_codes.id'), nullable=True),
        sa.Column('radius_km', sa.Float(), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=False, server_default=sa.text('0')),
    )
    op.create_index('ix_mprof_cov_profile_id', 'mester_profile_coverage', ['profile_id'], unique=False)

    op.create_table(
        'mester_profile_working_hours',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mester_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('day', sa.String(length=3), nullable=False),
        sa.Column('open', sa.String(length=5), nullable=False),
        sa.Column('close', sa.String(length=5), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
    )
    op.create_index('ix_mprof_hours_profile_id', 'mester_profile_working_hours', ['profile_id'], unique=False)

    op.create_table(
        'mester_profile_preferences',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mester_profiles.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('property_type', sa.String(length=50), nullable=True),
        sa.Column('job_size', sa.String(length=50), nullable=True),
        sa.Column('frequency', sa.String(length=50), nullable=True),
        sa.Column('remove_debris', sa.Boolean(), nullable=False, server_default=sa.text('false')),
    )

    op.create_table(
        'mester_profile_budgets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mester_profiles.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('budget_mode', sa.String(length=20), nullable=True),
        sa.Column('weekly_budget', sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    for t in [
        'mester_profile_budgets',
        'mester_profile_preferences',
        'mester_profile_working_hours',
        'mester_profile_coverage',
        'mester_profile_addresses',
        'mester_profile_services',
        'mester_profiles',
    ]:
        op.drop_table(t)


