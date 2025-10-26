"""
Polar.sh Integration Service - Subscription management and webhooks
"""
from typing import Optional, Dict, Any
import httpx
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from core.config import settings
from models.subscription import Subscription, SubscriptionTier, SubscriptionStatus
from models.user import User

logger = structlog.get_logger()


class PolarService:
    """Service for Polar.sh API integration"""
    
    def __init__(self):
        self.api_url = settings.POLAR_API_URL
        self.api_key = settings.POLAR_API_KEY
        self.org_id = settings.POLAR_ORGANIZATION_ID
        
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def create_checkout_session(
        self,
        user_email: str,
        tier: SubscriptionTier,
        billing_interval: str = "monthly"
    ) -> Dict[str, Any]:
        """Create a Polar checkout session"""
        # Map tier to Polar product
        product_ids = {
            SubscriptionTier.PRO: "pro_product_id",
            SubscriptionTier.ULTIMATE: "ultimate_product_id"
        }
        
        product_id = product_ids.get(tier)
        if not product_id:
            raise ValueError(f"Invalid tier: {tier}")
        
        payload = {
            "product_id": product_id,
            "customer_email": user_email,
            "success_url": f"{settings.CORS_ORIGINS[0]}/subscription/success",
            "cancel_url": f"{settings.CORS_ORIGINS[0]}/subscription/cancel"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.api_url}/v1/checkouts",
                    json=payload,
                    headers=self.headers
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logger.error("polar_checkout_failed", error=str(e))
                raise
    
    async def handle_webhook(
        self,
        db: AsyncSession,
        event_type: str,
        data: Dict[str, Any]
    ) -> None:
        """Handle Polar webhook events"""
        logger.info("polar_webhook_received", event_type=event_type)
        
        if event_type == "subscription.created":
            await self._handle_subscription_created(db, data)
        elif event_type == "subscription.updated":
            await self._handle_subscription_updated(db, data)
        elif event_type == "subscription.cancelled":
            await self._handle_subscription_cancelled(db, data)
        elif event_type == "payment.succeeded":
            await self._handle_payment_succeeded(db, data)
        else:
            logger.warning("unknown_webhook_event", event_type=event_type)
    
    async def _handle_subscription_created(
        self,
        db: AsyncSession,
        data: Dict[str, Any]
    ) -> None:
        """Handle subscription creation"""
        customer_email = data.get("customer_email")
        polar_subscription_id = data.get("id")
        product_id = data.get("product_id")
        
        # Find user by email
        result = await db.execute(
            select(User).where(User.email == customer_email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            logger.error("user_not_found_for_subscription", email=customer_email)
            return
        
        # Determine tier from product_id
        tier = self._get_tier_from_product(product_id)
        
        # Get or create subscription
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user.id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            subscription = Subscription(user_id=user.id)
            db.add(subscription)
        
        # Update subscription
        subscription.tier = tier
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.polar_subscription_id = polar_subscription_id
        subscription.polar_product_id = product_id
        subscription.token_limit = settings.token_limit_by_tier[tier.value]
        subscription.current_period_start = datetime.utcnow()
        subscription.current_period_end = datetime.utcnow() + timedelta(days=30)
        
        # Set features based on tier
        if tier == SubscriptionTier.PRO:
            subscription.max_books = 5
            subscription.has_citation_mode = True
            subscription.has_coach_mode = True
            subscription.price = 9.0
        elif tier == SubscriptionTier.ULTIMATE:
            subscription.max_books = 999
            subscription.has_citation_mode = True
            subscription.has_author_mode = True
            subscription.has_coach_mode = True
            subscription.has_analytics = True
            subscription.price = 19.0
        
        await db.commit()
        
        logger.info(
            "subscription_created",
            user_id=str(user.id),
            tier=tier,
            polar_id=polar_subscription_id
        )
    
    async def _handle_subscription_updated(
        self,
        db: AsyncSession,
        data: Dict[str, Any]
    ) -> None:
        """Handle subscription update"""
        polar_subscription_id = data.get("id")
        
        result = await db.execute(
            select(Subscription).where(
                Subscription.polar_subscription_id == polar_subscription_id
            )
        )
        subscription = result.scalar_one_or_none()
        
        if subscription:
            # Update subscription details
            subscription.updated_at = datetime.utcnow()
            await db.commit()
            
            logger.info("subscription_updated", subscription_id=str(subscription.id))
    
    async def _handle_subscription_cancelled(
        self,
        db: AsyncSession,
        data: Dict[str, Any]
    ) -> None:
        """Handle subscription cancellation"""
        polar_subscription_id = data.get("id")
        
        result = await db.execute(
            select(Subscription).where(
                Subscription.polar_subscription_id == polar_subscription_id
            )
        )
        subscription = result.scalar_one_or_none()
        
        if subscription:
            subscription.status = SubscriptionStatus.CANCELLED
            subscription.cancelled_at = datetime.utcnow()
            await db.commit()
            
            logger.info("subscription_cancelled", subscription_id=str(subscription.id))
    
    async def _handle_payment_succeeded(
        self,
        db: AsyncSession,
        data: Dict[str, Any]
    ) -> None:
        """Handle successful payment - reset tokens"""
        polar_subscription_id = data.get("subscription_id")
        
        result = await db.execute(
            select(Subscription).where(
                Subscription.polar_subscription_id == polar_subscription_id
            )
        )
        subscription = result.scalar_one_or_none()
        
        if subscription:
            # Reset tokens for new billing period
            subscription.tokens_used = 0
            subscription.tokens_reset_at = datetime.utcnow() + timedelta(days=30)
            subscription.current_period_start = datetime.utcnow()
            subscription.current_period_end = datetime.utcnow() + timedelta(days=30)
            await db.commit()
            
            logger.info("payment_succeeded_tokens_reset", subscription_id=str(subscription.id))
    
    def _get_tier_from_product(self, product_id: str) -> SubscriptionTier:
        """Map Polar product ID to subscription tier"""
        # This mapping should match your Polar products
        if "pro" in product_id.lower():
            return SubscriptionTier.PRO
        elif "ultimate" in product_id.lower():
            return SubscriptionTier.ULTIMATE
        else:
            return SubscriptionTier.FREE


# Global instance
polar_service = PolarService()
