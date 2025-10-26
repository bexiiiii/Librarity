"""
Chat Model - Conversation history with AI
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Float, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from core.database import Base


class ChatMode(str, enum.Enum):
    """Chat interaction modes"""
    BOOK_BRAIN = "book_brain"  # Chat with book's knowledge
    AUTHOR = "author"  # Chat as the author
    COACH = "coach"  # AI coaching mode
    CITATION = "citation"  # With page citations


class Chat(Base):
    """Chat conversation model"""
    __tablename__ = "chats"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    book_id = Column(UUID(as_uuid=True), ForeignKey("books.id", ondelete="CASCADE"), nullable=False)
    
    # Session info
    session_id = Column(UUID(as_uuid=True), default=uuid.uuid4, nullable=False, index=True)
    mode = Column(SQLEnum(ChatMode), default=ChatMode.BOOK_BRAIN, nullable=False)
    
    # Message content
    user_message = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    
    # Context and citations
    context_used = Column(JSONB, nullable=True)  # Retrieved chunks
    citations = Column(JSONB, nullable=True)  # Page numbers, chapters
    relevance_score = Column(Float, nullable=True)
    
    # Token usage
    tokens_used = Column(Integer, default=0, nullable=False)
    prompt_tokens = Column(Integer, default=0, nullable=False)
    completion_tokens = Column(Integer, default=0, nullable=False)
    
    # Metadata
    extra_metadata = Column(JSONB, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="chats")
    book = relationship("Book", back_populates="chats")
    
    def __repr__(self):
        return f"<Chat {self.id} - {self.mode}>"
