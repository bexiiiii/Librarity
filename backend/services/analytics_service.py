# Analytics and tracking service
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_
from models.usage_log import UsageLog
from models.user import User
from models.book import Book
from models.chat import Chat
import json

class AnalyticsService:
    """Track and analyze user behavior"""
    
    async def log_event(
        self,
        db: AsyncSession,
        user_id: str,
        event_type: str,
        metadata: Optional[Dict[str, Any]] = None,
        book_id: Optional[str] = None,
        tokens_used: int = 0,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log user event"""
        
        log_entry = UsageLog(
            user_id=user_id,
            book_id=book_id,
            activity_type=event_type,
            tokens_used=tokens_used,
            metadata=json.dumps(metadata) if metadata else None,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.add(log_entry)
        await db.commit()
    
    async def get_user_activity(
        self,
        db: AsyncSession,
        user_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get user activity summary"""
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Total events
        total_events = await db.scalar(
            select(func.count(UsageLog.id))
            .where(
                and_(
                    UsageLog.user_id == user_id,
                    UsageLog.created_at >= start_date
                )
            )
        )
        
        # Events by type
        events_by_type = await db.execute(
            select(
                UsageLog.activity_type,
                func.count(UsageLog.id).label('count')
            )
            .where(
                and_(
                    UsageLog.user_id == user_id,
                    UsageLog.created_at >= start_date
                )
            )
            .group_by(UsageLog.activity_type)
        )
        
        # Total tokens
        total_tokens = await db.scalar(
            select(func.sum(UsageLog.tokens_used))
            .where(
                and_(
                    UsageLog.user_id == user_id,
                    UsageLog.created_at >= start_date
                )
            )
        ) or 0
        
        # Daily activity
        daily_activity = await db.execute(
            select(
                func.date(UsageLog.created_at).label('date'),
                func.count(UsageLog.id).label('events'),
                func.sum(UsageLog.tokens_used).label('tokens')
            )
            .where(
                and_(
                    UsageLog.user_id == user_id,
                    UsageLog.created_at >= start_date
                )
            )
            .group_by(func.date(UsageLog.created_at))
            .order_by('date')
        )
        
        return {
            "total_events": total_events,
            "events_by_type": {row.activity_type: row.count for row in events_by_type},
            "total_tokens": total_tokens,
            "daily_activity": [
                {
                    "date": str(row.date),
                    "events": row.events,
                    "tokens": row.tokens or 0
                }
                for row in daily_activity
            ]
        }
    
    async def get_popular_books(
        self,
        db: AsyncSession,
        limit: int = 10,
        days: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get most popular books by usage"""
        
        query = select(
            Book.id,
            Book.title,
            Book.author,
            func.count(UsageLog.id).label('usage_count'),
            func.sum(UsageLog.tokens_used).label('total_tokens')
        ).join(
            UsageLog, UsageLog.book_id == Book.id
        )
        
        if days:
            start_date = datetime.utcnow() - timedelta(days=days)
            query = query.where(UsageLog.created_at >= start_date)
        
        query = query.group_by(
            Book.id, Book.title, Book.author
        ).order_by(
            desc('usage_count')
        ).limit(limit)
        
        result = await db.execute(query)
        
        return [
            {
                "book_id": str(row.id),
                "title": row.title,
                "author": row.author,
                "usage_count": row.usage_count,
                "total_tokens": row.total_tokens or 0
            }
            for row in result
        ]
    
    async def get_retention_metrics(
        self,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Calculate user retention metrics"""
        
        now = datetime.utcnow()
        
        # Users registered last month
        month_ago = now - timedelta(days=30)
        users_last_month = await db.scalar(
            select(func.count(User.id))
            .where(User.created_at >= month_ago)
        )
        
        # Active users last 7 days
        week_ago = now - timedelta(days=7)
        active_last_week = await db.scalar(
            select(func.count(func.distinct(UsageLog.user_id)))
            .where(UsageLog.created_at >= week_ago)
        )
        
        # Active users last 30 days
        active_last_month = await db.scalar(
            select(func.count(func.distinct(UsageLog.user_id)))
            .where(UsageLog.created_at >= month_ago)
        )
        
        # DAU (Daily Active Users) for last 7 days
        dau_data = await db.execute(
            select(
                func.date(UsageLog.created_at).label('date'),
                func.count(func.distinct(UsageLog.user_id)).label('active_users')
            )
            .where(UsageLog.created_at >= week_ago)
            .group_by(func.date(UsageLog.created_at))
            .order_by('date')
        )
        
        return {
            "users_last_month": users_last_month,
            "active_last_week": active_last_week,
            "active_last_month": active_last_month,
            "retention_rate": (active_last_month / users_last_month * 100) if users_last_month > 0 else 0,
            "dau": [
                {
                    "date": str(row.date),
                    "active_users": row.active_users
                }
                for row in dau_data
            ]
        }
    
    async def get_feature_usage(
        self,
        db: AsyncSession,
        days: int = 30
    ) -> Dict[str, Any]:
        """Track which AI modes are most popular"""
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Chat modes usage
        modes_usage = await db.execute(
            select(
                UsageLog.chat_mode,
                func.count(UsageLog.id).label('count'),
                func.sum(UsageLog.tokens_used).label('tokens')
            )
            .where(
                and_(
                    UsageLog.activity_type == 'chat',
                    UsageLog.created_at >= start_date,
                    UsageLog.chat_mode != None
                )
            )
            .group_by(UsageLog.chat_mode)
            .order_by(desc('count'))
        )
        
        return {
            "modes": [
                {
                    "mode": row.chat_mode,
                    "usage_count": row.count,
                    "total_tokens": row.tokens or 0
                }
                for row in modes_usage
            ]
        }

analytics_service = AnalyticsService()

# PostHog integration
class PostHogTracker:
    """Track events to PostHog"""
    
    def __init__(self):
        import os
        self.api_key = os.getenv("POSTHOG_API_KEY")
        self.host = os.getenv("POSTHOG_HOST", "https://app.posthog.com")
        self.enabled = bool(self.api_key)
        
        if self.enabled:
            from posthog import Posthog
            self.client = Posthog(self.api_key, host=self.host)
        else:
            self.client = None
    
    def track(
        self,
        distinct_id: str,
        event: str,
        properties: Optional[Dict[str, Any]] = None
    ):
        """Track event to PostHog"""
        if self.enabled and self.client:
            self.client.capture(
                distinct_id=distinct_id,
                event=event,
                properties=properties or {}
            )
    
    def identify(self, distinct_id: str, properties: Dict[str, Any]):
        """Identify user in PostHog"""
        if self.enabled and self.client:
            self.client.identify(distinct_id, properties)

posthog_tracker = PostHogTracker()
