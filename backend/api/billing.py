"""
Billing API Endpoints - User billing and payment management
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from core.database import get_db
from models.user import User
from models.payment import Payment, PaymentStatus
from models.promo_code import PromoCode
from api.auth import get_current_user

router = APIRouter(prefix="/billing", tags=["billing"])


# ==================== BILLING HISTORY ====================

@router.get("/history")
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


# ==================== PROMO CODE APPLICATION ====================

class ApplyPromoCodeRequest(BaseModel):
    code: str


@router.post("/apply-promo")
async def apply_promo_code(
    data: ApplyPromoCodeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Apply a promo code to user's account"""
    
    # Find promo code
    result = await db.execute(
        select(PromoCode).where(PromoCode.code == data.code.upper())
    )
    promo_code = result.scalar_one_or_none()
    
    if not promo_code:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    # Check if user already used this promo code
    from models.promo_usage import PromoUsage
    usage_result = await db.execute(
        select(PromoUsage).where(
            PromoUsage.user_id == current_user.id,
            PromoUsage.promo_code_id == promo_code.id
        )
    )
    existing_usage = usage_result.scalar_one_or_none()
    
    if existing_usage:
        raise HTTPException(status_code=400, detail="You have already used this promo code")
    
    # Check if promo code is valid
    if not promo_code.is_valid:
        if not promo_code.is_active:
            raise HTTPException(status_code=400, detail="Promo code is not active")
        if promo_code.current_uses >= promo_code.max_uses:
            raise HTTPException(status_code=400, detail="Promo code has reached maximum uses")
        if datetime.utcnow() > promo_code.expires_at:
            raise HTTPException(status_code=400, detail="Promo code has expired")
    
    # Record promo code usage
    promo_usage = PromoUsage(
        user_id=current_user.id,
        promo_code_id=promo_code.id
    )
    db.add(promo_usage)
    
    # Apply promo code
    promo_code.current_uses += 1
    
    # If 100% discount, upgrade user immediately
    if promo_code.discount_percent == 100:
        # Import Subscription model
        from models.subscription import Subscription
        from models.payment import PaymentMethod
        from datetime import timedelta
        from core.config import get_settings
        
        settings = get_settings()
        
        # Determine token limit based on tier
        if promo_code.tier.value == "pro":
            token_limit = settings.PRO_TIER_TOKEN_LIMIT
            max_books = 10
        elif promo_code.tier.value == "ultimate":
            token_limit = settings.ULTIMATE_TIER_TOKEN_LIMIT
            max_books = -1  # Unlimited
        else:
            token_limit = settings.FREE_TIER_TOKEN_LIMIT
            max_books = 1
        
        # Get or create subscription
        sub_result = await db.execute(
            select(Subscription).where(Subscription.user_id == current_user.id)
        )
        subscription = sub_result.scalar_one_or_none()
        
        if not subscription:
            subscription = Subscription(
                user_id=current_user.id,
                tier=promo_code.tier.value,
                status="active",
                token_limit=token_limit,
                tokens_used=0,
                max_books=max_books,
                has_citation_mode=True if promo_code.tier.value != "free" else False,
                has_author_mode=True if promo_code.tier.value != "free" else False,
                has_coach_mode=True if promo_code.tier.value == "ultimate" else False,
                has_analytics=True if promo_code.tier.value == "ultimate" else False,
                current_period_start=datetime.utcnow(),
                current_period_end=datetime.utcnow() + timedelta(days=30)
            )
            db.add(subscription)
        else:
            # Upgrade existing subscription
            subscription.tier = promo_code.tier.value
            subscription.status = "active"
            subscription.token_limit = token_limit
            subscription.tokens_used = 0  # Reset tokens on upgrade
            subscription.max_books = max_books
            subscription.has_citation_mode = True if promo_code.tier.value != "free" else False
            subscription.has_author_mode = True if promo_code.tier.value != "free" else False
            subscription.has_coach_mode = True if promo_code.tier.value == "ultimate" else False
            subscription.has_analytics = True if promo_code.tier.value == "ultimate" else False
            subscription.current_period_start = datetime.utcnow()
            subscription.current_period_end = datetime.utcnow() + timedelta(days=30)
        
        # Create payment record
        payment = Payment(
            user_id=current_user.id,
            amount=0.0,
            currency="USD",
            status=PaymentStatus.COMPLETED,
            payment_method=PaymentMethod.MANUAL,
            subscription_tier=promo_code.tier.value,
            subscription_period="monthly",
            paid_at=datetime.utcnow()
        )
        db.add(payment)
        
        await db.commit()
        
        return {
            "success": True,
            "message": f"Promo code applied! You've been upgraded to {promo_code.tier.value} tier for 30 days",
            "discount_percent": promo_code.discount_percent,
            "tier": promo_code.tier.value,
            "promo_code": promo_code.code,
            "upgraded": True
        }
    
    # For partial discounts, just store for next payment
    await db.commit()
    
    return {
        "success": True,
        "message": f"Promo code applied! You get {promo_code.discount_percent}% off {promo_code.tier.value} tier",
        "discount_percent": promo_code.discount_percent,
        "tier": promo_code.tier.value,
        "promo_code": promo_code.code,
        "upgraded": False
    }
