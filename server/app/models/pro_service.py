from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class ProService(Base):
    __tablename__ = "pro_services"

    id = Column(Integer, primary_key=True, index=True)
    pro_profile_id = Column(Integer, ForeignKey("pro_profiles.id", ondelete="CASCADE"), nullable=False)
    service_id = Column(String, ForeignKey("services.id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    pro_profile = relationship("ProProfile", back_populates="pro_services")
    service = relationship("Service")
