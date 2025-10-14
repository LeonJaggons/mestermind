"""Add job management tables

Revision ID: 20251013_add_job_management
Revises: b684edbeec25
Create Date: 2025-10-13

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251013_add_job_management'
down_revision = 'b684edbeec25'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enums (duplicate safe)
    op.execute("""
    DO $$ BEGIN
        CREATE TYPE jobstatus AS ENUM (
            'pending','in_progress','on_hold','awaiting_approval','completed','cancelled'
        );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    """)

    op.execute("""
    DO $$ BEGIN
        CREATE TYPE milestonestatus AS ENUM (
            'pending','in_progress','completed','skipped'
        );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    """)

    op.execute("""
    DO $$ BEGIN
        CREATE TYPE documenttype AS ENUM (
            'photo','document','invoice','contract','receipt','other'
        );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    """)

    op.execute("""
    DO $$ BEGIN
        CREATE TYPE documentcategory AS ENUM (
            'before','during','after','invoice','contract','permit','other'
        );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    """)
    
    # Create jobs table
    op.create_table(
        'jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('request_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('requests.id'), nullable=False),
        sa.Column('appointment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('appointments.id'), nullable=True),
        sa.Column('mester_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mesters.id'), nullable=False),
        sa.Column('customer_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('thread_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('message_threads.id'), nullable=True),
        
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        
        sa.Column('status', postgresql.ENUM(name='jobstatus'), nullable=False, server_default='pending'),
        
        sa.Column('scheduled_start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('scheduled_end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_end_date', sa.DateTime(timezone=True), nullable=True),
        
        sa.Column('estimated_cost', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('final_cost', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('currency', sa.String(3), nullable=False, server_default='HUF'),
        
        sa.Column('location', sa.Text, nullable=True),
        sa.Column('location_address', sa.Text, nullable=True),
        
        sa.Column('customer_approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('mester_marked_complete_at', sa.DateTime(timezone=True), nullable=True),
        
        sa.Column('customer_satisfaction_rating', sa.Integer, nullable=True),
        sa.Column('customer_feedback', sa.Text, nullable=True),
        
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()'), nullable=True),
    )
    
    # Create indexes for jobs
    op.create_index('ix_jobs_request_id', 'jobs', ['request_id'])
    op.create_index('ix_jobs_appointment_id', 'jobs', ['appointment_id'])
    op.create_index('ix_jobs_mester_id', 'jobs', ['mester_id'])
    op.create_index('ix_jobs_customer_user_id', 'jobs', ['customer_user_id'])
    op.create_index('ix_jobs_thread_id', 'jobs', ['thread_id'])
    op.create_index('ix_jobs_status', 'jobs', ['status'])
    op.create_index('ix_jobs_mester_status', 'jobs', ['mester_id', 'status'])
    op.create_index('ix_jobs_customer_status', 'jobs', ['customer_user_id', 'status'])
    op.create_index('ix_jobs_scheduled_start', 'jobs', ['scheduled_start_date'])
    op.create_index('ix_jobs_created_at', 'jobs', ['created_at'])
    
    # Create job_milestones table
    op.create_table(
        'job_milestones',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False),
        
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        
        sa.Column('status', postgresql.ENUM(name='milestonestatus'), nullable=False, server_default='pending'),
        
        sa.Column('order_index', sa.Integer, nullable=False, server_default='0'),
        
        sa.Column('scheduled_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('scheduled_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_end', sa.DateTime(timezone=True), nullable=True),
        
        sa.Column('completion_percentage', sa.Integer, nullable=False, server_default='0'),
        sa.Column('completion_notes', sa.Text, nullable=True),
        
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()'), nullable=True),
    )
    
    # Create indexes for job_milestones
    op.create_index('ix_job_milestones_job_id', 'job_milestones', ['job_id'])
    op.create_index('ix_job_milestones_job_order', 'job_milestones', ['job_id', 'order_index'])
    
    # Create job_documents table
    op.create_table(
        'job_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('milestone_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('job_milestones.id', ondelete='SET NULL'), nullable=True),
        
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('file_url', sa.Text, nullable=False),
        sa.Column('file_size', sa.Integer, nullable=True),
        sa.Column('file_type', sa.String(100), nullable=False),
        
        sa.Column('document_type', postgresql.ENUM(name='documenttype'), nullable=False, server_default='other'),
        sa.Column('category', postgresql.ENUM(name='documentcategory'), nullable=False, server_default='other'),
        
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        
        sa.Column('uploaded_by_type', sa.String(20), nullable=False),
        sa.Column('uploaded_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('uploaded_by_mester_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mesters.id'), nullable=True),
        
        sa.Column('is_visible_to_customer', sa.Boolean, nullable=False, server_default='true'),
        
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()'), nullable=True),
    )
    
    # Create indexes for job_documents
    op.create_index('ix_job_documents_job_id', 'job_documents', ['job_id'])
    op.create_index('ix_job_documents_milestone_id', 'job_documents', ['milestone_id'])
    op.create_index('ix_job_documents_job_category', 'job_documents', ['job_id', 'category'])
    op.create_index('ix_job_documents_type', 'job_documents', ['document_type'])
    op.create_index('ix_job_documents_created_at', 'job_documents', ['created_at'])
    
    # Create job_status_history table
    op.create_table(
        'job_status_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False),
        
        sa.Column('previous_status', sa.String(50), nullable=True),
        sa.Column('new_status', sa.String(50), nullable=False),
        
        sa.Column('changed_by_type', sa.String(20), nullable=False),
        sa.Column('changed_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('changed_by_mester_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mesters.id'), nullable=True),
        
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('reason', sa.Text, nullable=True),
        
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    
    # Create indexes for job_status_history
    op.create_index('ix_job_status_history_job_id', 'job_status_history', ['job_id'])
    op.create_index('ix_job_status_history_job_created', 'job_status_history', ['job_id', 'created_at'])
    op.create_index('ix_job_status_history_created_at', 'job_status_history', ['created_at'])
    
    # Create job_notes table
    op.create_table(
        'job_notes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False),
        
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('content', sa.Text, nullable=False),
        
        sa.Column('created_by_type', sa.String(20), nullable=False),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_by_mester_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mesters.id'), nullable=True),
        
        sa.Column('is_private', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('is_pinned', sa.Boolean, nullable=False, server_default='false'),
        
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()'), nullable=True),
    )
    
    # Create indexes for job_notes
    op.create_index('ix_job_notes_job_id', 'job_notes', ['job_id'])
    op.create_index('ix_job_notes_job_created', 'job_notes', ['job_id', 'created_at'])
    op.create_index('ix_job_notes_pinned', 'job_notes', ['job_id', 'is_pinned'])
    op.create_index('ix_job_notes_created_at', 'job_notes', ['created_at'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('job_notes')
    op.drop_table('job_status_history')
    op.drop_table('job_documents')
    op.drop_table('job_milestones')
    op.drop_table('jobs')
    
    # Drop enums
    job_status_enum = postgresql.ENUM(name='jobstatus')
    job_status_enum.drop(op.get_bind(), checkfirst=True)
    
    milestone_status_enum = postgresql.ENUM(name='milestonestatus')
    milestone_status_enum.drop(op.get_bind(), checkfirst=True)
    
    document_type_enum = postgresql.ENUM(name='documenttype')
    document_type_enum.drop(op.get_bind(), checkfirst=True)
    
    document_category_enum = postgresql.ENUM(name='documentcategory')
    document_category_enum.drop(op.get_bind(), checkfirst=True)

