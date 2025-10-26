"""
Promo Code Model - Discount codes for subscriptions
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid
import enum

from core.database import Base


class PromoTier(str, enum.Enum):
    """Promo code tier enumeration"""
    PRO = "pro"
    ULTIMATE = "ultimate"


class PromoCode(Base):
    """Promo code model for discount codes"""
    __tablename__ = "promo_codes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Code details
    code = Column(String(50), unique=True, nullable=False, index=True)
    discount_percent = Column(Integer, nullable=False)  # 1-100
    
    # Usage limits
    max_uses = Column(Integer, nullable=False, default=1)
    current_uses = Column(Integer, nullable=False, default=0)
    
    # Tier restriction
    tier = Column(SQLEnum(PromoTier), nullable=False)
    
    # Status
    is_active = Column(Boolean, nullable=False, default=True)
    
    # Timestamps
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    def __repr__(self):
        return f"<PromoCode {self.code} ({self.discount_percent}% off)>"
    
    @property
    def is_valid(self):
        """Check if promo code is still valid"""
        if not self.is_active:
            return False
        if self.current_uses >= self.max_uses:
            return False
        if datetime.now(timezone.utc) > self.expires_at:
            return False
        return True
    
    @property
    def remaining_uses(self):
        """Get remaining uses"""
        return max(0, self.max_uses - self.current_uses)
