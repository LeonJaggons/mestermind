from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


class StarredConversation(Base):
    __tablename__ = "starred_conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    pro_profile_id = Column(Integer, ForeignKey("pro_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Ensure a conversation can only be starred once per pro
    __table_args__ = (
        UniqueConstraint('pro_profile_id', 'job_id', name='uq_pro_job_starred'),
    )
    
    # Relationships
    pro_profile = relationship("ProProfile", backref="starred_conversations")
    job = relationship("Job", backref="starred_conversations")
