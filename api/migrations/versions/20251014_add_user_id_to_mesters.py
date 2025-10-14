"""add user_id to mesters

Revision ID: 20251014_add_user_id_to_mesters
Revises: 47a72799a49b
Create Date: 2025-10-14

"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "20251014_add_user_id_to_mesters"
down_revision = "47a72799a49b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add user_id column (nullable) referencing users.id, if it doesn't exist
    op.execute(
        "ALTER TABLE mesters ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)"
    )
    # Create index on user_id if not exists
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_mesters_user_id ON mesters(user_id)"
    )


def downgrade() -> None:
    # Drop index and column
    op.execute("DROP INDEX IF EXISTS ix_mesters_user_id")
    op.execute("ALTER TABLE mesters DROP COLUMN IF EXISTS user_id")


