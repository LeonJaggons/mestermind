"""add messaging tables

Revision ID: add_messaging_20251003
Revises: ensure_req_contact_fields
Create Date: 2025-10-03 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'add_messaging_20251003'
down_revision = 'ensure_req_contact_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # Create message_threads if missing
    if 'message_threads' not in existing_tables:
        op.create_table(
            'message_threads',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('request_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('requests.id', ondelete='CASCADE'), nullable=False),
            sa.Column('customer_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('mester_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mesters.id'), nullable=False),
            sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('last_message_preview', sa.String(length=255), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint('request_id', 'mester_id', name='uq_thread_request_mester'),
        )

    # Ensure indexes for message_threads
    thread_indexes = {idx['name'] for idx in inspector.get_indexes('message_threads')} if 'message_threads' in existing_tables else set()
    if 'ix_threads_request_id' not in thread_indexes and 'message_threads' in existing_tables:
        op.create_index('ix_threads_request_id', 'message_threads', ['request_id'], unique=False)
    if 'ix_threads_customer_user_id' not in thread_indexes and 'message_threads' in existing_tables:
        op.create_index('ix_threads_customer_user_id', 'message_threads', ['customer_user_id'], unique=False)
    if 'ix_threads_mester_id' not in thread_indexes and 'message_threads' in existing_tables:
        op.create_index('ix_threads_mester_id', 'message_threads', ['mester_id'], unique=False)

    # Refresh tables list in case we created it
    existing_tables = set(inspector.get_table_names())

    # Create messages if missing
    if 'messages' not in existing_tables:
        op.create_table(
            'messages',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('thread_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('message_threads.id', ondelete='CASCADE'), nullable=False),
            sa.Column('sender_type', sa.String(length=20), nullable=False),
            sa.Column('sender_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('sender_mester_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mesters.id'), nullable=True),
            sa.Column('body', sa.Text(), nullable=False),
            sa.Column('is_read_by_customer', sa.Boolean(), server_default=sa.text('false'), nullable=False),
            sa.Column('is_read_by_mester', sa.Boolean(), server_default=sa.text('false'), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )

    # Ensure indexes for messages
    msg_indexes = {idx['name'] for idx in inspector.get_indexes('messages')} if 'messages' in existing_tables else set()
    if 'ix_messages_thread_id' not in msg_indexes and 'messages' in existing_tables:
        op.create_index('ix_messages_thread_id', 'messages', ['thread_id'], unique=False)
    if 'ix_messages_sender_user_id' not in msg_indexes and 'messages' in existing_tables:
        op.create_index('ix_messages_sender_user_id', 'messages', ['sender_user_id'], unique=False)
    if 'ix_messages_sender_mester_id' not in msg_indexes and 'messages' in existing_tables:
        op.create_index('ix_messages_sender_mester_id', 'messages', ['sender_mester_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_messages_sender_mester_id', table_name='messages')
    op.drop_index('ix_messages_sender_user_id', table_name='messages')
    op.drop_index('ix_messages_thread_id', table_name='messages')
    op.drop_table('messages')

    op.drop_index('ix_threads_mester_id', table_name='message_threads')
    op.drop_index('ix_threads_customer_user_id', table_name='message_threads')
    op.drop_index('ix_threads_request_id', table_name='message_threads')
    op.drop_table('message_threads')


