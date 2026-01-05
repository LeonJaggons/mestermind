from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.session import Base


class City(Base):
    __tablename__ = "cities"

    id = Column(String, primary_key=True)  # UUID from JSON
    name = Column(String, nullable=False, index=True)
    slug = Column(String, unique=True, nullable=False, index=True)
    country = Column(String, nullable=False)
    country_code = Column(String, nullable=False)
    region = Column(String, nullable=False)
    population = Column(Integer, nullable=False)
    timezone = Column(String, nullable=False)
    is_capital = Column(Boolean, default=False, nullable=False)
    is_major_market = Column(Boolean, default=False, nullable=False)
    sort_order = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
