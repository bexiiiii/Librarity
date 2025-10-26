# Leaderboard model
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base
import uuid

class Leaderboard(Base):
    """User activity leaderboard"""
    __tablename__ = "leaderboard"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Activity stats
    total_books_read = Column(Integer, default=0)
    total_chats = Column(Integer, default=0)
    total_tokens_used = Column(Integer, default=0)
    total_shares = Column(Integer, default=0)
    
    # Engagement metrics
    streak_days = Column(Integer, default=0)  # Consecutive days active
    last_active_date = Column(DateTime(timezone=True), nullable=True)
    
    # Rankings
    rank = Column(Integer, nullable=True, index=True)
    previous_rank = Column(Integer, nullable=True)
    
    # Achievements
    achievements = Column(String, nullable=True)  # JSON array of badges
    
    # Visibility
    is_public = Column(Boolean, default=True)  # User can hide from leaderboard
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", back_populates="leaderboard")
    
    # Indexes
    __table_args__ = (
        Index('idx_leaderboard_rank', 'rank'),
        Index('idx_leaderboard_books', 'total_books_read'),
        Index('idx_leaderboard_chats', 'total_chats'),
    )
