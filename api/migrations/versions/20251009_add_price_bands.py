"""add price bands and mappings

Revision ID: add_price_bands
Revises: 20251009_merge_heads_after_budget
Create Date: 2025-10-09 12:30:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'add_price_bands'
down_revision = '20251009_merge_heads_after_budget'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'price_bands',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('code', sa.String(length=10), nullable=False, unique=True),
        sa.Column('label', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default=sa.text("'HUF'")),
        sa.Column('typical_job_value_min_huf', sa.Integer(), nullable=True),
        sa.Column('typical_job_value_max_huf', sa.Integer(), nullable=True),
        sa.Column('typical_close_rate_min', sa.Float(), nullable=True),
        sa.Column('typical_close_rate_max', sa.Float(), nullable=True),
        sa.Column('target_take_of_expected_value', sa.Float(), nullable=True),
        sa.Column('price_floor_huf', sa.Integer(), nullable=True),
        sa.Column('price_cap_huf', sa.Integer(), nullable=True),
        sa.Column('seats_per_lead', sa.Integer(), nullable=True),
        sa.Column('metadata_json', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_index('ix_price_bands_code', 'price_bands', ['code'], unique=True)

    op.create_table(
        'price_band_mappings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('subcategory_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('price_band_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subcategory_id'], ['subcategories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['price_band_id'], ['price_bands.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('category_id', 'subcategory_id', name='uq_price_band_cat_subcat'),
    )
    op.create_index('ix_price_band_mappings_category_id', 'price_band_mappings', ['category_id'], unique=False)
    op.create_index('ix_price_band_mappings_subcategory_id', 'price_band_mappings', ['subcategory_id'], unique=False)
    op.create_index('ix_price_band_mappings_price_band_id', 'price_band_mappings', ['price_band_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_price_band_mappings_price_band_id', table_name='price_band_mappings')
    op.drop_index('ix_price_band_mappings_subcategory_id', table_name='price_band_mappings')
    op.drop_index('ix_price_band_mappings_category_id', table_name='price_band_mappings')
    op.drop_table('price_band_mappings')
    op.drop_index('ix_price_bands_code', table_name='price_bands')
    op.drop_table('price_bands')



