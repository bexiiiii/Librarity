# Leaderboard service
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from models.leaderboard import Leaderboard
from models.user import User

class LeaderboardService:
    async def update_user_stats(
        self,
        db: AsyncSession,
        user_id: str,
        books_delta: int = 0,
        chats_delta: int = 0,
        tokens_delta: int = 0,
        shares_delta: int = 0
    ):
        """Update user leaderboard stats"""
        result = await db.execute(
            select(Leaderboard).where(Leaderboard.user_id == user_id)
        )
        entry = result.scalar_one_or_none()
        
        if not entry:
            # Create new entry
            entry = Leaderboard(
                user_id=user_id,
                total_books_read=books_delta,
                total_chats=chats_delta,
                total_tokens_used=tokens_delta,
                total_shares=shares_delta,
                last_active_date=datetime.utcnow()
            )
            db.add(entry)
        else:
            # Update existing
            entry.total_books_read += books_delta
            entry.total_chats += chats_delta
            entry.total_tokens_used += tokens_delta
            entry.total_shares += shares_delta
            
            # Update streak
            if entry.last_active_date:
                days_diff = (datetime.utcnow() - entry.last_active_date).days
                if days_diff == 1:
                    entry.streak_days += 1
                elif days_diff > 1:
                    entry.streak_days = 1
            else:
                entry.streak_days = 1
            
            entry.last_active_date = datetime.utcnow()
        
        await db.commit()
        await db.refresh(entry)
        return entry
    
    async def calculate_rankings(self, db: AsyncSession):
        """Recalculate all user rankings"""
        # Get all public leaderboard entries sorted by score
        result = await db.execute(
            select(Leaderboard)
            .where(Leaderboard.is_public == True)
            .order_by(
                desc(Leaderboard.total_books_read),
                desc(Leaderboard.total_chats),
                desc(Leaderboard.streak_days)
            )
        )
        entries = result.scalars().all()
        
        # Update ranks
        for idx, entry in enumerate(entries, start=1):
            entry.previous_rank = entry.rank
            entry.rank = idx
        
        await db.commit()
    
    async def get_top_users(
        self,
        db: AsyncSession,
        limit: int = 100,
        period: Optional[str] = None  # 'week', 'month', 'all'
    ) -> List[dict]:
        """Get top users on leaderboard"""
        query = select(Leaderboard, User).join(User).where(
            Leaderboard.is_public == True
        )
        
        # Filter by period if specified
        if period == 'week':
            week_ago = datetime.utcnow() - timedelta(days=7)
            query = query.where(Leaderboard.last_active_date >= week_ago)
        elif period == 'month':
            month_ago = datetime.utcnow() - timedelta(days=30)
            query = query.where(Leaderboard.last_active_date >= month_ago)
        
        query = query.order_by(Leaderboard.rank).limit(limit)
        
        result = await db.execute(query)
        rows = result.all()
        
        return [
            {
                "rank": lb.rank,
                "previous_rank": lb.previous_rank,
                "username": user.username,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url,
                "total_books_read": lb.total_books_read,
                "total_chats": lb.total_chats,
                "streak_days": lb.streak_days,
                "achievements": lb.achievements
            }
            for lb, user in rows
        ]
    
    async def get_user_rank(self, db: AsyncSession, user_id: str) -> Optional[dict]:
        """Get specific user's rank and stats"""
        result = await db.execute(
            select(Leaderboard, User)
            .join(User)
            .where(Leaderboard.user_id == user_id)
        )
        row = result.one_or_none()
        
        if not row:
            return None
        
        lb, user = row
        return {
            "rank": lb.rank,
            "previous_rank": lb.previous_rank,
            "username": user.username,
            "total_books_read": lb.total_books_read,
            "total_chats": lb.total_chats,
            "total_tokens_used": lb.total_tokens_used,
            "streak_days": lb.streak_days,
            "achievements": lb.achievements
        }

leaderboard_service = LeaderboardService()
