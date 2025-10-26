# OAuth Accounts model
from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base
import uuid

class OAuthAccount(Base):
    """OAuth provider accounts (Google, GitHub, etc.)"""
    __tablename__ = "oauth_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # OAuth details
    provider = Column(String, nullable=False)  # 'google', 'github'
    provider_user_id = Column(String, nullable=False)  # User ID from OAuth provider
    
    # Tokens
    access_token = Column(String, nullable=True)
    refresh_token = Column(String, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Profile data
    provider_email = Column(String, nullable=True)
    provider_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", back_populates="oauth_accounts")
    
    # Indexes
    __table_args__ = (
        Index('idx_oauth_provider_user', 'provider', 'provider_user_id', unique=True),
        Index('idx_oauth_user_provider', 'user_id', 'provider'),
    )
