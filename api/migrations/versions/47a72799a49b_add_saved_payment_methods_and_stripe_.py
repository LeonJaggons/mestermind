"""add_saved_payment_methods_and_stripe_customer

Revision ID: 47a72799a49b
Revises: 20251014_proposal_offer
Create Date: 2025-10-14 04:59:25.710040

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '47a72799a49b'
down_revision = '20251014_proposal_offer'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add stripe_customer_id to mesters table
    op.add_column('mesters', sa.Column('stripe_customer_id', sa.String(length=255), nullable=True))
    op.create_index('ix_mesters_stripe_customer_id', 'mesters', ['stripe_customer_id'], unique=True)
    
    # Create saved_payment_methods table
    op.create_table(
        'saved_payment_methods',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('mester_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('stripe_payment_method_id', sa.String(length=255), nullable=False),
        sa.Column('card_brand', sa.String(length=50), nullable=True),
        sa.Column('card_last4', sa.String(length=4), nullable=True),
        sa.Column('card_exp_month', sa.Integer(), nullable=True),
        sa.Column('card_exp_year', sa.Integer(), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['mester_id'], ['mesters.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for saved_payment_methods
    op.create_index('ix_saved_payment_methods_mester_id', 'saved_payment_methods', ['mester_id'], unique=False)
    op.create_index('ix_saved_payment_methods_stripe_payment_method_id', 'saved_payment_methods', ['stripe_payment_method_id'], unique=True)
    op.create_index('ix_saved_payment_methods_mester_default', 'saved_payment_methods', ['mester_id', 'is_default'], unique=False)


def downgrade() -> None:
    # Drop saved_payment_methods table and its indexes
    op.drop_index('ix_saved_payment_methods_mester_default', table_name='saved_payment_methods')
    op.drop_index('ix_saved_payment_methods_stripe_payment_method_id', table_name='saved_payment_methods')
    op.drop_index('ix_saved_payment_methods_mester_id', table_name='saved_payment_methods')
    op.drop_table('saved_payment_methods')
    
    # Drop stripe_customer_id from mesters table
    op.drop_index('ix_mesters_stripe_customer_id', table_name='mesters')
    op.drop_column('mesters', 'stripe_customer_id')
