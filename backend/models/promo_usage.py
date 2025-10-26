"""
Promo Usage Model - Track which users used which promo codes
"""
from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from core.database import Base


class PromoUsage(Base):
    """Track promo code usage by users"""
    __tablename__ = "promo_usage"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Relationships
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    promo_code_id = Column(UUID(as_uuid=True), ForeignKey("promo_codes.id"), nullable=False, index=True)
    
    # Timestamp
    used_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    
    # Ensure one user can only use a promo code once
    __table_args__ = (
        UniqueConstraint('user_id', 'promo_code_id', name='uq_user_promo'),
    )
    
    def __repr__(self):
        return f"<PromoUsage {self.user_id} - {self.promo_code_id}>"
