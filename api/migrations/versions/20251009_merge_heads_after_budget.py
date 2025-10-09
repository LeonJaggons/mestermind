"""merge heads after adding budget_estimate

Revision ID: 20251009_merge_heads_after_budget
Revises: 20251009_add_budget_estimate, 258a45be6f49
Create Date: 2025-10-09
"""

from alembic import op  # noqa: F401
import sqlalchemy as sa  # noqa: F401


# revision identifiers, used by Alembic.
revision = '20251009_merge_heads_after_budget'
down_revision = ('20251009_add_budget_estimate', '258a45be6f49')
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This is a merge migration; no schema changes needed.
    pass


def downgrade() -> None:
    # This is a merge migration; nothing to undo.
    pass



