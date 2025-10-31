"""
Session Tracking Middleware - Track user sessions and activity
"""
from fastapi import Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timedelta
import uuid
import structlog

from core.database import get_db
from models.user_session import UserSession
from models.user import User

logger = structlog.get_logger()


async def track_user_session(request: Request, call_next):
    """
    Middleware to track user sessions and activity
    Creates or updates user session on each request
    """
    
    # Get response first
    response = await call_next(request)
    
    # Only track authenticated requests
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        return response
    
    # Skip session tracking for certain endpoints
    skip_paths = ["/api/health", "/api/docs", "/api/openapi.json"]
    if request.url.path in skip_paths:
        return response
    
    try:
        # Get user from request state (set by auth middleware)
        user = getattr(request.state, "user", None)
        if not user:
            return response
        
        # Get or create session
        from core.database import SessionLocal
        async with SessionLocal() as db:
            # Get session token from Authorization header
            token = authorization.replace("Bearer ", "")
            
            # Check if session exists
            result = await db.execute(
                select(UserSession).where(
                    UserSession.user_id == user.id,
                    UserSession.session_token == token,
                    UserSession.is_active == True
                )
            )
            session = result.scalar_one_or_none()
            
            if session:
                # Update existing session
                session.last_active_at = datetime.utcnow()
                
                # Increment counters based on request path
                if "/chat" in request.url.path:
                    session.chat_interactions += 1
                elif "/books" in request.url.path:
                    session.books_interacted = (session.books_interacted or 0) + 1
                
            else:
                # Create new session
                session = UserSession(
                    user_id=user.id,
                    session_token=token,
                    ip_address=request.client.host if request.client else None,
                    user_agent=request.headers.get("user-agent", ""),
                    started_at=datetime.utcnow(),
                    last_active_at=datetime.utcnow(),
                    is_active=True
                )
                db.add(session)
            
            await db.commit()
            
            # Close inactive sessions (not active for 30+ minutes)
            thirty_minutes_ago = datetime.utcnow() - timedelta(minutes=30)
            await db.execute(
                update(UserSession)
                .where(
                    UserSession.user_id == user.id,
                    UserSession.last_active_at < thirty_minutes_ago,
                    UserSession.is_active == True,
                    UserSession.ended_at.is_(None)
                )
                .values(
                    is_active=False,
                    ended_at=datetime.utcnow()
                )
            )
            await db.commit()
            
    except Exception as e:
        logger.error("session_tracking_error", error=str(e), user_id=str(user.id) if user else None)
    
    return response


async def close_user_session_on_logout(user_id: str, token: str, db: AsyncSession):
    """
    Close user session when they logout
    Calculate final duration
    """
    try:
        result = await db.execute(
            select(UserSession).where(
                UserSession.user_id == user_id,
                UserSession.session_token == token,
                UserSession.is_active == True
            )
        )
        session = result.scalar_one_or_none()
        
        if session:
            now = datetime.utcnow()
            session.ended_at = now
            session.is_active = False
            
            # Calculate duration
            if session.started_at:
                duration = (now - session.started_at).total_seconds()
                session.duration_seconds = int(duration)
            
            await db.commit()
            logger.info("session_closed", user_id=str(user_id), duration=session.duration_seconds)
            
    except Exception as e:
        logger.error("session_close_error", error=str(e), user_id=str(user_id))
