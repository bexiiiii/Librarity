# Email-related Celery tasks
from celery_app import celery_app
from core.database import async_session
from services.email_service import email_service
from services.analytics_service import analytics_service
from sqlalchemy import select, and_
from models.user import User
from models.subscription import Subscription, SubscriptionStatus
from datetime import datetime, timedelta

@celery_app.task(name="tasks.email_tasks.send_weekly_digest")
def send_weekly_digest():
    """Send weekly digest emails to active users"""
    import asyncio
    
    async def _send():
        async with async_session() as db:
            # Get active users with subscriptions
            result = await db.execute(
                select(User, Subscription)
                .join(Subscription)
                .where(
                    and_(
                        User.is_active == True,
                        Subscription.status == SubscriptionStatus.ACTIVE
                    )
                )
            )
            
            users = result.all()
            sent_count = 0
            
            for user, subscription in users:
                # Get user activity stats
                stats = await analytics_service.get_user_activity(
                    db=db,
                    user_id=user.id,
                    days=7
                )
                
                if stats["total_activity"] == 0:
                    continue  # Skip inactive users
                
                # Send digest email
                await email_service.send_email(
                    to=user.email,
                    subject="📚 Your Weekly Librarity Digest",
                    html=f"""
                    <h2>Your Week in Books</h2>
                    <p>Hi {user.email},</p>
                    
                    <h3>This week you:</h3>
                    <ul>
                        <li>Had {stats['total_activity']} interactions</li>
                        <li>Used {stats.get('tokens_used', 0)} tokens</li>
                        <li>Explored {stats.get('books_accessed', 0)} books</li>
                    </ul>
                    
                    <p>Keep up the great work! 🚀</p>
                    <a href="http://localhost:3000/library">Visit your library</a>
                    """
                )
                sent_count += 1
            
            return sent_count
    
    count = asyncio.run(_send())
    return f"Sent {count} weekly digests"
