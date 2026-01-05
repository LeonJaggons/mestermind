from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.db.session import Base


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    to_email = Column(String, nullable=False, index=True)
    from_email = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    status = Column(String, nullable=False)  # sent | error
    provider_message_id = Column(String, nullable=True)
    provider_response = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
