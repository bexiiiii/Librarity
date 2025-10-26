"""
Token Usage Model - Track token consumption for analytics
"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Float, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from core.database import Base
from models.chat import ChatMode


class TokenUsage(Base):
    """Token usage tracking for billing and analytics"""
    __tablename__ = "token_usage"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Usage details
    tokens_used = Column(Integer, nullable=False)
    prompt_tokens = Column(Integer, default=0, nullable=False)
    completion_tokens = Column(Integer, default=0, nullable=False)
    
    # Context
    action = Column(String(100), nullable=False)  # chat, upload, embed, etc.
    mode = Column(SQLEnum(ChatMode), nullable=True)
    
    # Cost estimation (based on Gemini pricing)
    estimated_cost = Column(Float, default=0.0, nullable=False)
    
    # Metadata
    extra_metadata = Column(JSONB, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="token_usage")
    
    def __repr__(self):
        return f"<TokenUsage {self.tokens_used} tokens - {self.action}>"
