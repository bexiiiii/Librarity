"""
Anonymous Visitor tracking model
Tracks users who visit the site but don't register
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
import uuid

from core.database import Base


class AnonymousVisitor(Base):
    """Track anonymous visitors for analytics"""
    __tablename__ = "anonymous_visitors"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Visitor identification (fingerprint/session ID from frontend)
    visitor_id = Column(Text, unique=True, nullable=False, index=True)
    
    # Visit information
    first_visit = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    last_visit = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    visit_count = Column(Integer, default=1, nullable=False)
    
    # User behavior
    converted_to_user = Column(Boolean, default=False, nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=True)  # Set when user registers
    
    # Traffic source
    utm_source = Column(Text, nullable=True)
    utm_medium = Column(Text, nullable=True)
    utm_campaign = Column(Text, nullable=True)
    referrer = Column(Text, nullable=True)
    
    # Device info
    device_type = Column(Text, nullable=True)  # mobile, desktop, tablet
    browser = Column(Text, nullable=True)
    os = Column(Text, nullable=True)
    
    # Geographic info (optional)
    country = Column(Text, nullable=True)
    city = Column(Text, nullable=True)
    
    # Pages visited
    landing_page = Column(Text, nullable=True)
    pages_visited = Column(Integer, default=1, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<AnonymousVisitor {self.visitor_id} - Visits: {self.visit_count}>"
