# Backend models
from sqlalchemy import Column, String, DateTime, ForeignKey, Index, Text, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from core.database import Base
import uuid

class UsageLog(Base):
    """Detailed log of all user activities - chats, tokens, API calls"""
    __tablename__ = "usage_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    book_id = Column(UUID(as_uuid=True), ForeignKey("books.id", ondelete="SET NULL"), nullable=True)
    
    # Activity details
    activity_type = Column(String, nullable=False)  # 'chat', 'book_upload', 'login', 'share'
    tokens_used = Column(Integer, default=0)
    chat_mode = Column(String, nullable=True)  # 'book_brain', 'author', 'coach', 'citation'
    message = Column(Text, nullable=True)
    response = Column(Text, nullable=True)
    
    # Metadata
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    extra_metadata = Column(Text, nullable=True)  # JSON string for additional data
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Indexes for fast queries
    __table_args__ = (
        Index('idx_usage_user_created', 'user_id', 'created_at'),
        Index('idx_usage_activity_type', 'activity_type'),
        Index('idx_usage_created_at', 'created_at'),
    )
