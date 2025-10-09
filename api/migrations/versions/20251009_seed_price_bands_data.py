"""seed price bands data

Revision ID: seed_price_bands_data
Revises: add_price_bands
Create Date: 2025-10-09 12:45:00.000000
"""

from alembic import op
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from scripts.seed_price_bands import seed_price_bands

# revision identifiers, used by Alembic.
revision = 'seed_price_bands_data'
down_revision = 'add_price_bands'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Seed price bands and mappings data."""
    db: Session = SessionLocal()
    try:
        seed_price_bands(db)
    finally:
        db.close()


def downgrade() -> None:
    """Remove seeded price bands data."""
    # Note: This is a destructive operation. Only use if you really need to rollback.
    # In production, you might want to leave this empty or implement selective cleanup.
    pass
