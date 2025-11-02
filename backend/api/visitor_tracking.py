"""
Visitor tracking API endpoints
Track anonymous visitors and conversion analytics
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional
import structlog

from core.database import get_db
from models.visitor import AnonymousVisitor
from models.user import User, UserRole
from api.auth import get_current_user_optional, get_current_user

logger = structlog.get_logger()

router = APIRouter(prefix="/api/tracking", tags=["tracking"])


class VisitorTrackingRequest(BaseModel):
    """Request model for tracking visitor"""
    visitor_id: str  # Generated fingerprint from frontend
    landing_page: Optional[str] = None
    referrer: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None


@router.post("/visit")
async def track_visit(
    data: VisitorTrackingRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Track a visitor (anonymous or authenticated)"""
    
    try:
        # Check if visitor already exists
        result = await db.execute(
            select(AnonymousVisitor).where(
                AnonymousVisitor.visitor_id == data.visitor_id
            )
        )
        visitor = result.scalar_one_or_none()
        
        if visitor:
            # Update existing visitor
            visitor.last_visit = datetime.utcnow()
            visitor.visit_count += 1
            visitor.pages_visited += 1
            
            # If user is now authenticated and wasn't before
            if current_user and not visitor.converted_to_user:
                visitor.converted_to_user = True
                visitor.user_id = current_user.id
                
                logger.info(
                    "visitor_converted",
                    visitor_id=data.visitor_id,
                    user_id=str(current_user.id)
                )
        else:
            # Create new visitor record
            visitor = AnonymousVisitor(
                visitor_id=data.visitor_id,
                first_visit=datetime.utcnow(),
                last_visit=datetime.utcnow(),
                visit_count=1,
                pages_visited=1,
                landing_page=data.landing_page,
                referrer=data.referrer,
                utm_source=data.utm_source,
                utm_medium=data.utm_medium,
                utm_campaign=data.utm_campaign,
                device_type=data.device_type,
                browser=data.browser,
                os=data.os,
                converted_to_user=bool(current_user),
                user_id=current_user.id if current_user else None
            )
            db.add(visitor)
            
            logger.info(
                "new_visitor_tracked",
                visitor_id=data.visitor_id,
                landing_page=data.landing_page,
                authenticated=bool(current_user)
            )
        
        await db.commit()
        
        return {
            "success": True,
            "visitor_id": data.visitor_id,
            "visit_count": visitor.visit_count
        }
        
    except Exception as e:
        await db.rollback()
        logger.error("visitor_tracking_error", error=str(e), visitor_id=data.visitor_id)
        raise HTTPException(status_code=500, detail="Failed to track visitor")


