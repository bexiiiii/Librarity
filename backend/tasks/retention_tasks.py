# Retention and engagement Celery tasks
from celery_app import celery_app
from core.database import async_session
from services.email_service import email_service
from sqlalchemy import select
from models.user import User
from models.usage_log import UsageLog
from datetime import datetime, timedelta

@celery_app.task(name="tasks.retention_tasks.check_inactive_users")
def check_inactive_users():
    """Check for inactive users and send re-engagement emails"""
    import asyncio
    
    async def _check():
        async with async_session() as db:
            # Find users inactive for 7 days
            seven_days_ago = datetime.utcnow() - timedelta(days=7)
            
            # Get all active users
            result = await db.execute(
                select(User).where(User.is_active == True)
            )
            users = result.scalars().all()
            
            sent_count = 0
            
            for user in users:
                # Check last activity
                last_activity = await db.execute(
                    select(UsageLog)
                    .where(UsageLog.user_id == user.id)
                    .order_by(UsageLog.created_at.desc())
                    .limit(1)
                )
                last_log = last_activity.scalar_one_or_none()
                
                if not last_log or last_log.created_at < seven_days_ago:
                    # User is inactive, send re-engagement email
                    await email_service.send_email(
                        to=user.email,
                        subject="We miss you! 📚",
                        html="""
                        <h2>Come back to your library!</h2>
                        <p>It's been a while since we've seen you.</p>
                        <p>Your books are waiting for you. Continue your learning journey today!</p>
                        <a href="http://localhost:3000/library">Return to Librarity</a>
                        """
                    )
                    sent_count += 1
            
            return sent_count
    
    count = asyncio.run(_check())
    return f"Sent {count} re-engagement emails"
