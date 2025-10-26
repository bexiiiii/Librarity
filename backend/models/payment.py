"""
Payment Model - Track subscription payments and transactions
"""
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
import enum

from core.database import Base


class PaymentStatus(str, enum.Enum):
    """Payment status enumeration"""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class PaymentMethod(str, enum.Enum):
    """Payment method enumeration"""
    CARD = "card"
    POLAR = "polar"
    STRIPE = "stripe"
    MANUAL = "manual"


class Payment(Base):
    """Payment model for tracking transactions"""
    __tablename__ = "payments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # User relationship
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    user = relationship("User", back_populates="payments")
    
    # Payment details
    amount = Column(Float, nullable=False)  # Amount in USD
    currency = Column(String(3), nullable=False, default="USD")
    
    # Status
    status = Column(SQLEnum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING)
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False, default=PaymentMethod.POLAR)
    
    # External references
    external_payment_id = Column(String(255), nullable=True, index=True)  # Polar/Stripe payment ID
    invoice_url = Column(String(500), nullable=True)  # Link to invoice
    
    # Subscription info
    subscription_tier = Column(String(50), nullable=True)  # "pro", "ultimate"
    subscription_period = Column(String(50), nullable=True)  # "monthly", "yearly"
    
    # Timestamps
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    def __repr__(self):
        return f"<Payment {self.id} - ${self.amount} - {self.status.value}>"
    
    @property
    def formatted_amount(self):
        """Get formatted amount string"""
        return f"${self.amount:.2f}"
    
    @property
    def is_successful(self):
        """Check if payment was successful"""
        return self.status == PaymentStatus.COMPLETED
