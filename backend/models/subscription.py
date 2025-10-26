"""
Subscription Model - User subscription tiers and Polar.sh integration
"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Boolean, Integer, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from core.database import Base


class SubscriptionTier(str, enum.Enum):
    """Subscription tiers"""
    FREE = "free"
    PRO = "pro"
    ULTIMATE = "ultimate"


class SubscriptionStatus(str, enum.Enum):
    """Subscription statuses"""
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    TRIAL = "trial"
    PAUSED = "paused"


class Subscription(Base):
    """User subscription information"""
    __tablename__ = "subscriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Tier information
    tier = Column(SQLEnum(SubscriptionTier), default=SubscriptionTier.FREE, nullable=False)
    status = Column(SQLEnum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE, nullable=False)
    
    # Polar.sh integration
    polar_subscription_id = Column(String(255), unique=True, nullable=True, index=True)
    polar_customer_id = Column(String(255), nullable=True)
    polar_product_id = Column(String(255), nullable=True)
    
    # Billing
    price = Column(Float, default=0.0, nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    billing_interval = Column(String(20), nullable=True)  # monthly, yearly
    
    # Token limits
    token_limit = Column(Integer, default=10000, nullable=False)
    tokens_used = Column(Integer, default=0, nullable=False)
    tokens_reset_at = Column(DateTime, nullable=True)
    
    # Book limits
    max_books = Column(Integer, default=1, nullable=False)
    
    # Features
    has_citation_mode = Column(Boolean, default=False, nullable=False)
    has_author_mode = Column(Boolean, default=False, nullable=False)
    has_coach_mode = Column(Boolean, default=False, nullable=False)
    has_analytics = Column(Boolean, default=False, nullable=False)
    
    # Dates
    trial_ends_at = Column(DateTime, nullable=True)
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    
    # Metadata
    extra_metadata = Column(JSONB, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="subscription")
    
    def __repr__(self):
        return f"<Subscription {self.tier} - {self.status}>"
    
    @property
    def is_active(self) -> bool:
        """Check if subscription is active"""
        return self.status == SubscriptionStatus.ACTIVE
    
    @property
    def tokens_remaining(self) -> int:
        """Calculate remaining tokens"""
        return max(0, self.token_limit - self.tokens_used)
    
    @property
    def tokens_usage_percentage(self) -> float:
        """Calculate token usage percentage"""
        if self.token_limit == 0:
            return 0.0
        return (self.tokens_used / self.token_limit) * 100
