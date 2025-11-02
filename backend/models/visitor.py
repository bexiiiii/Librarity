"""
Anonymous Visitor tracking model
Tracks users who visit the site but don't register
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
import uuid

from core.database import Base


class AnonymousVisitor(Base):
    """Track anonymous visitors for analytics"""
    __tablename__ = "anonymous_visitors"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Visitor identification (fingerprint/session ID from frontend)
    visitor_id = Column(String, unique=True, nullable=False, index=True)
    
    # Visit information
    first_visit = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    last_visit = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    visit_count = Column(Integer, default=1, nullable=False)
    
    # User behavior
    converted_to_user = Column(Boolean, default=False, nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=True)  # Set when user registers
    
    # Traffic source
    utm_source = Column(String, nullable=True)
    utm_medium = Column(String, nullable=True)
    utm_campaign = Column(String, nullable=True)
    referrer = Column(String, nullable=True)
    
    # Device info
    device_type = Column(String, nullable=True)  # mobile, desktop, tablet
    browser = Column(String, nullable=True)
    os = Column(String, nullable=True)
    
    # Geographic info (optional)
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    
    # Pages visited
    landing_page = Column(String, nullable=True)
    pages_visited = Column(Integer, default=1, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<AnonymousVisitor {self.visitor_id} - Visits: {self.visit_count}>"
