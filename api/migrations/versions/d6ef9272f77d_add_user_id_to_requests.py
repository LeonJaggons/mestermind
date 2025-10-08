"""add_user_id_to_requests

Revision ID: d6ef9272f77d
Revises: b5ac40eaf1f8
Create Date: 2025-10-07 08:47:14.612405

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "d6ef9272f77d"
down_revision = "b5ac40eaf1f8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add user_id column to requests table
    op.add_column(
        "requests", sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_index(op.f("ix_requests_user_id"), "requests", ["user_id"], unique=False)
    op.create_foreign_key(
        "fk_requests_user_id", "requests", "users", ["user_id"], ["id"]
    )


def downgrade() -> None:
    # Remove user_id column from requests table
    op.drop_constraint("fk_requests_user_id", "requests", type_="foreignkey")
    op.drop_index(op.f("ix_requests_user_id"), table_name="requests")
    op.drop_column("requests", "user_id")
