"""add mester tables

Revision ID: add_mester_tables
Revises: add_requests_table
Create Date: 2025-09-29 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'add_mester_tables'
down_revision = 'add_requests'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # add columns to cities for lat/lon if not present
    with op.batch_alter_table('cities') as batch_op:
        try:
            batch_op.add_column(sa.Column('lat', sa.Float(), nullable=True))
        except Exception:
            pass
        try:
            batch_op.add_column(sa.Column('lon', sa.Float(), nullable=True))
        except Exception:
            pass
    # mesters
    op.create_table(
        'mesters',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('full_name', sa.String(length=150), nullable=False),
        sa.Column('slug', sa.String(length=160), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('skills', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('tags', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('languages', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('years_experience', sa.Integer(), nullable=True),
        sa.Column('rating_avg', sa.Float(), nullable=True),
        sa.Column('review_count', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('home_city_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('lat', sa.Float(), nullable=True),
        sa.Column('lon', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['home_city_id'], ['cities.id']),
        sa.UniqueConstraint('slug', name='uq_mesters_slug'),
        sa.UniqueConstraint('email', name='uq_mesters_email'),
    )
    op.create_index('ix_mesters_full_name', 'mesters', ['full_name'], unique=False)
    op.create_index('ix_mesters_slug', 'mesters', ['slug'], unique=False)
    op.create_index('ix_mesters_active_city', 'mesters', ['is_active', 'home_city_id'], unique=False)

    # mester_services
    op.create_table(
        'mester_services',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('mester_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('service_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('price_hour_min', sa.Integer(), nullable=True),
        sa.Column('price_hour_max', sa.Integer(), nullable=True),
        sa.Column('pricing_notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['mester_id'], ['mesters.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['service_id'], ['services.id']),
        sa.UniqueConstraint('mester_id', 'service_id', name='uq_mester_service'),
    )
    op.create_index('ix_mester_services_mester_id', 'mester_services', ['mester_id'], unique=False)
    op.create_index('ix_mester_services_service_id', 'mester_services', ['service_id'], unique=False)
    op.create_index('ix_mester_services_active', 'mester_services', ['is_active'], unique=False)

    # mester_coverage_areas
    op.create_table(
        'mester_coverage_areas',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('mester_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('city_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('district_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('postal_code_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('radius_km', sa.Float(), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['mester_id'], ['mesters.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['city_id'], ['cities.id']),
        sa.ForeignKeyConstraint(['district_id'], ['districts.id']),
        sa.ForeignKeyConstraint(['postal_code_id'], ['postal_codes.id']),
    )
    op.create_index('ix_mester_coverage_mester_id', 'mester_coverage_areas', ['mester_id'], unique=False)
    op.create_index('ix_mester_coverage_city_id', 'mester_coverage_areas', ['city_id'], unique=False)
    op.create_index('ix_mester_coverage_district_id', 'mester_coverage_areas', ['district_id'], unique=False)
    op.create_index('ix_mester_coverage_postal_code_id', 'mester_coverage_areas', ['postal_code_id'], unique=False)

    # mester_reviews
    op.create_table(
        'mester_reviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('mester_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('author_name', sa.String(length=150), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['mester_id'], ['mesters.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_mester_reviews_mester_id', 'mester_reviews', ['mester_id'], unique=False)
    op.create_index('ix_mester_reviews_rating', 'mester_reviews', ['rating'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('cities') as batch_op:
        try:
            batch_op.drop_column('lon')
        except Exception:
            pass
        try:
            batch_op.drop_column('lat')
        except Exception:
            pass
    op.drop_index('ix_mester_reviews_rating', table_name='mester_reviews')
    op.drop_index('ix_mester_reviews_mester_id', table_name='mester_reviews')
    op.drop_table('mester_reviews')

    op.drop_index('ix_mester_coverage_postal_code_id', table_name='mester_coverage_areas')
    op.drop_index('ix_mester_coverage_district_id', table_name='mester_coverage_areas')
    op.drop_index('ix_mester_coverage_city_id', table_name='mester_coverage_areas')
    op.drop_index('ix_mester_coverage_mester_id', table_name='mester_coverage_areas')
    op.drop_table('mester_coverage_areas')

    op.drop_index('ix_mester_services_active', table_name='mester_services')
    op.drop_index('ix_mester_services_service_id', table_name='mester_services')
    op.drop_index('ix_mester_services_mester_id', table_name='mester_services')
    op.drop_table('mester_services')

    op.drop_index('ix_mesters_active_city', table_name='mesters')
    op.drop_index('ix_mesters_slug', table_name='mesters')
    op.drop_index('ix_mesters_full_name', table_name='mesters')
    op.drop_table('mesters')


