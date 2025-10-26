"""
Subscription API Endpoints - Manage user subscriptions
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from core.database import get_db
from models.user import User
from models.subscription import Subscription
from schemas import SubscriptionResponse, SubscriptionUpgrade, TokenUsageResponse, TokenUsageStats, PolarWebhook, SuccessResponse
from api.auth import get_current_user
from services.polar_service import polar_service
from services.token_manager import token_manager

router = APIRouter()
logger = structlog.get_logger()


@router.get("/", response_model=SubscriptionResponse)
async def get_subscription(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's subscription"""
    
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    return subscription


@router.post("/upgrade", response_model=dict)
async def upgrade_subscription(
    upgrade_data: SubscriptionUpgrade,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upgrade subscription tier"""
    
    try:
        # Create Polar checkout session
        checkout = await polar_service.create_checkout_session(
            user_email=current_user.email,
            tier=upgrade_data.tier,
            billing_interval=upgrade_data.billing_interval
        )
        
        logger.info(
            "checkout_created",
            user_id=str(current_user.id),
            tier=upgrade_data.tier
        )
        
        return {
            "checkout_url": checkout.get("url"),
            "checkout_id": checkout.get("id")
        }
        
    except Exception as e:
        logger.error("checkout_creation_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checkout session"
        )


@router.get("/tokens", response_model=TokenUsageResponse)
async def get_token_usage(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get token usage information"""
    
    usage_stats = await token_manager.get_usage_stats(db, str(current_user.id))
    
    return usage_stats


@router.get("/tokens/stats", response_model=TokenUsageStats)
async def get_token_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed token usage statistics"""
    
    usage_stats = await token_manager.get_usage_stats(db, str(current_user.id))
    
    return {
        "today": usage_stats.get("today", 0),
        "this_week": usage_stats.get("this_week", 0),
        "this_month": usage_stats.get("this_month", 0),
        "total": usage_stats.get("total_tokens", 0),
        "by_mode": {}  # Can be extended to track by mode
    }


@router.post("/webhook", response_model=SuccessResponse)
async def polar_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle Polar.sh webhooks"""
    
    try:
        payload = await request.json()
        
        event_type = payload.get("type")
        data = payload.get("data", {})
        
        # Verify webhook signature (should be implemented)
        # webhook_signature = request.headers.get("X-Polar-Signature")
        
        # Handle webhook event
        await polar_service.handle_webhook(db, event_type, data)
        
        logger.info("webhook_processed", event_type=event_type)
        
        return {"success": True, "message": "Webhook processed"}
        
    except Exception as e:
        logger.error("webhook_processing_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook processing failed"
        )
