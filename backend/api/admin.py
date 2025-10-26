"""
Admin API Endpoints - System administration
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, or_
from typing import List
from datetime import datetime, timedelta
from pydantic import BaseModel
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


class UpdateSubscriptionRequest(BaseModel):
    tier: str


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
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    result = await db.execute(
        select(func.count(User.id)).where(
            User.last_login >= thirty_days_ago
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


@router.get("/stats/overview")
async def get_admin_overview_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get detailed overview statistics"""
    
    # Users stats
    result = await db.execute(select(func.count(User.id)))
    total_users = result.scalar()
    
    # Active users
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    result = await db.execute(
        select(func.count(User.id)).where(User.last_login >= thirty_days_ago)
    )
    active_users = result.scalar()
    
    # New users today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= today_start)
    )
    today_users = result.scalar()
    
    # New users this week
    week_ago = datetime.utcnow() - timedelta(days=7)
    result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= week_ago)
    )
    week_users = result.scalar()
    
    # Books stats
    result = await db.execute(select(func.count(Book.id)))
    total_books = result.scalar()
    
    result = await db.execute(
        select(func.count(Book.id)).where(Book.created_at >= today_start)
    )
    today_books = result.scalar()
    
    result = await db.execute(
        select(func.count(Book.id)).where(Book.created_at >= week_ago)
    )
    week_books = result.scalar()
    
    # Chats stats
    result = await db.execute(select(func.count(Chat.id)))
    total_chats = result.scalar()
    
    result = await db.execute(
        select(func.count(Chat.id)).where(Chat.created_at >= today_start)
    )
    today_chats = result.scalar()
    
    result = await db.execute(
        select(func.count(Chat.id)).where(Chat.created_at >= week_ago)
    )
    week_chats = result.scalar()
    
    # Tokens stats
    result = await db.execute(select(func.sum(TokenUsage.tokens_used)))
    total_tokens = result.scalar() or 0
    
    result = await db.execute(
        select(func.sum(TokenUsage.tokens_used)).where(TokenUsage.created_at >= today_start)
    )
    today_tokens = result.scalar() or 0
    
    result = await db.execute(
        select(func.sum(TokenUsage.tokens_used)).where(TokenUsage.created_at >= week_ago)
    )
    week_tokens = result.scalar() or 0
    
    # Subscription stats
    result = await db.execute(
        select(func.count(Subscription.id)).where(Subscription.tier == SubscriptionTier.FREE)
    )
    free_users = result.scalar()
    
    result = await db.execute(
        select(func.count(Subscription.id)).where(Subscription.tier == SubscriptionTier.PRO)
    )
    pro_users = result.scalar()
    
    result = await db.execute(
        select(func.count(Subscription.id)).where(Subscription.tier == SubscriptionTier.ULTIMATE)
    )
    ultimate_users = result.scalar()
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "today": today_users,
            "week": week_users,
            "free": free_users,
            "pro": pro_users,
            "ultimate": ultimate_users
        },
        "books": {
            "total": total_books,
            "today": today_books,
            "week": week_books
        },
        "chats": {
            "total": total_chats,
            "today": today_chats,
            "week": week_chats
        },
        "tokens": {
            "total": total_tokens,
            "today": today_tokens,
            "week": week_tokens
        }
    }


