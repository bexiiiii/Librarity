"""
Token Usage Model - Track token consumption for analytics
"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Float, Boolean, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from core.database import Base
from models.chat import ChatMode


class TokenUsage(Base):
    """Token usage tracking for billing and analytics"""
    __tablename__ = "token_usage"
    
    # Composite indexes for analytics queries
    __table_args__ = (
        Index('idx_user_created', 'user_id', 'created_at'),
        Index('idx_user_action', 'user_id', 'action'),
        Index('idx_action_created', 'action', 'created_at'),
        Index('idx_model_created', 'model_name', 'created_at'),
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    book_id = Column(UUID(as_uuid=True), ForeignKey("books.id", ondelete="SET NULL"), nullable=True)
    
    # Usage details
    tokens_used = Column(Integer, nullable=False)
    prompt_tokens = Column(Integer, default=0, nullable=False)
    completion_tokens = Column(Integer, default=0, nullable=False)
    
    # Context
    action = Column(String(100), nullable=False)  # chat, upload, embed, summarize, etc.
    mode = Column(SQLEnum(ChatMode), nullable=True)
    model_name = Column(String(100), nullable=True)  # gpt-4, gpt-3.5-turbo, etc.
    
    # Performance metrics
    response_time_ms = Column(Integer, nullable=True)  # Response time in milliseconds
    cache_hit = Column(Boolean, default=False)  # Was response cached?
    
    # Cost estimation (based on model pricing)
    estimated_cost = Column(Float, default=0.0, nullable=False)
    
    # Metadata
    extra_metadata = Column(JSONB, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="token_usage")
    book = relationship("Book")
    
    def __repr__(self):
        return f"<TokenUsage {self.tokens_used} tokens - {self.action}>"
    
    def __repr__(self):
        return f"<TokenUsage {self.tokens_used} tokens - {self.action}>"
