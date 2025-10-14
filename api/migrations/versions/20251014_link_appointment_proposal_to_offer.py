"""link appointment proposal to offer

Revision ID: 20251014_proposal_offer
Revises: 20251013_add_job_management
Create Date: 2025-10-14

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251014_proposal_offer'
down_revision = '20251013_add_job_management'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add offer_id to appointment_proposals
    op.add_column('appointment_proposals', 
        sa.Column('offer_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_appointment_proposals_offer_id',
        'appointment_proposals', 
        'offers',
        ['offer_id'], 
        ['id'],
        ondelete='SET NULL'
    )
    
    # Add index for performance
    op.create_index(
        'ix_appointment_proposals_offer_id',
        'appointment_proposals',
        ['offer_id']
    )


def downgrade() -> None:
    # Remove index
    op.drop_index('ix_appointment_proposals_offer_id', 'appointment_proposals')
    
    # Remove foreign key
    op.drop_constraint('fk_appointment_proposals_offer_id', 'appointment_proposals', type_='foreignkey')
    
    # Remove column
    op.drop_column('appointment_proposals', 'offer_id')


