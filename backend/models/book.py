"""
Book Model - Uploaded books and their metadata
"""
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Boolean, Float, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from core.database import Base


class Book(Base):
    """Book model for uploaded and processed books"""
    __tablename__ = "books"
    
    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_owner_created', 'owner_id', 'created_at'),
        Index('idx_owner_status', 'owner_id', 'processing_status'),
        Index('idx_owner_processed', 'owner_id', 'is_processed'),
        Index('idx_file_hash_owner', 'file_hash', 'owner_id'),
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Book metadata
    title = Column(String(500), nullable=False)
    author = Column(String(255), nullable=True)
    isbn = Column(String(20), nullable=True)
    publisher = Column(String(255), nullable=True)
    publication_year = Column(Integer, nullable=True)
    language = Column(String(10), default="en", nullable=False)
    
    # File info
    original_filename = Column(String(500), nullable=False)
    file_type = Column(String(10), nullable=False)  # pdf, epub, txt
    file_size = Column(Integer, nullable=False)  # bytes
    file_path = Column(String(1000), nullable=False)  # S3 or local path
    file_hash = Column(String(64), nullable=True, index=True)  # SHA256 hash for deduplication
    
    # Processing info
    total_pages = Column(Integer, nullable=True)
    total_words = Column(Integer, nullable=True)
    total_chunks = Column(Integer, default=0, nullable=False)
    
    # Status
    is_processed = Column(Boolean, default=False, nullable=False)
    processing_status = Column(String(50), default="pending", nullable=False)  # pending, processing, completed, failed
    processing_error = Column(Text, nullable=True)
    
    # Vector database info
    qdrant_collection_id = Column(String(100), nullable=True)
    embedding_model = Column(String(100), nullable=True)
    
    # Additional metadata
    description = Column(Text, nullable=True)
    cover_image_url = Column(String(1000), nullable=True)
    extra_metadata = Column(JSONB, nullable=True)  # Flexible field for extra data
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    processed_at = Column(DateTime, nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="books")
    chats = relationship("Chat", back_populates="book", cascade="all, delete-orphan")
    
    @property
    def is_ready_for_chat(self) -> bool:
        """Check if book is ready for chat"""
        return self.is_processed and self.processing_status == "completed"
    
    def __repr__(self):
        # Use object.__getattribute__ to avoid triggering lazy loading
        try:
            title = object.__getattribute__(self, '_sa_instance_state').dict.get('title', 'Unknown')
            author = object.__getattribute__(self, '_sa_instance_state').dict.get('author', 'Unknown')
            return f"<Book {title} by {author}>"
        except:
            return f"<Book id={self.id}>"
