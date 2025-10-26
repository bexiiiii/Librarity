# Shared Content model
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Boolean, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base
import uuid

class SharedContent(Base):
    """User-shared content (quotes, answers, book cards)"""
    __tablename__ = "shared_content"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    book_id = Column(UUID(as_uuid=True), ForeignKey("books.id", ondelete="SET NULL"), nullable=True)
    
    # Content
    content_type = Column(String, nullable=False)  # 'quote', 'answer', 'book_card', 'ai_summary'
    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    
    # Design
    theme = Column(String, default='gradient_purple')  # Card design theme
    background_image = Column(String, nullable=True)
    
    # Social
    share_url = Column(String, nullable=True, unique=True, index=True)  # Short URL
    platform = Column(String, nullable=True)  # 'tiktok', 'instagram', 'twitter', 'linkedin'
    
    # Analytics
    view_count = Column(Integer, default=0)
    share_count = Column(Integer, default=0)
    like_count = Column(Integer, default=0)
    
    # Visibility
    is_public = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)  # Featured by admin
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    book = relationship("Book")
    
    # Indexes
    __table_args__ = (
        Index('idx_shared_content_user', 'user_id'),
        Index('idx_shared_content_public', 'is_public', 'created_at'),
        Index('idx_shared_content_featured', 'is_featured'),
    )
