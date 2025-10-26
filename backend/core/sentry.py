# Sentry integration for error tracking
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.redis import RedisIntegration
import os

def init_sentry():
    """Initialize Sentry error tracking"""
    
    sentry_dsn = os.getenv("SENTRY_DSN")
    environment = os.getenv("ENVIRONMENT", "development")
    
    if not sentry_dsn:
        print("⚠️  Sentry DSN not configured. Error tracking disabled.")
        return
    
    sentry_sdk.init(
        dsn=sentry_dsn,
        environment=environment,
        
        # Performance monitoring
        traces_sample_rate=1.0 if environment == "development" else 0.1,
        
        # Error sampling
        sample_rate=1.0,
        
        # Integrations
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
            CeleryIntegration(),
            RedisIntegration()
        ],
        
        # Release tracking
        release=os.getenv("GIT_COMMIT", "unknown"),
        
        # Additional context
        attach_stacktrace=True,
        send_default_pii=False,  # Don't send PII for privacy
        
        # Custom tags
        default_integrations=True,
        debug=environment == "development",
        
        # Ignore common errors
        ignore_errors=[
            KeyboardInterrupt,
        ],
        
        # Before send hook (filter sensitive data)
        before_send=before_send_filter
    )
    
    print(f"✅ Sentry initialized for environment: {environment}")

def before_send_filter(event, hint):
    """Filter sensitive data before sending to Sentry"""
    
    # Remove sensitive headers
    if "request" in event:
        if "headers" in event["request"]:
            sensitive_headers = ["Authorization", "Cookie", "X-API-Key"]
            for header in sensitive_headers:
                if header in event["request"]["headers"]:
                    event["request"]["headers"][header] = "[Filtered]"
    
    # Remove sensitive query params
    if "request" in event and "query_string" in event["request"]:
        sensitive_params = ["token", "api_key", "password"]
        query_string = event["request"]["query_string"]
        for param in sensitive_params:
            if param in query_string.lower():
                event["request"]["query_string"] = "[Filtered]"
    
    return event