@router.get("/stats")
async def get_visitor_stats(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get visitor statistics (admin only)"""
    
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Total unique visitors
    total_visitors_result = await db.execute(
        select(func.count(AnonymousVisitor.id))
    )
    total_visitors = total_visitors_result.scalar() or 0
    
    # Visitors in period
    period_visitors_result = await db.execute(
        select(func.count(AnonymousVisitor.id)).where(
            AnonymousVisitor.first_visit >= start_date
        )
    )
    period_visitors = period_visitors_result.scalar() or 0
    
    # Anonymous visitors (not converted)
    anonymous_result = await db.execute(
        select(func.count(AnonymousVisitor.id)).where(
            and_(
                AnonymousVisitor.first_visit >= start_date,
                AnonymousVisitor.converted_to_user == False
            )
        )
    )
    anonymous_visitors = anonymous_result.scalar() or 0
    
    # Converted visitors
    converted_result = await db.execute(
        select(func.count(AnonymousVisitor.id)).where(
            and_(
                AnonymousVisitor.first_visit >= start_date,
                AnonymousVisitor.converted_to_user == True
            )
        )
    )
    converted_visitors = converted_result.scalar() or 0
    
    # Conversion rate
    conversion_rate = (converted_visitors / period_visitors * 100) if period_visitors > 0 else 0
    
    # Bounce rate (visitors with only 1 visit)
    bounce_result = await db.execute(
        select(func.count(AnonymousVisitor.id)).where(
            and_(
                AnonymousVisitor.first_visit >= start_date,
                AnonymousVisitor.visit_count == 1,
                AnonymousVisitor.converted_to_user == False
            )
        )
    )
    bounced_visitors = bounce_result.scalar() or 0
    bounce_rate = (bounced_visitors / anonymous_visitors * 100) if anonymous_visitors > 0 else 0
    
    # Average visits per visitor
    avg_visits_result = await db.execute(
        select(func.avg(AnonymousVisitor.visit_count)).where(
            AnonymousVisitor.first_visit >= start_date
        )
    )
    avg_visits = avg_visits_result.scalar() or 0
    
    # Traffic sources
    sources_result = await db.execute(
        select(
            AnonymousVisitor.utm_source,
            func.count(AnonymousVisitor.id).label('count')
        )
        .where(
            and_(
                AnonymousVisitor.first_visit >= start_date,
                AnonymousVisitor.utm_source.isnot(None)
            )
        )
        .group_by(AnonymousVisitor.utm_source)
        .order_by(func.count(AnonymousVisitor.id).desc())
        .limit(10)
    )
    traffic_sources = [
        {"source": row.utm_source, "visitors": row.count}
        for row in sources_result
    ]
    
    # Device types
    devices_result = await db.execute(
        select(
            AnonymousVisitor.device_type,
            func.count(AnonymousVisitor.id).label('count')
        )
        .where(
            and_(
                AnonymousVisitor.first_visit >= start_date,
                AnonymousVisitor.device_type.isnot(None)
            )
        )
        .group_by(AnonymousVisitor.device_type)
    )
    devices = [
        {"device": row.device_type, "count": row.count}
        for row in devices_result
    ]
    
    # Daily timeline
    from sqlalchemy import case
    timeline_result = await db.execute(
        select(
            func.date(AnonymousVisitor.first_visit).label('date'),
            func.count(AnonymousVisitor.id).label('new_visitors'),
            func.sum(
                case((AnonymousVisitor.converted_to_user == True, 1), else_=0)
            ).label('conversions')
        )
        .where(AnonymousVisitor.first_visit >= start_date)
        .group_by(func.date(AnonymousVisitor.first_visit))
        .order_by('date')
    )
    timeline = [
        {
            "date": row.date.isoformat(),
            "new_visitors": row.new_visitors,
            "conversions": row.conversions or 0
        }
        for row in timeline_result
    ]
    
    return {
        "period_days": days,
        "total_visitors": total_visitors,
        "period_visitors": period_visitors,
        "anonymous_visitors": anonymous_visitors,
        "converted_visitors": converted_visitors,
        "conversion_rate_percent": round(conversion_rate, 2),
        "bounce_rate_percent": round(bounce_rate, 2),
        "avg_visits_per_visitor": round(avg_visits, 2),
        "traffic_sources": traffic_sources,
        "devices": devices,
        "timeline": timeline
    }


@router.get("/funnel")
async def get_conversion_funnel(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get conversion funnel analytics (admin only)"""
    
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Step 1: Landed on site
    landed_result = await db.execute(
        select(func.count(AnonymousVisitor.id)).where(
            AnonymousVisitor.first_visit >= start_date
        )
    )
    landed = landed_result.scalar() or 0
    
    # Step 2: Returned (more than 1 visit)
    returned_result = await db.execute(
        select(func.count(AnonymousVisitor.id)).where(
            and_(
                AnonymousVisitor.first_visit >= start_date,
                AnonymousVisitor.visit_count > 1
            )
        )
    )
    returned = returned_result.scalar() or 0
    
    # Step 3: Registered
    registered_result = await db.execute(
        select(func.count(AnonymousVisitor.id)).where(
            and_(
                AnonymousVisitor.first_visit >= start_date,
                AnonymousVisitor.converted_to_user == True
            )
        )
    )
    registered = registered_result.scalar() or 0
    
    # Step 4: Uploaded book (users who have books)
    from models.book import Book
    uploaded_result = await db.execute(
        select(func.count(func.distinct(Book.owner_id))).where(
            and_(
                Book.created_at >= start_date,
                Book.owner_id.in_(
                    select(AnonymousVisitor.user_id).where(
                        and_(
                            AnonymousVisitor.first_visit >= start_date,
                            AnonymousVisitor.converted_to_user == True
                        )
                    )
                )
            )
        )
    )
    uploaded_book = uploaded_result.scalar() or 0
    
    # Step 5: Active users (created chat)
    from models.chat import Chat
    active_result = await db.execute(
        select(func.count(func.distinct(Chat.user_id))).where(
            and_(
                Chat.created_at >= start_date,
                Chat.user_id.in_(
                    select(AnonymousVisitor.user_id).where(
                        and_(
                            AnonymousVisitor.first_visit >= start_date,
                            AnonymousVisitor.converted_to_user == True
                        )
                    )
                )
            )
        )
    )
    active_users = active_result.scalar() or 0
    
    # Step 6: Paying users
    from models.subscription import Subscription, SubscriptionTier
    paying_result = await db.execute(
        select(func.count(func.distinct(Subscription.user_id))).where(
            and_(
                Subscription.status == "active",
                Subscription.tier.in_([SubscriptionTier.PRO, SubscriptionTier.ULTIMATE]),
                Subscription.user_id.in_(
                    select(AnonymousVisitor.user_id).where(
                        and_(
                            AnonymousVisitor.first_visit >= start_date,
                            AnonymousVisitor.converted_to_user == True
                        )
                    )
                )
            )
        )
    )
    paying_users = paying_result.scalar() or 0
    
    # Calculate conversion rates
    funnel = [
        {
            "step": "Landed on site",
            "count": landed,
            "conversion_rate": 100.0
        },
        {
            "step": "Returned visitor",
            "count": returned,
            "conversion_rate": round((returned / landed * 100) if landed > 0 else 0, 2)
        },
        {
            "step": "Registered",
            "count": registered,
            "conversion_rate": round((registered / landed * 100) if landed > 0 else 0, 2)
        },
        {
            "step": "Uploaded book",
            "count": uploaded_book,
            "conversion_rate": round((uploaded_book / landed * 100) if landed > 0 else 0, 2)
        },
        {
            "step": "Active user (chatted)",
            "count": active_users,
            "conversion_rate": round((active_users / landed * 100) if landed > 0 else 0, 2)
        },
        {
            "step": "Paying customer",
            "count": paying_users,
            "conversion_rate": round((paying_users / landed * 100) if landed > 0 else 0, 2)
        }
    ]
    
    return {
        "period_days": days,
        "funnel": funnel
    }
