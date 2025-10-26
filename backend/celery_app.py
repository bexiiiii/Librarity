# Celery periodic tasks for automation
from celery import Celery
from celery.schedules import crontab
import os

celery_app = Celery(
    "librarity",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Periodic tasks schedule
celery_app.conf.beat_schedule = {
    # Reset monthly tokens (1st of every month at 00:00)
    "reset-monthly-tokens": {
        "task": "tasks.billing_tasks.reset_monthly_tokens",
        "schedule": crontab(hour=0, minute=0, day_of_month=1),
    },
    
    # Check and expire free trials (daily at 01:00)
    "expire-trials": {
        "task": "tasks.billing_tasks.expire_trials",
        "schedule": crontab(hour=1, minute=0),
    },
    
    # Generate daily AI quote (daily at 08:00)
    "generate-daily-quote": {
        "task": "tasks.content_tasks.generate_daily_quote",
        "schedule": crontab(hour=8, minute=0),
    },
    
    # Update leaderboard rankings (every 6 hours)
    "update-leaderboard": {
        "task": "tasks.gamification_tasks.update_leaderboard",
        "schedule": crontab(hour="*/6", minute=0),
    },
    
    # Clean old usage logs (weekly on Sunday at 02:00)
    "cleanup-logs": {
        "task": "tasks.maintenance_tasks.cleanup_old_logs",
        "schedule": crontab(hour=2, minute=0, day_of_week=0),
    },
    
    # Send weekly digest emails (Monday at 10:00)
    "send-weekly-digest": {
        "task": "tasks.email_tasks.send_weekly_digest",
        "schedule": crontab(hour=10, minute=0, day_of_week=1),
    },
    
    # Check inactive users (daily at 12:00)
    "check-inactive-users": {
        "task": "tasks.retention_tasks.check_inactive_users",
        "schedule": crontab(hour=12, minute=0),
    },
}
