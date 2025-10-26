"""
Pydantic Schemas for API Request/Response validation
"""
from pydantic import BaseModel, EmailStr, Field, UUID4
from typing import Optional, List, Dict, Any
from datetime import datetime
from models.user import UserRole
from models.chat import ChatMode
from models.subscription import SubscriptionTier, SubscriptionStatus


# ============= User Schemas =============

class UserBase(BaseModel):
    email: EmailStr
    username: Optional[str] = None
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: UUID4
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


# ============= Book Schemas =============

class BookBase(BaseModel):
    title: str
    author: Optional[str] = None
    description: Optional[str] = None


class BookUpload(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None


class BookResponse(BookBase):
    id: UUID4
    owner_id: UUID4
    original_filename: str
    file_type: str
    file_size: int
    total_pages: Optional[int] = None
    total_words: Optional[int] = None
    total_chunks: int
    is_processed: bool
    processing_status: str
    created_at: datetime
    processed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class BookList(BaseModel):
    books: List[BookResponse]
    total: int
    page: int
    page_size: int


# ============= Chat Schemas =============

class ChatRequest(BaseModel):
    book_id: UUID4
    message: str = Field(..., min_length=1, max_length=10000)
    mode: ChatMode = ChatMode.BOOK_BRAIN
    session_id: Optional[UUID4] = None
    include_citations: bool = False


class Citation(BaseModel):
    page: Optional[int] = None
    chapter: Optional[str] = None
    text: str
    relevance_score: float


class ChatResponse(BaseModel):
    id: UUID4
    session_id: UUID4
    user_message: str
    ai_response: str
    mode: ChatMode
    citations: Optional[List[Citation]] = None
    tokens_used: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ChatHistory(BaseModel):
    chats: List[ChatResponse]
    total: int
    session_id: UUID4


class ChatMessage(BaseModel):
    """Single chat message with role"""
    role: str  # 'user' or 'assistant'
    content: str
    created_at: datetime


class ChatHistoryMessages(BaseModel):
    """Chat history as flat list of messages"""
    messages: List[ChatMessage]
    total: int
    session_id: UUID4


# ============= Subscription Schemas =============

class SubscriptionBase(BaseModel):
    tier: SubscriptionTier
    status: SubscriptionStatus


class SubscriptionResponse(SubscriptionBase):
    id: UUID4
    user_id: UUID4
    token_limit: int
    tokens_used: int
    tokens_remaining: int
    tokens_usage_percentage: float
    max_books: int
    has_citation_mode: bool
    has_author_mode: bool
    has_coach_mode: bool
    has_analytics: bool
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class SubscriptionUpgrade(BaseModel):
    tier: SubscriptionTier
    billing_interval: str = "monthly"


class PolarWebhook(BaseModel):
    """Polar.sh webhook payload"""
    type: str
    data: Dict[str, Any]


# ============= Token Usage Schemas =============

class TokenUsageResponse(BaseModel):
    total_tokens: int
    tokens_limit: int
    tokens_remaining: int
    usage_percentage: float
    reset_at: Optional[datetime] = None


class TokenUsageStats(BaseModel):
    today: int
    this_week: int
    this_month: int
    total: int
    by_mode: Dict[str, int]


# ============= Admin Schemas =============

class AdminStats(BaseModel):
    total_users: int
    active_users: int
    total_books: int
    total_chats: int
    total_tokens_used: int
    subscriptions_by_tier: Dict[str, int]


class AdminUserResponse(UserResponse):
    subscription: Optional[SubscriptionResponse] = None
    total_books: int = 0
    total_chats: int = 0
    total_tokens_used: int = 0


# ============= Common Schemas =============

class SuccessResponse(BaseModel):
    success: bool = True
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None
