"""Add profile_photos to pro_profiles

Revision ID: 002
Revises: 001
Create Date: 2026-01-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add profile_photos column
    op.add_column('pro_profiles', sa.Column('profile_photos', JSON, nullable=True))


def downgrade() -> None:
    # Remove profile_photos column
    op.drop_column('pro_profiles', 'profile_photos')
