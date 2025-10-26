# Billing-related Celery tasks
from celery_app import celery_app
from core.database import async_session
from services.billing_service import billing_service

@celery_app.task(name="tasks.billing_tasks.reset_monthly_tokens")
def reset_monthly_tokens():
    """Reset tokens for all active subscriptions (monthly)"""
    import asyncio
    
    async def _reset():
        async with async_session() as db:
            count = await billing_service.reset_monthly_tokens(db)
            return count
    
    count = asyncio.run(_reset())
    return f"Reset {count} subscriptions"

@celery_app.task(name="tasks.billing_tasks.expire_trials")
def expire_trials():
    """Check and expire free trials (daily)"""
    import asyncio
    
    async def _expire():
        async with async_session() as db:
            count = await billing_service.check_and_expire_trials(db)
            return count
    
    count = asyncio.run(_expire())
    return f"Expired {count} trials"