@router.get("/users")
async def get_all_users(
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get all users with details"""
    
    offset = (page - 1) * page_size
    
    # Get total count
    count_result = await db.execute(select(func.count(User.id)))
    total = count_result.scalar()
    
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
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "is_banned": not user.is_active,
            "subscription_tier": subscription.tier.value if subscription and hasattr(subscription.tier, 'value') else None,
            "total_books": total_books,
            "total_chats": total_chats,
            "total_tokens_used": total_tokens
        })
    
    return {
        "users": users_data,
        "total": total
    }


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


@router.get("/stats/growth")
async def get_admin_growth_stats(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get growth statistics for charts"""
    
    growth_data = {
        "users": [],
        "books": [],
        "chats": [],
        "tokens": []
    }
    
    for i in range(days):
        day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        
        # Users created on this day
        result = await db.execute(
            select(func.count(User.id)).where(
                User.created_at >= day_start,
                User.created_at < day_end
            )
        )
        user_count = result.scalar()
        
        # Books created on this day
        result = await db.execute(
            select(func.count(Book.id)).where(
                Book.created_at >= day_start,
                Book.created_at < day_end
            )
        )
        book_count = result.scalar()
        
        # Chats created on this day
        result = await db.execute(
            select(func.count(Chat.id)).where(
                Chat.created_at >= day_start,
                Chat.created_at < day_end
            )
        )
        chat_count = result.scalar()
        
        # Tokens used on this day
        result = await db.execute(
            select(func.sum(TokenUsage.tokens_used)).where(
                TokenUsage.created_at >= day_start,
                TokenUsage.created_at < day_end
            )
        )
        token_count = result.scalar() or 0
        
        growth_data["users"].insert(0, {"date": day_start.isoformat(), "count": user_count})
        growth_data["books"].insert(0, {"date": day_start.isoformat(), "count": book_count})
        growth_data["chats"].insert(0, {"date": day_start.isoformat(), "count": chat_count})
        growth_data["tokens"].insert(0, {"date": day_start.isoformat(), "count": token_count})
    
    return growth_data


@router.get("/books", response_model=dict)
async def get_all_books(
    page: int = 1,
    page_size: int = 50,
    search: str = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get all books in the system with owner information"""
    
    offset = (page - 1) * page_size
    
    # Build query with JOIN to avoid lazy loading
    query = select(Book, User).join(User, Book.owner_id == User.id)
    
    # Add search filter if provided
    if search:
        search_filter = or_(
            Book.title.ilike(f"%{search}%"),
            Book.author.ilike(f"%{search}%"),
            User.username.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
    
    # Add pagination and ordering
    query = query.offset(offset).limit(page_size).order_by(Book.created_at.desc())
    
    result = await db.execute(query)
    rows = result.all()
    
    # Get total count
    count_query = select(func.count(Book.id))
    if search:
        count_query = count_query.join(User, Book.owner_id == User.id).where(search_filter)
    total = await db.scalar(count_query)
    
    # Format response with owner info
    books_data = []
    for book, owner in rows:
        books_data.append({
            "id": str(book.id),
            "title": book.title,
            "author": book.author,
            "file_path": book.file_path,
            "file_type": book.file_type,
            "file_size": book.file_size,
            "total_pages": book.total_pages,
            "total_chunks": book.total_chunks,
            "processing_status": book.processing_status,
            "processed_at": book.processed_at.isoformat() if book.processed_at else None,
            "owner_id": str(book.owner_id),
            "owner": {
                "id": str(owner.id),
                "username": owner.username,
                "email": owner.email
            },
            "created_at": book.created_at.isoformat(),
        })
    
    return {"books": books_data, "total": total or 0}


@router.get("/content/shared")
async def get_shared_content(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get all shared content with analytics"""
    from models.shared_content import SharedContent
    
    offset = (page - 1) * page_size
    
    # Get total count
    count_result = await db.execute(select(func.count(SharedContent.id)))
    total = count_result.scalar() or 0
    
    # Get shared content with stats
    total_views_result = await db.execute(select(func.sum(SharedContent.view_count)))
    total_views = total_views_result.scalar() or 0
    
    total_shares_result = await db.execute(select(func.sum(SharedContent.share_count)))
    total_shares = total_shares_result.scalar() or 0
    
    featured_result = await db.execute(
        select(func.count(SharedContent.id)).where(SharedContent.is_featured == True)
    )
    featured_count = featured_result.scalar() or 0
    
    # Get content items
    result = await db.execute(
        select(SharedContent)
        .offset(offset)
        .limit(page_size)
        .order_by(SharedContent.created_at.desc())
    )
    content_items = result.scalars().all()
    
    content_data = []
    for item in content_items:
        content_data.append({
            "id": str(item.id),
            "title": item.title,
            "type": item.content_type,
            "shares": item.share_count,
            "views": item.view_count,
            "created_at": item.created_at.isoformat() if item.created_at else None
        })
    
    return {
        "stats": {
            "total_items": total,
            "total_views": total_views,
            "total_shares": total_shares,
            "featured": featured_count
        },
        "content": content_data,
        "total": total
    }


@router.get("/logs")
async def get_system_logs(
    category: str = "all",
    page: int = 1,
    page_size: int = 50,
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get system logs from usage_log table"""
    from models.usage_log import UsageLog
    
    since_date = datetime.utcnow() - timedelta(days=days)
    offset = (page - 1) * page_size
    
    # Build query based on category
    query = select(UsageLog).where(UsageLog.created_at >= since_date)
    
    if category != "all":
        # Map frontend categories to log types
        category_map = {
            "error": ["error", "failed"],
            "info": ["info", "success"],
            "audit": ["auth", "admin", "security"],
            "access": ["api", "access", "request"]
        }
        if category in category_map:
            query = query.where(UsageLog.activity_type.in_(category_map[category]))
    
    query = query.offset(offset).limit(page_size).order_by(UsageLog.created_at.desc())
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    # Get counts for stats
    error_count = await db.scalar(
        select(func.count(UsageLog.id)).where(
            UsageLog.created_at >= datetime.utcnow() - timedelta(days=1),
            UsageLog.activity_type.in_(["error", "failed"])
        )
    ) or 0
    
    warning_count = await db.scalar(
        select(func.count(UsageLog.id)).where(
            UsageLog.created_at >= datetime.utcnow() - timedelta(days=1),
            UsageLog.activity_type == "warning"
        )
    ) or 0
    
    info_count = await db.scalar(
        select(func.count(UsageLog.id)).where(
            UsageLog.created_at >= datetime.utcnow() - timedelta(days=1),
            UsageLog.activity_type.in_(["info", "success"])
        )
    ) or 0
    
    audit_count = await db.scalar(
        select(func.count(UsageLog.id)).where(
            UsageLog.created_at >= datetime.utcnow() - timedelta(days=1),
            UsageLog.activity_type.in_(["auth", "admin", "security"])
        )
    ) or 0
    
    logs_data = []
    for log in logs:
        # Determine level based on activity_type
        level = "info"
        if log.activity_type in ["error", "failed"]:
            level = "error"
        elif log.activity_type == "warning":
            level = "warning"
        elif log.activity_type in ["success", "completed"]:
            level = "success"
        
        logs_data.append({
            "id": str(log.id),
            "timestamp": log.created_at.isoformat() if log.created_at else None,
            "level": level,
            "category": log.activity_type,
            "message": log.message or f"{log.activity_type} action",
            "details": f"User: {log.user_id}" if log.user_id else None
        })
    
    return {
        "logs": logs_data,
        "stats": {
            "errors_24h": error_count,
            "warnings_24h": warning_count,
            "info_24h": info_count,
            "audit_24h": audit_count
        }
    }


@router.patch("/users/{user_id}/subscription")
async def update_user_subscription(
    user_id: str,
    request: UpdateSubscriptionRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Update user subscription tier"""
    from models.subscription import SubscriptionTier, SubscriptionStatus
    
    tier = request.tier
    
    # Validate tier
    valid_tiers = ["free", "pro", "ultimate"]
    if tier not in valid_tiers:
        raise HTTPException(status_code=400, detail=f"Invalid tier. Must be one of: {valid_tiers}")
    
    # Find user
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get or create subscription
    sub_result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    subscription = sub_result.scalar_one_or_none()
    
    if subscription:
        # Update existing subscription
        subscription.tier = SubscriptionTier(tier.lower())
        subscription.status = SubscriptionStatus.ACTIVE
    else:
        # Create new subscription
        subscription = Subscription(
            user_id=user_id,
            tier=SubscriptionTier(tier.lower()),
            status=SubscriptionStatus.ACTIVE
        )
        db.add(subscription)
    
    await db.commit()
    await db.refresh(subscription)
    
    logger.info("subscription_updated", user_id=user_id, tier=tier, admin_id=str(admin.id))
    
    return {
        "success": True,
        "message": f"Subscription updated to {tier}",
        "subscription": {
            "tier": subscription.tier.value,
            "status": subscription.status.value
        }
    }


@router.get("/system-settings")
async def get_system_settings(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get general system settings and configuration"""
    from core.config import settings
    from models.book import Book
    from models.chat import Chat
    
    # Get database stats
    books_result = await db.execute(select(func.count(Book.id)))
    total_books = books_result.scalar()
    
    chats_result = await db.execute(select(func.count(Chat.id)))
    total_chats = chats_result.scalar()
    
    # Get storage info
    storage_used_mb = 0  # TODO: Calculate actual storage
    
    return {
        "system": {
            "app_name": settings.APP_NAME,
            "environment": settings.ENVIRONMENT,
            "debug_mode": settings.DEBUG,
            "version": "1.0.0",  # TODO: Add version management
        },
        "features": {
            "s3_storage": settings.USE_S3,
            "redis_enabled": bool(settings.REDIS_URL),
            "qdrant_enabled": bool(settings.QDRANT_URL),
            "polar_integration": bool(settings.POLAR_API_KEY),
            "celery_enabled": bool(settings.CELERY_BROKER_URL),
        },
        "token_limits": {
            "free": settings.FREE_TIER_TOKEN_LIMIT,
            "pro": settings.PRO_TIER_TOKEN_LIMIT,
            "ultimate": settings.ULTIMATE_TIER_TOKEN_LIMIT,
        },
        "ai_config": {
            "model": settings.GEMINI_MODEL,
            "embedding_model": settings.GEMINI_EMBEDDING_MODEL,
            "api_configured": bool(settings.GOOGLE_API_KEY),
        },
        "database": {
            "total_books": total_books,
            "total_chats": total_chats,
            "connection_pool_size": 20,  # From core.database config
        },
        "storage": {
            "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB,
            "storage_used_mb": storage_used_mb,
            "s3_bucket": settings.S3_BUCKET_NAME if settings.USE_S3 else None,
        },
        "rate_limits": {
            "per_minute": settings.RATE_LIMIT_PER_MINUTE,
            "per_hour": settings.RATE_LIMIT_PER_HOUR,
        }
    }

