"""add payment and lead purchase tables

Revision ID: 20251012_payments
Revises:
Create Date: 2025-10-12

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20251012_payments"
down_revision = "seed_price_bands_data"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create payment_status enum using raw SQL to avoid duplication issues
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE paymentstatus AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create payments table with raw SQL to avoid enum type duplication issues
    op.execute("""
        CREATE TABLE payments (
            id UUID PRIMARY KEY,
            mester_id UUID NOT NULL REFERENCES mesters(id),
            amount INTEGER NOT NULL,
            currency VARCHAR(3) NOT NULL,
            status paymentstatus NOT NULL,
            stripe_payment_intent_id VARCHAR(255),
            stripe_client_secret VARCHAR(255),
            stripe_charge_id VARCHAR(255),
            description TEXT,
            payment_metadata JSONB,
            refunded_amount INTEGER,
            refund_reason TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE,
            completed_at TIMESTAMP WITH TIME ZONE
        )
    """)
    op.create_index("ix_payments_created", "payments", ["created_at"], unique=False)
    op.create_index("ix_payments_mester_id", "payments", ["mester_id"], unique=False)
    op.create_index(
        "ix_payments_mester_status", "payments", ["mester_id", "status"], unique=False
    )
    op.create_index("ix_payments_status", "payments", ["status"], unique=False)
    op.create_index(
        "ix_payments_stripe_payment_intent_id",
        "payments",
        ["stripe_payment_intent_id"],
        unique=True,
    )

    # Create lead_purchases table
    op.create_table(
        "lead_purchases",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mester_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("request_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("thread_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("price_paid", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("price_band_code", sa.String(length=10), nullable=True),
        sa.Column(
            "lead_details", postgresql.JSON(astext_type=sa.Text()), nullable=True
        ),
        sa.Column(
            "unlocked_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("first_message_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["mester_id"],
            ["mesters.id"],
        ),
        sa.ForeignKeyConstraint(
            ["payment_id"],
            ["payments.id"],
        ),
        sa.ForeignKeyConstraint(
            ["request_id"],
            ["requests.id"],
        ),
        sa.ForeignKeyConstraint(
            ["thread_id"],
            ["message_threads.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "mester_id", "request_id", name="uq_mester_request_purchase"
        ),
    )
    op.create_index(
        "ix_lead_purchases_mester_id", "lead_purchases", ["mester_id"], unique=False
    )
    op.create_index(
        "ix_lead_purchases_mester_unlocked",
        "lead_purchases",
        ["mester_id", "unlocked_at"],
        unique=False,
    )
    op.create_index(
        "ix_lead_purchases_payment_id", "lead_purchases", ["payment_id"], unique=False
    )
    op.create_index(
        "ix_lead_purchases_request_id", "lead_purchases", ["request_id"], unique=False
    )
    op.create_index(
        "ix_lead_purchases_thread_id", "lead_purchases", ["thread_id"], unique=False
    )
    op.create_index(
        "ix_lead_purchases_unlocked_at", "lead_purchases", ["unlocked_at"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_lead_purchases_unlocked_at", table_name="lead_purchases")
    op.drop_index("ix_lead_purchases_thread_id", table_name="lead_purchases")
    op.drop_index("ix_lead_purchases_request_id", table_name="lead_purchases")
    op.drop_index("ix_lead_purchases_payment_id", table_name="lead_purchases")
    op.drop_index("ix_lead_purchases_mester_unlocked", table_name="lead_purchases")
    op.drop_index("ix_lead_purchases_mester_id", table_name="lead_purchases")
    op.drop_table("lead_purchases")
    op.drop_index("ix_payments_stripe_payment_intent_id", table_name="payments")
    op.drop_index("ix_payments_status", table_name="payments")
    op.drop_index("ix_payments_mester_status", table_name="payments")
    op.drop_index("ix_payments_mester_id", table_name="payments")
    op.drop_index("ix_payments_created", table_name="payments")
    op.drop_table("payments")
    
    # Drop the enum type
    op.execute("DROP TYPE IF EXISTS paymentstatus")

