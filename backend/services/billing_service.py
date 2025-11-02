# Billing and subscription management improvements
from typing import Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.subscription import Subscription, SubscriptionTier, SubscriptionStatus
from models.user import User
from services.email_service import email_service
from services.telegram_service import telegram_service
import asyncio

class BillingService:
    """Enhanced billing and subscription management"""
    
    # Token limits by tier
    TOKEN_LIMITS = {
        SubscriptionTier.FREE: 10_000,
        SubscriptionTier.PRO: 100_000,
        SubscriptionTier.ULTIMATE: 300_000
    }
    
    # Soft cap warnings (80% of limit)
    SOFT_CAP_THRESHOLD = 0.8
    
    async def check_token_limit(
        self,
        db: AsyncSession,
        user_id: str,
        tokens_to_use: int
    ) -> tuple[bool, str]:
        """Check if user can use tokens (with soft/hard caps)"""
        
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            return False, "No subscription found"
        
        # Check if subscription is active
        if subscription.status != SubscriptionStatus.ACTIVE:
            return False, "Subscription is not active"
        
        # Get current usage
        tokens_remaining = subscription.tokens_remaining
        token_limit = self.TOKEN_LIMITS[subscription.tier]
        
        # Check hard cap
        if tokens_remaining < tokens_to_use:
            return False, f"Token limit exceeded. You have {tokens_remaining} tokens remaining."
        
        # Check soft cap (warning)
        usage_percentage = (token_limit - tokens_remaining) / token_limit
        if usage_percentage >= self.SOFT_CAP_THRESHOLD and usage_percentage < 1.0:
            # Send warning email (async, don't wait)
            user_result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = user_result.scalar_one_or_none()
            
            if user:
                asyncio.create_task(
                    email_service.send_email(
                        to=user.email,
                        subject="⚠️ Token Limit Warning",
                        html=f"""
                        <h2>You're running low on tokens!</h2>
                        <p>You have used {usage_percentage*100:.0f}% of your monthly tokens.</p>
                        <p>Remaining: {tokens_remaining} tokens</p>
                        <p><a href="http://localhost:3000/account">Upgrade your plan</a></p>
                        """
                    )
                )
        
        return True, "OK"
    
    async def consume_tokens(
        self,
        db: AsyncSession,
        user_id: str,
        tokens_used: int
    ) -> bool:
        """Consume tokens from user's subscription"""
        
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            return False
        
        if subscription.tokens_remaining < tokens_used:
            return False
        
        subscription.tokens_remaining -= tokens_used
        await db.commit()
        
        return True
    
    async def reset_monthly_tokens(self, db: AsyncSession):
        """Reset tokens for all active subscriptions (run monthly via cron)"""
        
        result = await db.execute(
            select(Subscription).where(
                Subscription.status == SubscriptionStatus.ACTIVE
            )
        )
        subscriptions = result.scalars().all()
        
        reset_count = 0
        for subscription in subscriptions:
            # Reset to tier limit
            subscription.tokens_remaining = self.TOKEN_LIMITS[subscription.tier]
            reset_count += 1
        
        await db.commit()
        
        # Notify admin
        await telegram_service.send_message(
            f"🔄 Monthly token reset complete. {reset_count} subscriptions updated."
        )
        
        return reset_count
    
    async def apply_free_trial(
        self,
        db: AsyncSession,
        user_id: str,
        trial_days: int = 7
    ) -> bool:
        """Apply free trial to new user"""
        
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            return False
        
        # Check if already had trial
        if subscription.trial_ends_at:
            return False  # Already used trial
        
        # Apply PRO trial
        subscription.tier = SubscriptionTier.PRO
        subscription.tokens_remaining = self.TOKEN_LIMITS[SubscriptionTier.PRO]
        subscription.trial_ends_at = datetime.utcnow() + timedelta(days=trial_days)
        
        await db.commit()
        
        # Send email
        user_result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = user_result.scalar_one_or_none()
        
        if user:
            await email_service.send_email(
                to=user.email,
                subject="🎉 Your Free Trial Has Started!",
                html=f"""
                <h2>Welcome to Lexent AI PRO!</h2>
                <p>You now have {trial_days} days of free PRO access with:</p>
                <ul>
                    <li>100,000 tokens</li>
                    <li>5 books</li>
                    <li>All AI modes</li>
                </ul>
                <p>Trial ends: {subscription.trial_ends_at.strftime('%Y-%m-%d')}</p>
                """
            )
        
        return True
    
    async def check_and_expire_trials(self, db: AsyncSession):
        """Check and expire free trials (run daily via cron)"""
        
        now = datetime.utcnow()
        
        result = await db.execute(
            select(Subscription, User)
            .join(User)
            .where(
                Subscription.trial_ends_at != None,
                Subscription.trial_ends_at <= now,
                Subscription.status == SubscriptionStatus.ACTIVE
            )
        )
        
        expired_trials = result.all()
        
        for subscription, user in expired_trials:
            # Downgrade to free
            subscription.tier = SubscriptionTier.FREE
            subscription.tokens_remaining = self.TOKEN_LIMITS[SubscriptionTier.FREE]
            subscription.trial_ends_at = None
            
            # Send email
            await email_service.send_email(
                to=user.email,
                subject="Your Free Trial Has Ended",
                html="""
                <h2>Thanks for trying Librarity PRO!</h2>
                <p>Your free trial has ended. You've been downgraded to the Free plan.</p>
                <p><a href="http://localhost:3000/account">Upgrade to continue PRO features</a></p>
                """
            )
        
        await db.commit()
        
        return len(expired_trials)
    
    async def get_usage_stats(
        self,
        db: AsyncSession,
        user_id: str
    ) -> dict:
        """Get detailed usage statistics for user"""
        
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            return {}
        
        token_limit = self.TOKEN_LIMITS[subscription.tier]
        tokens_used = token_limit - subscription.tokens_remaining
        usage_percentage = (tokens_used / token_limit) * 100
        
        return {
            "tier": subscription.tier.value,
            "status": subscription.status.value,
            "token_limit": token_limit,
            "tokens_used": tokens_used,
            "tokens_remaining": subscription.tokens_remaining,
            "usage_percentage": round(usage_percentage, 2),
            "books_uploaded": subscription.books_uploaded or 0,
            "max_books": subscription.max_books,
            "trial_ends_at": subscription.trial_ends_at.isoformat() if subscription.trial_ends_at else None
        }

billing_service = BillingService()
