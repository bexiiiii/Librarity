"""
Temporary endpoint to fix subscription
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from models.user import User
from models.subscription import Subscription
from api.auth import get_current_user

router = APIRouter(prefix="/fix", tags=["fix"])


@router.post("/subscription")
async def fix_my_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fix current user's subscription limits"""
    
    # Get subscription
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        return {"error": "No subscription found"}
    
    old_data = {
        "tier": subscription.tier,
        "max_books": subscription.max_books,
        "token_limit": subscription.token_limit,
        "has_citation_mode": subscription.has_citation_mode,
        "has_author_mode": subscription.has_author_mode
    }
    
    # Update based on tier
    if subscription.tier == "pro":
        subscription.max_books = 10
        subscription.has_citation_mode = True
        subscription.has_author_mode = True
        subscription.has_coach_mode = False
        subscription.has_analytics = False
    elif subscription.tier == "ultimate":
        subscription.max_books = -1
        subscription.has_citation_mode = True
        subscription.has_author_mode = True
        subscription.has_coach_mode = True
        subscription.has_analytics = True
    
    await db.commit()
    await db.refresh(subscription)
    
    new_data = {
        "tier": subscription.tier,
        "max_books": subscription.max_books,
        "token_limit": subscription.token_limit,
        "has_citation_mode": subscription.has_citation_mode,
        "has_author_mode": subscription.has_author_mode
    }
    
    return {
        "success": True,
        "message": "Subscription fixed!",
        "old": old_data,
        "new": new_data
    }
