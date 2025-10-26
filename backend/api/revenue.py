from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional
import secrets
import string

from core.database import get_db
from models.user import User, UserRole
from models.promo_code import PromoCode, PromoTier
from models.payment import Payment, PaymentStatus
from api.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin-revenue"])


# ==================== PROMO CODES ====================

class PromoCodeCreate(BaseModel):
    code: str
    discount_percent: int
    max_uses: int
    tier: str
    expires_days: int


class PromoCodeToggle(BaseModel):
    is_active: bool


# We'll create a PromoCode model later
# For now, using a simple structure

@router.get("/promo-codes")
async def get_promo_codes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all promo codes"""
    
    # Admin only
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get promo codes from database
    result = await db.execute(
        select(PromoCode)
        .order_by(PromoCode.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    promo_codes = result.scalars().all()
    
    # Get total count
    count_result = await db.execute(select(func.count(PromoCode.id)))
    total = count_result.scalar() or 0
    
    # Format response
    codes_data = []
    for code in promo_codes:
        codes_data.append({
            "id": str(code.id),
            "code": code.code,
            "discount_percent": code.discount_percent,
            "max_uses": code.max_uses,
            "current_uses": code.current_uses,
            "tier": code.tier.value,
            "is_active": code.is_active,
            "expires_at": code.expires_at.isoformat(),
            "created_at": code.created_at.isoformat(),
        })
    
    return {
        "promo_codes": codes_data,
        "total": total,
    }


@router.post("/promo-codes")
async def create_promo_code(
    data: PromoCodeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new promo code"""
    
    # Admin only
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Validate tier
    if data.tier not in ["pro", "ultimate"]:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    # Validate discount
    if data.discount_percent < 1 or data.discount_percent > 100:
        raise HTTPException(status_code=400, detail="Discount must be between 1 and 100")
    
    # Calculate expiration date
    expires_at = datetime.utcnow() + timedelta(days=data.expires_days)
    
    # Check if code already exists
    existing = await db.execute(
        select(PromoCode).where(PromoCode.code == data.code.upper())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Promo code already exists")
    
    # Create promo code
    promo_code = PromoCode(
        code=data.code.upper(),
        discount_percent=data.discount_percent,
        max_uses=data.max_uses,
        current_uses=0,
        tier=PromoTier(data.tier),
        expires_at=expires_at,
        is_active=True
    )
    
    db.add(promo_code)
    await db.commit()
    await db.refresh(promo_code)
    
    return {
        "success": True,
        "message": "Promo code created successfully",
        "promo_code": {
            "id": str(promo_code.id),
            "code": promo_code.code,
            "discount_percent": promo_code.discount_percent,
            "max_uses": promo_code.max_uses,
            "current_uses": promo_code.current_uses,
            "tier": promo_code.tier.value,
            "expires_at": promo_code.expires_at.isoformat(),
            "is_active": promo_code.is_active
        }
    }


@router.patch("/promo-codes/{code_id}")
async def toggle_promo_code(
    code_id: str,
    data: PromoCodeToggle,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Toggle promo code active status"""
    
    # Admin only
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Find promo code
    result = await db.execute(
        select(PromoCode).where(PromoCode.id == code_id)
    )
    promo_code = result.scalar_one_or_none()
    
    if not promo_code:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    # Toggle status
    promo_code.is_active = data.is_active
    await db.commit()
    await db.refresh(promo_code)
    
    return {
        "success": True,
        "message": f"Promo code {'activated' if data.is_active else 'deactivated'}",
        "promo_code": {
            "id": str(promo_code.id),
            "code": promo_code.code,
            "is_active": promo_code.is_active
        }
    }


@router.delete("/promo-codes/{code_id}")
async def delete_promo_code(
    code_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a promo code"""
    
    # Admin only
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Find promo code
    result = await db.execute(
        select(PromoCode).where(PromoCode.id == code_id)
    )
    promo_code = result.scalar_one_or_none()
    
    if not promo_code:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    # Delete promo code
    await db.delete(promo_code)
    await db.commit()
    
    return {
        "success": True,
        "message": "Promo code deleted successfully"
    }


# ==================== REVENUE & PAYMENTS ====================

@router.get("/revenue/stats")
async def get_revenue_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get revenue statistics"""
    
    # Admin only
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Count paying users (pro + ultimate)
    from models.subscription import Subscription
    
    paying_users_result = await db.execute(
        select(func.count(Subscription.id))
        .where(Subscription.tier.in_(["pro", "ultimate"]))
        .where(Subscription.is_active == True)
    )
    paying_users = paying_users_result.scalar() or 0
    
    # Get total users for conversion rate
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0
    
    conversion_rate = (paying_users / total_users * 100) if total_users > 0 else 0
    
    # TODO: Implement payment tracking
    # For now using subscription counts as proxy
    return {
        "total_revenue": 0.0,  # Requires payment tracking
        "monthly_revenue": 0.0,  # Requires payment tracking
        "paying_users": paying_users,
        "conversion_rate": round(conversion_rate, 2),
        "note": "Payment tracking system needs implementation"
    }


@router.get("/payments")
async def get_payment_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get payment history"""
    
    # Admin only
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # TODO: Create Payment model and track transactions
    # This would integrate with Polar.sh or other payment provider
    
    return {
        "payments": [],
        "total": 0,
        "page": page,
        "page_size": page_size,
        "note": "Payment model and provider integration needed"
    }


# ==================== USER TIER MANAGEMENT ====================

class UserTierUpdate(BaseModel):
    tier: str


@router.patch("/users/{user_id}/tier")
async def update_user_tier(
    user_id: str,
    data: UserTierUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user's subscription tier (admin override)"""
    
    # Admin only
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Validate tier
    valid_tiers = ["free", "pro", "ultimate"]
    if data.tier not in valid_tiers:
        raise HTTPException(status_code=400, detail=f"Invalid tier. Must be one of: {valid_tiers}")
    
    # Get user
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get or create subscription
    from models.subscription import Subscription
    
    sub_result = await db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    )
    subscription = sub_result.scalar_one_or_none()
    
    if subscription:
        # Update existing subscription
        subscription.tier = data.tier
        subscription.is_active = True
        
        # Set token limits based on tier
        if data.tier == "free":
            subscription.token_limit = 10000
        elif data.tier == "pro":
            subscription.token_limit = 100000
        elif data.tier == "ultimate":
            subscription.token_limit = -1  # Unlimited
    else:
        # Create new subscription
        subscription = Subscription(
            user_id=user.id,
            tier=data.tier,
            is_active=True,
            token_limit=10000 if data.tier == "free" else 100000 if data.tier == "pro" else -1,
            tokens_used=0
        )
        db.add(subscription)
    
    await db.commit()
    await db.refresh(subscription)
    
    return {
        "message": f"User tier updated to {data.tier}",
        "user_id": str(user.id),
        "tier": data.tier,
        "token_limit": subscription.token_limit
    }


# ==================== USER BILLING HISTORY ====================

@router.get("/billing/history")
async def get_billing_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's billing history"""
    
    # Get user's payments
    result = await db.execute(
        select(Payment)
        .where(Payment.user_id == current_user.id)
        .order_by(Payment.created_at.desc())
        .limit(50)
    )
    payments = result.scalars().all()
    
    # Format payment data
    payment_history = []
    for payment in payments:
        payment_history.append({
            "id": str(payment.id),
            "date": payment.paid_at.isoformat() if payment.paid_at else payment.created_at.isoformat(),
            "amount": payment.formatted_amount,
            "status": payment.status.value,
            "invoice_url": payment.invoice_url,
            "subscription_tier": payment.subscription_tier,
            "subscription_period": payment.subscription_period,
            "payment_method": payment.payment_method.value,
        })
    
    return {
        "payments": payment_history,
        "total": len(payment_history)
    }
