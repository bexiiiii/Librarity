"""
Admin API Endpoints - System administration
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
import structlog

from core.database import get_db
from models.user import User, UserRole
from models.book import Book
from models.chat import Chat
from models.subscription import Subscription, SubscriptionTier
from models.token_usage import TokenUsage
from schemas import AdminStats, AdminUserResponse, SuccessResponse
from api.auth import get_current_user

router = APIRouter()
logger = structlog.get_logger()


async def get_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Verify user is admin"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get system statistics"""
    
    # Total users
    result = await db.execute(select(func.count(User.id)))
    total_users = result.scalar()
    
    # Active users (logged in last 30 days)
    result = await db.execute(
        select(func.count(User.id)).where(
            User.last_login >= func.now() - func.cast("30 days", func.Interval)
        )
    )
    active_users = result.scalar()
    
    # Total books
    result = await db.execute(select(func.count(Book.id)))
    total_books = result.scalar()
    
    # Total chats
    result = await db.execute(select(func.count(Chat.id)))
    total_chats = result.scalar()
    
    # Total tokens used
    result = await db.execute(select(func.sum(TokenUsage.tokens_used)))
    total_tokens = result.scalar() or 0
    
    # Subscriptions by tier
    result = await db.execute(
        select(Subscription.tier, func.count(Subscription.id))
        .group_by(Subscription.tier)
    )
    subscriptions_by_tier = {tier.value: count for tier, count in result.all()}
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_books": total_books,
        "total_chats": total_chats,
        "total_tokens_used": total_tokens,
        "subscriptions_by_tier": subscriptions_by_tier
    }


@router.get("/users", response_model=List[AdminUserResponse])
async def get_all_users(
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get all users with details"""
    
    offset = (page - 1) * page_size
    
    result = await db.execute(
        select(User)
        .offset(offset)
        .limit(page_size)
        .order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    
    users_data = []
    for user in users:
        # Get subscription
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user.id)
        )
        subscription = result.scalar_one_or_none()
        
        # Count books
        result = await db.execute(
            select(func.count(Book.id)).where(Book.owner_id == user.id)
        )
        total_books = result.scalar()
        
        # Count chats
        result = await db.execute(
            select(func.count(Chat.id)).where(Chat.user_id == user.id)
        )
        total_chats = result.scalar()
        
        # Total tokens
        result = await db.execute(
            select(func.sum(TokenUsage.tokens_used)).where(TokenUsage.user_id == user.id)
        )
        total_tokens = result.scalar() or 0
        
        users_data.append({
            **user.__dict__,
            "subscription": subscription,
            "total_books": total_books,
            "total_chats": total_chats,
            "total_tokens_used": total_tokens
        })
    
    return users_data


@router.patch("/users/{user_id}/ban", response_model=SuccessResponse)
async def ban_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Ban/deactivate a user"""
    
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = False
    await db.commit()
    
    logger.info("user_banned", user_id=user_id, admin_id=str(admin.id))
    
    return {"success": True, "message": f"User {user.email} has been banned"}


@router.patch("/users/{user_id}/unban", response_model=SuccessResponse)
async def unban_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Unban/activate a user"""
    
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = True
    await db.commit()
    
    logger.info("user_unbanned", user_id=user_id, admin_id=str(admin.id))
    
    return {"success": True, "message": f"User {user.email} has been unbanned"}


@router.get("/books", response_model=List[dict])
async def get_all_books(
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get all books in the system"""
    
    offset = (page - 1) * page_size
    
    result = await db.execute(
        select(Book)
        .offset(offset)
        .limit(page_size)
        .order_by(Book.created_at.desc())
    )
    books = result.scalars().all()
    
    return books
