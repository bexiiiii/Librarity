# Book Vector Status model
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Boolean, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base
import uuid
import enum

class VectorStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class BookVectorStatus(Base):
    """Track book embedding/vectorization status"""
    __tablename__ = "book_vector_status"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    book_id = Column(UUID(as_uuid=True), ForeignKey("books.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Processing status
    status = Column(String, default=VectorStatus.PENDING)
    
    # Processing details
    total_chunks = Column(Integer, default=0)
    processed_chunks = Column(Integer, default=0)
    failed_chunks = Column(Integer, default=0)
    
    # Progress
    progress_percentage = Column(Float, default=0.0)
    
    # Timing
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Error handling
    error_message = Column(String, nullable=True)
    retry_count = Column(Integer, default=0)
    
    # Metadata
    embedding_model = Column(String, nullable=True)  # e.g., 'gemini-embedding-001'
    vector_dimensions = Column(Integer, nullable=True)
    collection_name = Column(String, nullable=True)  # Qdrant collection
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    book = relationship("Book", back_populates="vector_status")

    @property
    def is_ready(self) -> bool:
        """Check if book is ready for chat"""
        return self.status == VectorStatus.COMPLETED and self.progress_percentage == 100.0
