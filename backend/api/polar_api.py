"""
Polar.sh API Endpoints - Checkout and webhook handling
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
import hmac
import hashlib

from core.database import get_db
from core.config import settings
from models.user import User
from models.subscription import SubscriptionTier
from services.polar_service import polar_service
from api.auth import get_current_user

router = APIRouter(prefix="/polar", tags=["polar"])


# ==================== CHECKOUT ====================

class CreateCheckoutRequest(BaseModel):
    tier: str  # "pro" or "ultimate"
    billing_interval: str = "monthly"  # "monthly" or "yearly"


@router.post("/create-checkout")
async def create_checkout_session(
    data: CreateCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a Polar checkout session for subscription"""
    
    # Validate tier
    if data.tier not in ["pro", "ultimate"]:
        raise HTTPException(status_code=400, detail="Invalid tier. Must be 'pro' or 'ultimate'")
    
    # Map string to SubscriptionTier enum
    tier_map = {
        "pro": SubscriptionTier.PRO,
        "ultimate": SubscriptionTier.ULTIMATE
    }
    tier = tier_map[data.tier]
    
    try:
        # Create checkout session
        checkout = await polar_service.create_checkout_session(
            user_email=current_user.email,
            tier=tier,
            billing_interval=data.billing_interval
        )
        
        return {
            "success": True,
            "checkout_url": checkout.get("url"),
            "checkout_id": checkout.get("id"),
            "tier": data.tier,
            "billing_interval": data.billing_interval
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create checkout session: {str(e)}"
        )


# ==================== WEBHOOK ====================

@router.post("/webhook")
async def handle_polar_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    signature: Optional[str] = Header(None, alias="X-Polar-Signature")
):
    """Handle Polar.sh webhook events"""
    
    # Get raw body for signature verification
    body = await request.body()
    
    # Verify webhook signature if secret is configured
    if settings.POLAR_WEBHOOK_SECRET and signature:
        expected_signature = hmac.new(
            settings.POLAR_WEBHOOK_SECRET.encode(),
            body,
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, f"sha256={expected_signature}"):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")
    
    # Parse event
    event = await request.json()
    event_type = event.get("type")
    data = event.get("data", {})
    
    # Handle event
    try:
        await polar_service.handle_webhook(db, event_type, data)
        return {"success": True, "message": "Webhook processed"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Webhook processing failed: {str(e)}"
        )


# ==================== STATUS CHECK ====================

@router.get("/status")
async def check_polar_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check Polar.sh integration status"""
    
    is_configured = bool(
        settings.POLAR_API_KEY and 
        settings.POLAR_ORGANIZATION_ID
    )
    
    return {
        "configured": is_configured,
        "sandbox_mode": settings.ENVIRONMENT != "production",
        "webhook_secret_set": bool(settings.POLAR_WEBHOOK_SECRET),
    }
