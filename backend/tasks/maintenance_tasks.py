# Maintenance Celery tasks
from celery_app import celery_app
from core.database import async_session
from sqlalchemy import delete
from models.usage_log import UsageLog
from datetime import datetime, timedelta

@celery_app.task(name="tasks.maintenance_tasks.cleanup_old_logs")
def cleanup_old_logs():
    """Clean up usage logs older than 90 days"""
    import asyncio
    
    async def _cleanup():
        async with async_session() as db:
            # Delete logs older than 90 days
            ninety_days_ago = datetime.utcnow() - timedelta(days=90)
            
            result = await db.execute(
                delete(UsageLog).where(UsageLog.created_at < ninety_days_ago)
            )
            
            await db.commit()
            
            return result.rowcount
    
    count = asyncio.run(_cleanup())
    return f"Deleted {count} old logs"
