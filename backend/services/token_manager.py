"""
Token Manager Service - Track and enforce token limits
"""
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status
import structlog

from models.subscription import Subscription, SubscriptionTier
from models.token_usage import TokenUsage
from models.user import User
from core.config import settings

logger = structlog.get_logger()


class TokenManager:
    """Manage token usage and limits"""
    
    @staticmethod
    async def check_token_limit(
        db: AsyncSession,
        user_id: str,
        tokens_needed: int
    ) -> bool:
        """Check if user has enough tokens"""
        # Get user's subscription
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )
        
        # Check if user has enough tokens
        if subscription.tokens_used + tokens_needed > subscription.token_limit:
            logger.warning(
                "token_limit_exceeded",
                user_id=user_id,
                tokens_used=subscription.tokens_used,
                tokens_needed=tokens_needed,
                token_limit=subscription.token_limit
            )
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": "Token limit exceeded",
                    "message": "You've reached your token limit. Please upgrade your plan.",
                    "current_tier": subscription.tier,
                    "tokens_used": subscription.tokens_used,
                    "token_limit": subscription.token_limit,
                    "tokens_needed": tokens_needed
                }
            )
        
        return True
    
    @staticmethod
    async def consume_tokens(
        db: AsyncSession,
        user_id: str,
        tokens_used: int,
        action: str,
        mode: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> None:
        """Consume tokens and record usage"""
        # Update subscription
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        subscription = result.scalar_one_or_none()
        
        if subscription:
            subscription.tokens_used += tokens_used
            
            # Create usage record
            usage = TokenUsage(
                user_id=user_id,
                tokens_used=tokens_used,
                action=action,
                mode=mode,
                metadata=metadata
            )
            db.add(usage)
            
            await db.commit()
            
            logger.info(
                "tokens_consumed",
                user_id=user_id,
                tokens_used=tokens_used,
                action=action,
                total_used=subscription.tokens_used
            )
    
    @staticmethod
    async def get_usage_stats(
        db: AsyncSession,
        user_id: str
    ) -> dict:
        """Get token usage statistics"""
        # Get subscription
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            return {
                "total_tokens": 0,
                "tokens_limit": 0,
                "tokens_remaining": 0,
                "usage_percentage": 0.0
            }
        
        # Get usage today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        result = await db.execute(
            select(func.sum(TokenUsage.tokens_used)).where(
                TokenUsage.user_id == user_id,
                TokenUsage.created_at >= today_start
            )
        )
        today_usage = result.scalar() or 0
        
        # Get usage this week
        week_start = today_start - timedelta(days=today_start.weekday())
        result = await db.execute(
            select(func.sum(TokenUsage.tokens_used)).where(
                TokenUsage.user_id == user_id,
                TokenUsage.created_at >= week_start
            )
        )
        week_usage = result.scalar() or 0
        
        # Get usage this month
        month_start = today_start.replace(day=1)
        result = await db.execute(
            select(func.sum(TokenUsage.tokens_used)).where(
                TokenUsage.user_id == user_id,
                TokenUsage.created_at >= month_start
            )
        )
        month_usage = result.scalar() or 0
        
        return {
            "total_tokens": subscription.tokens_used,
            "tokens_limit": subscription.token_limit,
            "tokens_remaining": subscription.tokens_remaining,
            "usage_percentage": subscription.tokens_usage_percentage,
            "today": today_usage,
            "this_week": week_usage,
            "this_month": month_usage,
            "reset_at": subscription.tokens_reset_at
        }
    
    @staticmethod
    async def reset_tokens(db: AsyncSession, user_id: str) -> None:
        """Reset token usage (for new billing period)"""
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        subscription = result.scalar_one_or_none()
        
        if subscription:
            subscription.tokens_used = 0
            subscription.tokens_reset_at = datetime.utcnow() + timedelta(days=30)
            await db.commit()
            
            logger.info("tokens_reset", user_id=user_id)


# Global instance
token_manager = TokenManager()
