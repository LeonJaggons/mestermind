"""add offers table

Revision ID: 20251004_add_offers
Revises: 8822a3abd6e0
Create Date: 2025-10-04 12:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20251004_add_offers"
down_revision = "8822a3abd6e0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create offer status enum if it doesn't exist
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE offerstatus AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create offers table
    op.create_table(
        "offers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "request_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("requests.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "mester_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("mesters.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column(
            "currency", sa.String(length=3), nullable=False, server_default="HUF"
        ),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(
                "PENDING",
                "ACCEPTED",
                "REJECTED",
                "EXPIRED",
                name="offerstatus",
                create_type=False,
            ),
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Create index for faster lookups
    op.create_index("ix_offers_request_id_status", "offers", ["request_id", "status"])


def downgrade() -> None:
    op.drop_index("ix_offers_request_id_status", table_name="offers")
    op.drop_table("offers")
    op.execute("DROP TYPE offerstatus")
