"""Add notifications tables

Revision ID: 20251007_add_notifications
Revises: 8822a3abd6e0
Create Date: 2025-10-07

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20251007_add_notifications"
down_revision = "8822a3abd6e0"
branch_labels = None
depends_on = None


def upgrade():
    # Create enum types (check if they exist first)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE notificationtype AS ENUM (
                'new_request', 'new_offer', 'new_message',
                'booking_confirmed', 'review_reminder', 'payment_received'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE notificationchannel AS ENUM ('in_app', 'email', 'sms', 'push');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create notifications table
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column(
            "mester_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("mesters.id"),
            nullable=True,
        ),
        sa.Column(
            "type",
            postgresql.ENUM(
                "new_request",
                "new_offer",
                "new_message",
                "booking_confirmed",
                "review_reminder",
                "payment_received",
                name="notificationtype",
            ),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column(
            "request_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("requests.id"),
            nullable=True,
        ),
        sa.Column(
            "offer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("offers.id"),
            nullable=True,
        ),
        sa.Column(
            "message_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("messages.id"),
            nullable=True,
        ),
        sa.Column("action_url", sa.String(500), nullable=True),
        sa.Column("data", postgresql.JSONB, nullable=True),
        sa.Column("is_read", sa.Boolean, default=False, nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # Create indexes for notifications
    op.create_index("ix_notifications_mester_id", "notifications", ["mester_id"])
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_type", "notifications", ["type"])
    op.create_index("ix_notifications_is_read", "notifications", ["is_read"])
    op.create_index("ix_notifications_created_at", "notifications", ["created_at"])
    op.create_index(
        "ix_notifications_recipient",
        "notifications",
        ["mester_id", "is_read", "created_at"],
    )
    op.create_index(
        "ix_notifications_user_unread", "notifications", ["user_id", "is_read"]
    )

    # Create notification_preferences table
    op.create_table(
        "notification_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
            unique=True,
        ),
        sa.Column(
            "mester_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("mesters.id"),
            nullable=True,
            unique=True,
        ),
        sa.Column("preferences", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("quiet_hours_start", sa.String(5), nullable=True),
        sa.Column("quiet_hours_end", sa.String(5), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.text("now()")),
    )

    # Create notification_logs table
    op.create_table(
        "notification_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "notification_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("notifications.id"),
            nullable=True,
        ),
        sa.Column(
            "channel",
            postgresql.ENUM(
                "in_app", "email", "sms", "push", name="notificationchannel"
            ),
            nullable=False,
        ),
        sa.Column("recipient", sa.String(255), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("provider", sa.String(50), nullable=True),
        sa.Column("provider_message_id", sa.String(255), nullable=True),
        sa.Column(
            "sent_at", sa.DateTime(timezone=True), server_default=sa.text("now()")
        ),
    )

    # Create indexes for notification_logs
    op.create_index(
        "ix_notification_logs_notification_id", "notification_logs", ["notification_id"]
    )
    op.create_index(
        "ix_notification_logs_status", "notification_logs", ["status", "sent_at"]
    )


def downgrade():
    # Drop tables
    op.drop_table("notification_logs")
    op.drop_table("notification_preferences")
    op.drop_table("notifications")

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS notificationchannel")
    op.execute("DROP TYPE IF EXISTS notificationtype")
