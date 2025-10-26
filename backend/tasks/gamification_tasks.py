# Gamification Celery tasks
from celery_app import celery_app
from core.database import async_session
from services.leaderboard_service import leaderboard_service

@celery_app.task(name="tasks.gamification_tasks.update_leaderboard")
def update_leaderboard():
    """Update leaderboard rankings for all users"""
    import asyncio
    
    async def _update():
        async with async_session() as db:
            await leaderboard_service.calculate_rankings(db)
            return "Leaderboard updated"
    
    result = asyncio.run(_update())
    return result
