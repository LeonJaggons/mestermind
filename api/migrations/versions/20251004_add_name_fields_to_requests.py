"""add first_name and last_name to requests

Revision ID: 20251004_add_name_fields
Revises: 20251003_add_messaging_tables
Create Date: 2025-10-04 00:00:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20251004_add_name_fields"
down_revision = "add_messaging_20251003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add first_name and last_name columns to requests table
    op.add_column(
        "requests", sa.Column("first_name", sa.String(length=255), nullable=True)
    )
    op.add_column(
        "requests", sa.Column("last_name", sa.String(length=255), nullable=True)
    )


def downgrade() -> None:
    # Remove first_name and last_name columns from requests table
    op.drop_column("requests", "last_name")
    op.drop_column("requests", "first_name")
