"""merge heads

Revision ID: 8822a3abd6e0
Revises: add_req_mester_id, 20251004_add_name_fields
Create Date: 2025-10-04 05:54:23.652126

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8822a3abd6e0'
down_revision = ('add_req_mester_id', '20251004_add_name_fields')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
