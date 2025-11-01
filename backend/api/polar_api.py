"""
Polar.sh API Endpoints - Checkout and webhook handling
Using official Polar Python SDK
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional, List
import hmac
import hashlib

from core.database import get_db
from core.config import settings
from models.user import User
from models.subscription import SubscriptionTier
from services.polar_service import polar_service
from api.auth import get_current_user

router = APIRouter(prefix="/polar", tags=["polar"])


# ==================== SCHEMAS ====================

class CreateCheckoutRequest(BaseModel):
    tier: str = Field(..., description="Subscription tier: 'pro' or 'ultimate'")
    billing_interval: str = Field(default="month", description="Billing interval: 'month' or 'year'")
    success_url: Optional[str] = Field(None, description="Custom success URL")


class CheckoutResponse(BaseModel):
    success: bool
    checkout_url: Optional[str] = None
    checkout_id: Optional[str] = None
    tier: str
    billing_interval: str
    sandbox_mode: bool


class ProductResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_recurring: bool
    prices: List[dict]


class PolarStatusResponse(BaseModel):
    configured: bool
    sandbox_mode: bool
    webhook_secret_set: bool
    has_products: bool
    organization_id: Optional[str] = None
    organization_id: Optional[str] = None


# ==================== ENDPOINTS ====================

@router.get("/products", response_model=List[dict])
async def list_products(
    current_user: User = Depends(get_current_user)
):
    """List all available Polar products"""
    try:
        products = await polar_service.list_products()
        
        # Convert to dict format
        result = []
        for product in products:
            product_dict = {
                "id": getattr(product, 'id', None),
                "name": getattr(product, 'name', None),
                "description": getattr(product, 'description', None),
                "is_recurring": getattr(product, 'is_recurring', False),
            }
            result.append(product_dict)
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list products: {str(e)}"
        )


@router.post("/create-checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    data: CreateCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a Polar checkout session for subscription"""
    
    # Validate tier
    if data.tier not in ["pro", "ultimate"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid tier. Must be 'pro' or 'ultimate'"
        )
    
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
            success_url=data.success_url,
            billing_interval=data.billing_interval
        )
        
        return CheckoutResponse(
            success=True,
            checkout_url=checkout.get("url"),
            checkout_id=checkout.get("id"),
            tier=data.tier,
            billing_interval=data.billing_interval,
            sandbox_mode=polar_service.sandbox_mode
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create checkout session: {str(e)}"
        )


# ==================== WEBHOOK ====================

@router.post("/webhook")
async def handle_polar_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle Polar.sh webhook events"""
    
    # Get raw body for signature verification
    body = await request.body()
    
    # Verify webhook signature using Standard Webhooks headers
    # Polar uses: webhook-id, webhook-timestamp, webhook-signature
    webhook_id = request.headers.get("webhook-id")
    webhook_timestamp = request.headers.get("webhook-timestamp")
    webhook_signature = request.headers.get("webhook-signature")
    
    # Verify signature if webhook secret is configured and not in sandbox mode
    if settings.POLAR_WEBHOOK_SECRET and not settings.POLAR_SANDBOX_MODE:
        if not webhook_signature or not webhook_id or not webhook_timestamp:
            raise HTTPException(
                status_code=401,
                detail="Webhook signature headers missing"
            )
        
        # Verify signature
        is_valid = await polar_service.verify_webhook_signature(
            body, 
            webhook_signature
        )
        if not is_valid:
            raise HTTPException(
                status_code=401,
                detail="Invalid webhook signature"
            )
    
    # Parse event
    try:
        event = await request.json()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid JSON payload: {str(e)}"
        )
    
    event_type = event.get("type")
    data = event.get("data", {})
    
    if not event_type:
        raise HTTPException(
            status_code=400,
            detail="Missing event type"
        )
    
    # Handle event
    try:
        await polar_service.handle_webhook(db, event_type, data)
        return {
            "success": True,
            "message": "Webhook processed",
            "event_type": event_type,
            "sandbox": polar_service.sandbox_mode
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Webhook processing failed: {str(e)}"
        )


# ==================== STATUS CHECK ====================

@router.get("/status", response_model=PolarStatusResponse)
async def check_polar_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check Polar.sh integration status"""
    
    is_configured = bool(
        settings.POLAR_API_KEY and 
        settings.POLAR_ORGANIZATION_ID
    )
    
    # Try to fetch products to verify connection
    has_products = False
    if is_configured:
        try:
            products = await polar_service.list_products()
            has_products = len(products) > 0
        except:
            pass
    
    return PolarStatusResponse(
        configured=is_configured,
        sandbox_mode=polar_service.sandbox_mode,
        webhook_secret_set=bool(settings.POLAR_WEBHOOK_SECRET),
        has_products=has_products,
        organization_id=settings.POLAR_ORGANIZATION_ID if is_configured else None
    )


@router.get("/checkout/{checkout_id}")
async def get_checkout_status(
    checkout_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get checkout session status"""
    try:
        checkout = await polar_service.get_checkout_session(checkout_id)
        
        if not checkout:
            raise HTTPException(
                status_code=404,
                detail="Checkout session not found"
            )
        
        return {
            "success": True,
            "checkout": checkout,
            "sandbox": polar_service.sandbox_mode
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get checkout status: {str(e)}"
        )
