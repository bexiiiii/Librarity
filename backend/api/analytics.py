from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, cast, Date, and_
from datetime import datetime, timedelta
from typing import Optional
import structlog

from core.database import get_db
from models.user import User, UserRole
from models.book import Book
from models.chat import Chat
from models.token_usage import TokenUsage
from api.auth import get_current_user

router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])


@router.get("/books")
async def get_book_analytics(
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get most discussed books with chat statistics"""
    
    # Admin only
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Query books with chat counts
    # First, get books with their chat counts
    query = (
        select(
            Book.id,
            Book.title,
            func.count(Chat.id).label('total_chats')
        )
        .outerjoin(Chat, Chat.book_id == Book.id)
        .group_by(Book.id, Book.title)
        .order_by(desc('total_chats'))
        .limit(limit)
    )
    
    result = await db.execute(query)
    books_data = result.all()
    
    # For each book, count messages (we'll estimate based on chats for now)
    books_list = []
    for book_data in books_data:
        if book_data.total_chats > 0:
            # Estimate messages per chat (average 8-10 messages per chat)
            estimated_messages = book_data.total_chats * 9
            
            books_list.append({
                "book_id": str(book_data.id),
                "book_title": book_data.title,
                "total_chats": book_data.total_chats,
                "total_messages": estimated_messages,
                "avg_messages_per_chat": 9.0
            })
    
    return {
        "books": books_list
    }


@router.get("/topics")
async def get_topic_analytics(
    limit: int = Query(10, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get popular discussion topics from chat content"""
    
    # Admin only
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # This is a simplified version - for production, you'd use NLP/topic modeling
    # For now, we'll return mock data structure
    
    # Get total chat count for percentage calculation
    total_result = await db.execute(select(func.count(Chat.id)))
    total_chats = total_result.scalar() or 0
    
    # In production, this would analyze chat content with NLP
    # For now, returning example structure
    topics = []
    
    return {
        "topics": topics,
        "total_chats": total_chats,
        "note": "Topic extraction requires NLP implementation"
    }


@router.get("/ai-issues")
async def get_ai_performance_issues(
    days: int = Query(7, le=30),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get AI performance issues - questions where AI struggles"""
    
    # Admin only
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    since_date = datetime.utcnow() - timedelta(days=days)
    
    # In production, this would track:
    # - Chats with negative feedback/ratings
    # - Long response times
    # - Error responses
    # - User corrections/rephrasing
    
    # Placeholder structure
    return {
        "error_rate": 0.0,
        "avg_response_time": 0.0,
        "common_issues": [],
        "low_confidence_responses": [],
        "note": "Requires AI performance tracking implementation"
    }


@router.get("/engagement")
async def get_engagement_trends(
    days: int = Query(30, ge=1, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get daily engagement trends"""
    
    # Admin only
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Query daily active users and chat counts (using Chat model)
    query = (
        select(
            cast(Chat.created_at, Date).label('date'),
            func.count(func.distinct(Chat.user_id)).label('active_users'),
            func.count(Chat.id).label('total_chats'),
            func.sum(Chat.tokens_used).label('total_tokens')
        )
        .where(Chat.created_at >= start_date)
        .group_by(cast(Chat.created_at, Date))
        .order_by('date')
    )
    
    result = await db.execute(query)
    trends = result.all()
    
    return {
        "trends": [
            {
                "date": trend.date.isoformat(),
                "active_users": trend.active_users,
                "total_chats": trend.total_chats,
                "total_tokens": trend.total_tokens or 0
            }
            for trend in trends
        ]
    }


@router.get("/startup-metrics")
async def get_startup_metrics(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive startup metrics for investors"""
    
    # Admin only
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    from models.subscription import Subscription, SubscriptionTier
    from models.token_usage import TokenUsage
    
    now = datetime.utcnow()
    period_start = now - timedelta(days=days)
    previous_period_start = period_start - timedelta(days=days)
    
    # USER METRICS
    # Total users
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0
    
    # Active users (logged in during period)
    active_users_result = await db.execute(
        select(func.count(User.id)).where(
            User.last_login >= period_start
        )
    )
    active_users = active_users_result.scalar() or 0
    
    # New users in period
    new_users_result = await db.execute(
        select(func.count(User.id)).where(
            User.created_at >= period_start
        )
    )
    new_users = new_users_result.scalar() or 0
    
    # Previous period new users for growth calculation
    prev_new_users_result = await db.execute(
        select(func.count(User.id)).where(
            User.created_at >= previous_period_start,
            User.created_at < period_start
        )
    )
    prev_new_users = prev_new_users_result.scalar() or 0
    
    # ENGAGEMENT METRICS
    # Total books
    total_books_result = await db.execute(select(func.count(Book.id)))
    total_books = total_books_result.scalar() or 0
    
    # Total chats
    total_chats_result = await db.execute(select(func.count(Chat.id)))
    total_chats = total_chats_result.scalar() or 0
    
    # Books uploaded in period
    books_period_result = await db.execute(
        select(func.count(Book.id)).where(
            Book.created_at >= period_start
        )
    )
    books_period = books_period_result.scalar() or 0
    
    # Chats in period
    chats_period_result = await db.execute(
        select(func.count(Chat.id)).where(
            Chat.created_at >= period_start
        )
    )
    chats_period = chats_period_result.scalar() or 0
    
    # REVENUE METRICS
    # Paying users (Pro or Ultimate tier)
    paying_users_result = await db.execute(
        select(func.count(Subscription.id)).where(
            Subscription.status == "active",
            Subscription.tier.in_([SubscriptionTier.PRO, SubscriptionTier.ULTIMATE])
        )
    )
    paying_users = paying_users_result.scalar() or 0
    
    # Calculate MRR (assuming $9.99 for Pro, $19.99 for Ultimate)
    pro_count_result = await db.execute(
        select(func.count(Subscription.id)).where(
            Subscription.status == "active",
            Subscription.tier == SubscriptionTier.PRO
        )
    )
    pro_count = pro_count_result.scalar() or 0
    
    ultimate_count_result = await db.execute(
        select(func.count(Subscription.id)).where(
            Subscription.status == "active",
            Subscription.tier == SubscriptionTier.ULTIMATE
        )
    )
    ultimate_count = ultimate_count_result.scalar() or 0
    
    mrr = (pro_count * 9.99) + (ultimate_count * 19.99)
    arr = mrr * 12
    
    # Conversion rate
    conversion_rate = (paying_users / max(total_users, 1)) if total_users > 0 else 0
    
    # User growth rate
    user_growth_rate = ((new_users - prev_new_users) / max(prev_new_users, 1)) if prev_new_users > 0 else 0
    
    # PRODUCT METRICS
    books_per_user = total_books / max(total_users, 1) if total_users > 0 else 0
    chats_per_user = total_chats / max(total_users, 1) if total_users > 0 else 0
    
    # Retention rate (users active in both periods)
    retention_users_result = await db.execute(
        select(func.count(User.id)).where(
            User.last_login >= period_start,
            User.created_at < period_start
        )
    )
    retention_users = retention_users_result.scalar() or 0
    existing_users = total_users - new_users
    retention_rate = (retention_users / max(existing_users, 1)) if existing_users > 0 else 0
    
    # Daily active users (approximation - users active in last 24h)
    daily_active_result = await db.execute(
        select(func.count(User.id)).where(
            User.last_login >= now - timedelta(days=1)
        )
    )
    daily_active = daily_active_result.scalar() or 0
    
    # Calculate LTV (Lifetime Value)
    avg_revenue_per_user = mrr / max(paying_users, 1) if paying_users > 0 else 0
    estimated_churn = 0.05  # 5% monthly churn rate assumption
    ltv = avg_revenue_per_user / max(estimated_churn, 0.01) if estimated_churn > 0 else 0
    
    return {
        "period_days": days,
        "generated_at": now.isoformat(),
        
        # User Metrics
        "user_metrics": {
            "total_users": total_users,
            "active_users": active_users,
            "new_users": new_users,
            "daily_active_users": daily_active,
            "user_retention_rate": round(retention_rate, 4),
            "user_growth_rate": round(user_growth_rate, 4)
        },
        
        # Engagement Metrics
        "engagement_metrics": {
            "total_books": total_books,
            "total_chats": total_chats,
            "books_this_period": books_period,
            "chats_this_period": chats_period,
            "books_per_user": round(books_per_user, 2),
            "chats_per_user": round(chats_per_user, 2)
        },
        
        # Revenue Metrics
        "revenue_metrics": {
            "mrr": round(mrr, 2),
            "arr": round(arr, 2),
            "paying_users": paying_users,
            "pro_users": pro_count,
            "ultimate_users": ultimate_count,
            "conversion_rate": round(conversion_rate, 4),
            "estimated_churn_rate": estimated_churn,
            "ltv": round(ltv, 2)
        },
        
        # Growth Metrics
        "growth_metrics": {
            "user_growth_rate": round(user_growth_rate, 4),
            "new_users_current": new_users,
            "new_users_previous": prev_new_users
        }
    }


# === TOKEN USAGE ANALYTICS ===

@router.get("/token-usage/summary")
async def get_token_usage_summary(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get token usage summary for admin"""
    
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Total tokens used
    result = await db.execute(
        select(
            func.sum(TokenUsage.tokens_used).label("total_tokens"),
            func.sum(TokenUsage.prompt_tokens).label("total_prompt"),
            func.sum(TokenUsage.completion_tokens).label("total_completion"),
            func.sum(TokenUsage.estimated_cost).label("total_cost"),
            func.count(TokenUsage.id).label("total_requests")
        ).where(TokenUsage.created_at >= start_date)
    )
    summary = result.one()
    
    # Average response time
    result = await db.execute(
        select(func.avg(TokenUsage.response_time_ms))
        .where(
            and_(
                TokenUsage.created_at >= start_date,
                TokenUsage.response_time_ms.isnot(None)
            )
        )
    )
    avg_response_time = result.scalar() or 0
    
    # Cache hit rate
    result = await db.execute(
        select(
            func.count(TokenUsage.id).label("total"),
            func.sum(func.cast(TokenUsage.cache_hit == 'true', func.Integer)).label("hits")
        ).where(TokenUsage.created_at >= start_date)
    )
    cache_stats = result.one()
    cache_hit_rate = (cache_stats.hits / cache_stats.total * 100) if cache_stats.total > 0 else 0
    
    return {
        "period_days": days,
        "total_tokens": summary.total_tokens or 0,
        "total_prompt_tokens": summary.total_prompt or 0,
        "total_completion_tokens": summary.total_completion or 0,
        "total_cost_usd": round(summary.total_cost or 0, 4),
        "total_requests": summary.total_requests or 0,
        "avg_tokens_per_request": round((summary.total_tokens or 0) / (summary.total_requests or 1), 2),
        "avg_response_time_ms": round(avg_response_time, 2),
        "cache_hit_rate_percent": round(cache_hit_rate, 2)
    }


@router.get("/token-usage/by-action")
async def get_token_usage_by_action(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get token usage grouped by action type"""
    
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    result = await db.execute(
        select(
            TokenUsage.action,
            func.sum(TokenUsage.tokens_used).label("total_tokens"),
            func.count(TokenUsage.id).label("request_count"),
            func.sum(TokenUsage.estimated_cost).label("total_cost"),
            func.avg(TokenUsage.response_time_ms).label("avg_response_time")
        )
        .where(TokenUsage.created_at >= start_date)
        .group_by(TokenUsage.action)
        .order_by(desc("total_tokens"))
    )
    
    actions = []
    for row in result:
        actions.append({
            "action": row.action,
            "total_tokens": row.total_tokens or 0,
            "request_count": row.request_count or 0,
            "total_cost_usd": round(row.total_cost or 0, 4),
            "avg_response_time_ms": round(row.avg_response_time or 0, 2),
            "avg_tokens_per_request": round((row.total_tokens or 0) / (row.request_count or 1), 2)
        })
    
    return {
        "period_days": days,
        "actions": actions
    }


@router.get("/token-usage/by-user")
async def get_token_usage_by_user(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get top users by token usage"""
    
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    result = await db.execute(
        select(
            TokenUsage.user_id,
            User.email,
            User.username,
            func.sum(TokenUsage.tokens_used).label("total_tokens"),
            func.count(TokenUsage.id).label("request_count"),
            func.sum(TokenUsage.estimated_cost).label("total_cost")
        )
        .join(User, TokenUsage.user_id == User.id)
        .where(TokenUsage.created_at >= start_date)
        .group_by(TokenUsage.user_id, User.email, User.username)
        .order_by(desc("total_tokens"))
        .limit(limit)
    )
    
    users = []
    for row in result:
        users.append({
            "user_id": str(row.user_id),
            "email": row.email,
            "username": row.username,
            "total_tokens": row.total_tokens or 0,
            "request_count": row.request_count or 0,
            "total_cost_usd": round(row.total_cost or 0, 4),
            "avg_tokens_per_request": round((row.total_tokens or 0) / (row.request_count or 1), 2)
        })
    
    return {
        "period_days": days,
        "top_users": users
    }


@router.get("/token-usage/timeline")
async def get_token_usage_timeline(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get token usage over time (daily aggregation)"""
    
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    result = await db.execute(
        select(
            func.date(TokenUsage.created_at).label("date"),
            func.sum(TokenUsage.tokens_used).label("total_tokens"),
            func.count(TokenUsage.id).label("request_count"),
            func.sum(TokenUsage.estimated_cost).label("total_cost")
        )
        .where(TokenUsage.created_at >= start_date)
        .group_by(func.date(TokenUsage.created_at))
        .order_by("date")
    )
    
    timeline = []
    for row in result:
        timeline.append({
            "date": row.date.isoformat() if row.date else None,
            "total_tokens": row.total_tokens or 0,
            "request_count": row.request_count or 0,
            "total_cost_usd": round(row.total_cost or 0, 4)
        })
    
    return {
        "period_days": days,
        "timeline": timeline
    }

