# Book Summary model
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base
import uuid

class BookSummary(Base):
    """AI-generated summary and metadata for books"""
    __tablename__ = "book_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    book_id = Column(UUID(as_uuid=True), ForeignKey("books.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # AI-generated content
    short_summary = Column(Text, nullable=True)  # 2-3 sentences
    long_summary = Column(Text, nullable=True)   # 2-3 paragraphs
    key_topics = Column(Text, nullable=True)     # JSON array of topics
    key_quotes = Column(Text, nullable=True)     # JSON array of best quotes
    
    # Metadata
    genre = Column(String, nullable=True)
    reading_time_minutes = Column(Integer, nullable=True)
    difficulty_level = Column(String, nullable=True)  # 'beginner', 'intermediate', 'advanced'
    
    # SEO
    seo_title = Column(String, nullable=True)
    seo_description = Column(Text, nullable=True)
    slug = Column(String, nullable=True, unique=True, index=True)
    
    # Social sharing
    share_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    book = relationship("Book", back_populates="summary")
