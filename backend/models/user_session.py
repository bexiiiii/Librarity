"""
User Session Model - Track active user sessions and time in app
"""
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid

from core.database import Base


class UserSession(Base):
    """Track user sessions for active users and time in app metrics"""
    __tablename__ = "user_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Session tracking
    session_token = Column(String(255), unique=True, index=True, nullable=False)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Time tracking
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_active_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    
    # Duration in seconds (calculated when session ends)
    duration_seconds = Column(Integer, default=0, nullable=False)
    
    # Activity tracking
    chat_interactions = Column(Integer, default=0, nullable=False)  # Number of chat messages sent
    books_interacted = Column(Integer, default=0, nullable=False)  # Number of different books accessed
    
    # Status
    is_active = Column(String(20), default=True, nullable=False)  # Active session or ended
    
    # Indexes for fast queries
    __table_args__ = (
        Index('idx_user_session_user_active', 'user_id', 'is_active'),
        Index('idx_user_session_started', 'started_at'),
        Index('idx_user_session_last_active', 'last_active_at'),
    )
    
    def __repr__(self):
        return f"<UserSession user_id={self.user_id} started={self.started_at}>"


class UserReferral(Base):
    """Track user referrals for viral coefficient calculation"""
    __tablename__ = "user_referrals"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Referrer (who invited)
    referrer_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Referred (who was invited)
    referred_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Tracking
    referral_code = Column(String(50), nullable=True)
    referral_source = Column(String(100), nullable=True)  # 'share', 'invite_link', 'social', etc.
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Check if referred user became active (made at least 1 chat or uploaded 1 book)
    is_active_referral = Column(String(20), default=False, nullable=False)
    activated_at = Column(DateTime(timezone=True), nullable=True)
    
    # Indexes
    __table_args__ = (
        Index('idx_referral_referrer', 'referrer_user_id'),
        Index('idx_referral_referred', 'referred_user_id'),
        Index('idx_referral_created', 'created_at'),
    )
    
    def __repr__(self):
        return f"<UserReferral referrer={self.referrer_user_id} referred={self.referred_user_id}>"
