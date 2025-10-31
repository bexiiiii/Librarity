"""
Polar.sh Integration Service - Subscription management and webhooks
Using official Polar Python SDK
"""
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from polar_sdk import Polar
from polar_sdk.models import CheckoutCreate

from core.config import settings
from models.subscription import Subscription, SubscriptionTier, SubscriptionStatus
from models.user import User
from models.payment import Payment, PaymentStatus, PaymentMethod

logger = structlog.get_logger()


class PolarService:
    """Service for Polar.sh API integration using official SDK"""
    
    def __init__(self):
        self.api_key = settings.POLAR_API_KEY
        self.org_id = settings.POLAR_ORGANIZATION_ID
        self.sandbox_mode = settings.POLAR_SANDBOX_MODE
        
        # Initialize Polar SDK client
        # Set server="sandbox" for testing or server="production" for live
        server = settings.POLAR_SERVER if settings.POLAR_SERVER else ("sandbox" if self.sandbox_mode else "production")
        
        self.client = Polar(
            access_token=self.api_key,
            server=server
        )
        
        logger.info(
            "polar_service_initialized",
            sandbox_mode=self.sandbox_mode,
            server=server,
            has_api_key=bool(self.api_key)
        )
    
    async def list_products(self) -> list:
        """List all available products/subscriptions"""
        try:
            result = self.client.products.list(
                organization_id=self.org_id
            )
            
            products = []
            # Handle ProductsListResponse structure
            if result and hasattr(result, 'result'):
                if hasattr(result.result, 'items'):
                    products = result.result.items
            elif result and hasattr(result, 'items'):
                products = result.items
            
            logger.info("polar_products_listed", count=len(products))
            return products
        except Exception as e:
            logger.error("polar_list_products_failed", error=str(e))
            return []
    
    async def get_product_by_name(self, name: str) -> Optional[Any]:
        """Get product by name (e.g., 'pro', 'ultimate')"""
        try:
            products = await self.list_products()
            for product in products:
                if hasattr(product, 'name') and name.lower() in product.name.lower():
                    return product
            return None
        except Exception as e:
            logger.error("polar_get_product_failed", name=name, error=str(e))
            return None
    
    async def create_checkout_session(
        self,
        user_email: str,
        tier: SubscriptionTier,
        success_url: str = None,
        billing_interval: str = "month"
    ) -> Dict[str, Any]:
        """Create a Polar checkout session using SDK"""
        try:
            # Get product based on tier
            product_name = tier.value  # "pro" or "ultimate"
            product = await self.get_product_by_name(product_name)
            
            if not product:
                raise ValueError(f"Product not found for tier: {tier.value}")
            
            # Set default URLs if not provided
            if not success_url:
                success_url = settings.POLAR_SUCCESS_URL
            
            # Get product ID and price ID
            product_id = product.id if hasattr(product, 'id') else str(product)
            
            # Get price ID from the first price
            price_id = None
            if hasattr(product, 'prices') and product.prices:
                first_price = product.prices[0]
                price_id = first_price.id if hasattr(first_price, 'id') else None
            
            if not price_id:
                raise ValueError(f"No price found for product: {product_name}")
            
            logger.info(
                "polar_checkout_data",
                product_id=product_id,
                price_id=price_id,
                user_email=user_email
            )
            
            # Create checkout session using dict approach
            # Use product_id, not product_price_id
            checkout_data = {
                "product_id": product_id,  # Use product_id
                "customer_email": user_email,
                "success_url": success_url,
            }
            
            # Use client's internal HTTP client directly
            import httpx
            base_url = "https://sandbox-api.polar.sh/v1" if self.sandbox_mode else "https://api.polar.sh/v1"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{base_url}/checkouts/",
                    json=checkout_data,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    }
                )
                
                # Log response for debugging (only on actual errors)
                if response.status_code >= 400:
                    logger.error(
                        "polar_api_error",
                        status_code=response.status_code,
                        response_text=response.text,
                        request_data=checkout_data
                    )
                
                response.raise_for_status()
                result = response.json()
            
            logger.info(
                "polar_checkout_created",
                user_email=user_email,
                tier=tier.value,
                checkout_id=result.get('id')
            )
            
            # Return structured response
            return {
                "id": result.get('id'),
                "url": result.get('url'),
                "customer_email": user_email,
                "product_id": product_id,
                "price_id": price_id,
                "amount": result.get('amount'),
                "currency": result.get('currency', 'USD')
            }
            
        except Exception as e:
            logger.error("polar_checkout_failed", error=str(e), tier=tier.value)
            raise
    
    async def get_checkout_session(self, checkout_id: str) -> Optional[Dict[str, Any]]:
        """Get checkout session details"""
        try:
            result = self.client.checkouts.get(id=checkout_id)
            
            if result:
                return {
                    "id": result.id if hasattr(result, 'id') else None,
                    "status": result.status if hasattr(result, 'status') else None,
                    "customer_email": result.customer_email if hasattr(result, 'customer_email') else None,
                    "amount": result.amount if hasattr(result, 'amount') else None,
                }
            return None
        except Exception as e:
            logger.error("polar_get_checkout_failed", checkout_id=checkout_id, error=str(e))
            return None
    
    async def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verify Polar webhook signature"""
        import hmac
        import hashlib
        
        if not settings.POLAR_WEBHOOK_SECRET:
            logger.warning("polar_webhook_secret_not_configured")
            return True  # Allow in development
        
        try:
            expected_signature = hmac.new(
                settings.POLAR_WEBHOOK_SECRET.encode(),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, f"sha256={expected_signature}")
        except Exception as e:
            logger.error("polar_webhook_verification_failed", error=str(e))
            return False
    
    async def handle_webhook(
        self,
        db: AsyncSession,
        event_type: str,
        data: Dict[str, Any]
    ) -> None:
        """Handle Polar webhook events"""
        logger.info("polar_webhook_received", event_type=event_type, sandbox=self.sandbox_mode)
        
        handlers = {
            "checkout.created": self._handle_checkout_created,
            "checkout.updated": self._handle_checkout_updated,
            "subscription.created": self._handle_subscription_created,
            "subscription.updated": self._handle_subscription_updated,
            "subscription.cancelled": self._handle_subscription_cancelled,
            "subscription.revoked": self._handle_subscription_revoked,
            "order.created": self._handle_order_created,
            "payment.succeeded": self._handle_payment_succeeded,
            "payment.failed": self._handle_payment_failed,
        }
        
        handler = handlers.get(event_type)
        if handler:
            await handler(db, data)
        else:
            logger.warning("unknown_webhook_event", event_type=event_type)
    
    async def _handle_checkout_created(
        self,
        db: AsyncSession,
        data: Dict[str, Any]
    ) -> None:
        """Handle checkout creation"""
        checkout_id = data.get("id")
        customer_email = data.get("customer_email")
        
        logger.info(
            "polar_checkout_created_webhook",
            checkout_id=checkout_id,
            customer_email=customer_email
        )
    
    async def _handle_checkout_updated(
        self,
        db: AsyncSession,
        data: Dict[str, Any]
    ) -> None:
        """Handle checkout update (e.g., completed)"""
        checkout_id = data.get("id")
        status = data.get("status")
        
        logger.info(
            "polar_checkout_updated_webhook",
            checkout_id=checkout_id,
            status=status
        )
        
        # If checkout is confirmed, create subscription
        if status == "confirmed":
            await self._handle_subscription_created(db, data)
    
    async def _handle_subscription_created(
        self,
        db: AsyncSession,
        data: Dict[str, Any]
    ) -> None:
        """Handle subscription creation"""
        customer_email = data.get("customer_email") or data.get("email")
        polar_subscription_id = data.get("id")
        product_id = data.get("product_id")
        amount = data.get("amount", 0)
        
        # Find user by email
        result = await db.execute(
            select(User).where(User.email == customer_email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            logger.error("user_not_found_for_subscription", email=customer_email)
            return
        
        # Determine tier from product_id or metadata
        metadata = data.get("metadata", {})
        tier_str = metadata.get("tier")
        
        if tier_str:
            tier = SubscriptionTier(tier_str)
        else:
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
            subscription.max_books = 20  # Увеличено до 20 книг для Pro tier
            subscription.has_citation_mode = True
            subscription.has_coach_mode = True
            subscription.price = amount / 100 if amount else 9.0  # Convert cents to dollars
        elif tier == SubscriptionTier.ULTIMATE:
            subscription.max_books = 999  # Неограниченные книги для Ultimate tier
            subscription.has_citation_mode = True
            subscription.has_author_mode = True
            subscription.has_coach_mode = True
            subscription.has_analytics = True
            subscription.price = amount / 100 if amount else 19.0
        
        await db.commit()
        
        # Create payment record
        payment = Payment(
            user_id=user.id,
            amount=amount / 100 if amount else 0,
            currency="USD",
            status=PaymentStatus.COMPLETED,
            payment_method=PaymentMethod.POLAR,
            external_payment_id=polar_subscription_id,
            metadata={
                "tier": tier.value,
                "sandbox": self.sandbox_mode
            }
        )
        db.add(payment)
        await db.commit()
        
        logger.info(
            "subscription_created",
            user_id=str(user.id),
            tier=tier.value,
            polar_id=polar_subscription_id,
            sandbox=self.sandbox_mode
        )
    
    async def _handle_subscription_updated(
        self,
        db: AsyncSession,
        data: Dict[str, Any]
    ) -> None:
        """Handle subscription update"""
        polar_subscription_id = data.get("id")
        status = data.get("status")
        
        result = await db.execute(
            select(Subscription).where(
                Subscription.polar_subscription_id == polar_subscription_id
            )
        )
        subscription = result.scalar_one_or_none()
        
        if subscription:
            # Update subscription status
            if status:
                subscription.status = SubscriptionStatus(status) if status in [s.value for s in SubscriptionStatus] else subscription.status
            subscription.updated_at = datetime.utcnow()
            await db.commit()
            
            logger.info("subscription_updated", subscription_id=str(subscription.id), status=status)
    
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
    
    async def _handle_subscription_revoked(
        self,
        db: AsyncSession,
        data: Dict[str, Any]
    ) -> None:
        """Handle subscription revocation (e.g., chargeback)"""
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
            
            logger.warning("subscription_revoked", subscription_id=str(subscription.id))
    
    async def _handle_order_created(
        self,
        db: AsyncSession,
        data: Dict[str, Any]
    ) -> None:
        """Handle order creation - create/upgrade subscription"""
        order_id = data.get("id")
        customer_email = data.get("customer_email")
        amount = data.get("amount", 0)
        product_id = data.get("product_id")
        product = data.get("product", {})
        product_name = product.get("name", "").lower() if product else ""
        
        logger.info(
            "polar_order_created",
            order_id=order_id,
            customer_email=customer_email,
            amount=amount,
            product_name=product_name
        )
        
        # Если нет email, пытаемся получить из subscription или user_id
        if not customer_email:
            logger.warning("order_without_customer_email", order_id=order_id)
            # Попробуем найти через subscription_id если есть
            subscription_id = data.get("subscription_id")
            if subscription_id:
                result = await db.execute(
                    select(Subscription).where(
                        Subscription.polar_subscription_id == subscription_id
                    )
                )
                existing_sub = result.scalar_one_or_none()
                if existing_sub:
                    result = await db.execute(
                        select(User).where(User.id == existing_sub.user_id)
                    )
                    user = result.scalar_one_or_none()
                    if user:
                        customer_email = user.email
        
        if not customer_email:
            logger.error("cannot_process_order_no_email", order_id=order_id)
            return
        
        # Find user by email
        result = await db.execute(
            select(User).where(User.email == customer_email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            logger.error("user_not_found_for_order", email=customer_email)
            return
        
        # Determine tier from product name or product_id
        tier = SubscriptionTier.FREE
        if "pro" in product_name:
            tier = SubscriptionTier.PRO
        elif "ultimate" in product_name:
            tier = SubscriptionTier.ULTIMATE
        else:
            # Fallback: try to get from product_id
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
        subscription.polar_product_id = product_id
        subscription.token_limit = settings.token_limit_by_tier[tier.value]
        subscription.tokens_used = 0  # Reset tokens on new subscription
        subscription.current_period_start = datetime.utcnow()
        subscription.current_period_end = datetime.utcnow() + timedelta(days=30)
        subscription.tokens_reset_at = datetime.utcnow() + timedelta(days=30)
        
        # Set features based on tier
        if tier == SubscriptionTier.PRO:
            subscription.max_books = 20
            subscription.has_citation_mode = True
            subscription.has_coach_mode = True
            subscription.price = amount / 100 if amount else 9.0
        elif tier == SubscriptionTier.ULTIMATE:
            subscription.max_books = 999
            subscription.has_citation_mode = True
            subscription.has_author_mode = True
            subscription.has_coach_mode = True
            subscription.has_analytics = True
            subscription.price = amount / 100 if amount else 19.0
        
        await db.commit()
        
        # Create payment record
        payment = Payment(
            user_id=user.id,
            amount=amount / 100 if amount else 0,
            currency="USD",
            status=PaymentStatus.COMPLETED,
            payment_method=PaymentMethod.POLAR,
            external_payment_id=order_id,
            metadata={
                "tier": tier.value,
                "product_name": product_name,
                "sandbox": self.sandbox_mode
            }
        )
        db.add(payment)
        await db.commit()
        
        logger.info(
            "subscription_created_from_order",
            user_id=str(user.id),
            tier=tier.value,
            order_id=order_id
        )
    
    async def _handle_payment_succeeded(
        self,
        db: AsyncSession,
        data: Dict[str, Any]
    ) -> None:
        """Handle successful payment - reset tokens"""
        polar_subscription_id = data.get("subscription_id")
        payment_id = data.get("id")
        amount = data.get("amount", 0)
        
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
            
            # Create payment record
            payment = Payment(
                user_id=subscription.user_id,
                amount=amount / 100 if amount else 0,
                currency="USD",
                status=PaymentStatus.COMPLETED,
                payment_method=PaymentMethod.POLAR,
                external_payment_id=payment_id,
                metadata={
                    "subscription_id": polar_subscription_id,
                    "sandbox": self.sandbox_mode
                }
            )
            db.add(payment)
            await db.commit()
            
            logger.info(
                "payment_succeeded_tokens_reset",
                subscription_id=str(subscription.id),
                payment_id=payment_id,
                amount=amount
            )
    
    async def _handle_payment_failed(
        self,
        db: AsyncSession,
        data: Dict[str, Any]
    ) -> None:
        """Handle failed payment"""
        polar_subscription_id = data.get("subscription_id")
        payment_id = data.get("id")
        
        result = await db.execute(
            select(Subscription).where(
                Subscription.polar_subscription_id == polar_subscription_id
            )
        )
        subscription = result.scalar_one_or_none()
        
        if subscription:
            # Create failed payment record
            payment = Payment(
                user_id=subscription.user_id,
                amount=0,
                currency="USD",
                status=PaymentStatus.FAILED,
                payment_method=PaymentMethod.POLAR,
                external_payment_id=payment_id,
                metadata={
                    "subscription_id": polar_subscription_id,
                    "sandbox": self.sandbox_mode,
                    "error": data.get("error", "Payment failed")
                }
            )
            db.add(payment)
            await db.commit()
            
            logger.warning(
                "payment_failed",
                subscription_id=str(subscription.id),
                payment_id=payment_id
            )
    
    def _get_tier_from_product(self, product_id: str) -> SubscriptionTier:
        """Map Polar product ID to subscription tier"""
        if not product_id:
            return SubscriptionTier.FREE
        
        product_id_lower = str(product_id).lower()
        
        if "ultimate" in product_id_lower:
            return SubscriptionTier.ULTIMATE
        elif "pro" in product_id_lower:
            return SubscriptionTier.PRO
        else:
            return SubscriptionTier.FREE
    
    async def cancel_subscription(self, subscription_id: str) -> bool:
        """Cancel a subscription via Polar API"""
        try:
            # Note: Check Polar SDK for the exact method to cancel subscriptions
            # This is a placeholder implementation
            logger.info("subscription_cancel_requested", subscription_id=subscription_id)
            return True
        except Exception as e:
            logger.error("subscription_cancel_failed", subscription_id=subscription_id, error=str(e))
            return False
    
    async def get_subscription_details(self, subscription_id: str) -> Optional[Dict[str, Any]]:
        """Get subscription details from Polar"""
        try:
            # Note: Implement based on Polar SDK subscription retrieval method
            logger.info("subscription_details_requested", subscription_id=subscription_id)
            return None
        except Exception as e:
            logger.error("get_subscription_failed", subscription_id=subscription_id, error=str(e))
            return None


# Global instance
polar_service = PolarService()
