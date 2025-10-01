"""prune unused tables by dropping everything not in whitelist

Revision ID: prune_unused_tables
Revises: mprof_norm
Create Date: 2025-09-30 10:28:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'prune_unused_tables'
down_revision = 'req_contact_fields'
branch_labels = None
depends_on = None


WHITELIST = {
    # migrations
    'alembic_version',
    # core domain
    'categories', 'subcategories', 'services',
    'question_sets', 'questions',
    'counties', 'cities', 'districts', 'postal_codes',
    'onboarding_drafts',
    'mesters', 'mester_services', 'mester_coverage_areas', 'mester_reviews',
    # normalized profile
    'mester_profiles', 'mester_profile_services', 'mester_profile_addresses',
    'mester_profile_coverage', 'mester_profile_working_hours',
    'mester_profile_preferences', 'mester_profile_budgets',
    # requests flow (kept)
    'requests',
}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())
    to_drop = [t for t in existing if t not in WHITELIST]

    # Drop non-whitelisted tables with CASCADE
    for t in to_drop:
        op.execute(sa.text(f'DROP TABLE IF EXISTS "{t}" CASCADE'))


def downgrade() -> None:
    # Irreversible pruning
    pass


