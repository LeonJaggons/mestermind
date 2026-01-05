from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


class ArchivedConversation(Base):
    __tablename__ = "archived_conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    pro_profile_id = Column(Integer, ForeignKey("pro_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Ensure a conversation can only be archived once per pro
    __table_args__ = (
        UniqueConstraint('pro_profile_id', 'job_id', name='uq_pro_job_archive'),
    )
    
    # Relationships
    pro_profile = relationship("ProProfile", backref="archived_conversations")
    job = relationship("Job", backref="archived_conversations")
