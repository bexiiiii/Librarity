# Extended Admin API endpoints
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta
import structlog

from core.database import get_db
from models.user import User, UserRole
from models.book import Book
from models.chat import Chat
from models.subscription import Subscription
from models.shared_content import SharedContent
from api.auth import get_current_user
from services.email_service import email_service
from services.telegram_service import telegram_service
from services.leaderboard_service import leaderboard_service

router = APIRouter(prefix="/admin", tags=["admin"])
logger = structlog.get_logger()

async def get_admin_user(current_user: User = Depends(get_current_user)):
    """Verify user has admin role"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ==================== DASHBOARD STATS ====================

@router.get("/stats/overview")
async def get_overview_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get comprehensive dashboard statistics"""
    
    # User stats
    total_users = await db.scalar(select(func.count(User.id)))
    active_users = await db.scalar(
        select(func.count(User.id)).where(User.is_active == True)
    )
    
    # Users joined today
    today = datetime.utcnow().date()
    users_today = await db.scalar(
        select(func.count(User.id)).where(
            func.date(User.created_at) == today
        )
    )
    
    # Book stats
    total_books = await db.scalar(select(func.count(Book.id)))
    processed_books = await db.scalar(
        select(func.count(Book.id)).where(Book.is_processed == True)
    )
    books_today = await db.scalar(
        select(func.count(Book.id)).where(
            func.date(Book.created_at) == today
        )
    )
    
    # Chat stats
    total_chats = await db.scalar(select(func.count(Chat.id)))
    chats_today = await db.scalar(
        select(func.count(Chat.id)).where(
            func.date(Chat.created_at) == today
        )
    )
    
    # Token usage
    total_tokens = await db.scalar(
        select(func.sum(Chat.tokens_used)).where(Chat.tokens_used != None)
    ) or 0
    
    # Subscription stats
    pro_users = await db.scalar(
        select(func.count(Subscription.id)).where(
            Subscription.tier == "pro"
        )
    )
    ultimate_users = await db.scalar(
        select(func.count(Subscription.id)).where(
            Subscription.tier == "ultimate"
        )
    )
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "today": users_today,
            "pro": pro_users,
            "ultimate": ultimate_users
        },
        "books": {
            "total": total_books,
            "processed": processed_books,
            "today": books_today,
            "pending": total_books - processed_books
        },
        "chats": {
            "total": total_chats,
            "today": chats_today
        },
        "tokens": {
            "total_used": total_tokens
        }
    }

@router.get("/stats/growth")
async def get_growth_stats(
    days: int = Query(30, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get growth statistics over time"""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Daily user signups
    user_growth = await db.execute(
        select(
            func.date(User.created_at).label('date'),
            func.count(User.id).label('count')
        )
        .where(User.created_at >= start_date)
        .group_by(func.date(User.created_at))
        .order_by('date')
    )
    
    # Daily book uploads
    book_growth = await db.execute(
        select(
            func.date(Book.created_at).label('date'),
            func.count(Book.id).label('count')
        )
        .where(Book.created_at >= start_date)
        .group_by(func.date(Book.created_at))
        .order_by('date')
    )
    
    return {
        "users": [{"date": str(row.date), "count": row.count} for row in user_growth],
        "books": [{"date": str(row.date), "count": row.count} for row in book_growth]
    }

# ==================== USER MANAGEMENT ====================

@router.get("/users/search")
async def search_users(
    q: str = Query("", min_length=1),
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Search users by email, username, or name"""
    
    query = select(User).where(
        (User.email.ilike(f"%{q}%")) |
        (User.username.ilike(f"%{q}%")) |
        (User.full_name.ilike(f"%{q}%"))
    ).offset(skip).limit(limit)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return [
        {
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role.value,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat()
        }
        for user in users
    ]

@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role: UserRole,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Update user role"""
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = role
    await db.commit()
    
    return {"message": f"User role updated to {role.value}"}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Permanently delete user and all their data"""
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Cannot delete admin users")
    
    await db.delete(user)
    await db.commit()
    
    # Notify admin
    await telegram_service.send_message(
        f"🗑️ User deleted: {user.email} by {admin.email}"
    )
    
    return {"message": "User deleted successfully"}

# ==================== BOOK MANAGEMENT ====================

@router.get("/books")
async def get_all_books(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get all books with filters"""
    
    # Build query with join to get owner info
    query = select(Book, User).join(User, Book.owner_id == User.id)
    
    # Apply search filter
    if search:
        query = query.where(
            or_(
                Book.title.ilike(f"%{search}%"),
                Book.author.ilike(f"%{search}%")
            )
        )
    
    # Apply status filter
    if status:
        query = query.where(Book.processing_status == status)
    
    # Get total count before pagination
    count_query = select(func.count(Book.id))
    if search:
        count_query = count_query.where(
            or_(
                Book.title.ilike(f"%{search}%"),
                Book.author.ilike(f"%{search}%")
            )
        )
    if status:
        count_query = count_query.where(Book.processing_status == status)
    
    total = await db.scalar(count_query) or 0
    
    # Apply pagination
    query = query.order_by(desc(Book.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    rows = result.all()
    
    books_data = [
        {
            "id": str(book.id),
            "title": book.title,
            "author": book.author,
            "file_type": book.file_type,
            "file_size": book.file_size,
            "total_pages": book.total_pages,
            "total_chunks": book.total_chunks,
            "processing_status": book.processing_status,
            "is_processed": book.is_processed,
            "owner": {
                "id": str(user.id),
                "email": user.email,
                "username": user.username
            },
            "created_at": book.created_at.isoformat() if book.created_at else None,
            "processed_at": book.processed_at.isoformat() if book.processed_at else None
        }
        for book, user in rows
    ]
    
    return {
        "books": books_data,
        "total": total
    }

@router.delete("/books/{book_id}")
async def delete_book(
    book_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Delete a book"""
    
    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    await db.delete(book)
    await db.commit()
    
    return {"message": "Book deleted successfully"}

@router.post("/books/{book_id}/reprocess")
async def reprocess_book(
    book_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Retry book processing"""
    
    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    book.processing_status = "pending"
    book.is_processed = False
    await db.commit()
    
    # Trigger Celery task (would be imported)
    # process_book_task.delay(str(book.id))
    
    return {"message": "Book queued for reprocessing"}

# ==================== SHARED CONTENT ====================

@router.get("/content/trending")
async def get_trending_content(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get trending shared content"""
    
    result = await db.execute(
        select(SharedContent, User, Book)
        .join(User)
        .outerjoin(Book)
        .where(SharedContent.is_public == True)
        .order_by(desc(SharedContent.share_count))
        .limit(limit)
    )
    
    rows = result.all()
    
    return [
        {
            "id": str(content.id),
            "content_type": content.content_type,
            "title": content.title,
            "content": content.content[:200],
            "share_url": content.share_url,
            "view_count": content.view_count,
            "share_count": content.share_count,
            "user": {
                "username": user.username,
                "full_name": user.full_name
            },
            "book": {
                "title": book.title if book else None
            },
            "created_at": content.created_at.isoformat()
        }
        for content, user, book in rows
    ]

@router.patch("/content/{content_id}/feature")
async def feature_content(
    content_id: str,
    is_featured: bool,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Feature or unfeature shared content"""
    
    result = await db.execute(
        select(SharedContent).where(SharedContent.id == content_id)
    )
    content = result.scalar_one_or_none()
    
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    content.is_featured = is_featured
    await db.commit()
    
    return {"message": f"Content {'featured' if is_featured else 'unfeatured'}"}

# ==================== LEADERBOARD ====================

@router.post("/leaderboard/calculate")
async def recalculate_leaderboard(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Manually trigger leaderboard recalculation"""
    
    await leaderboard_service.calculate_rankings(db)
    
    return {"message": "Leaderboard recalculated successfully"}

@router.get("/leaderboard/top")
async def get_leaderboard_top(
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get full leaderboard"""
    
    return await leaderboard_service.get_top_users(db, limit=limit)

# ==================== SYSTEM NOTIFICATIONS ====================

@router.post("/notifications/test-email")
async def test_email(
    email: str,
    admin: User = Depends(get_admin_user)
):
    """Test email service"""
    
    success = await email_service.send_email(
        to=email,
        subject="Test Email from Librarity",
        html="<h1>Email service is working! ✅</h1>"
    )
    
    return {"success": success}

@router.post("/notifications/test-telegram")
async def test_telegram(
    admin: User = Depends(get_admin_user)
):
    """Test Telegram notifications"""
    
    success = await telegram_service.send_message(
        "🧪 Test message from Librarity Admin Panel"
    )
    
    return {"success": success}

@router.post("/notifications/broadcast")
async def broadcast_notification(
    subject: str,
    message: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Send broadcast email to all active users"""
    
    result = await db.execute(
        select(User).where(User.is_active == True)
    )
    users = result.scalars().all()
    
    sent_count = 0
    for user in users:
        success = await email_service.send_email(
            to=user.email,
            subject=subject,
            html=f"<html><body><p>{message}</p></body></html>"
        )
        if success:
            sent_count += 1
    
    await telegram_service.send_message(
        f"📧 Broadcast sent to {sent_count}/{len(users)} users"
    )
    
    return {
        "message": f"Broadcast sent to {sent_count} users",
        "total": len(users),
        "sent": sent_count
    }


# ==================== BOOKS MANAGEMENT ====================
# (Books endpoints moved to earlier in file - lines 229-297)

@router.delete("/books/{book_id}")
async def delete_admin_book(
    book_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Delete a book (admin only)"""
    
    result = await db.execute(
        select(Book).where(Book.id == book_id)
    )
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    await db.delete(book)
    await db.commit()
    
    return {"message": f"Book '{book.title}' deleted successfully"}


@router.post("/books/{book_id}/reprocess")
async def reprocess_book(
    book_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Reprocess a book"""
    
    result = await db.execute(
        select(Book).where(Book.id == book_id)
    )
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Reset processing status
    book.processing_status = "pending"
    book.processing_error = None
    book.processed_at = None
    
    await db.commit()
    
    # TODO: Trigger reprocessing task
    
    return {"message": f"Book '{book.title}' queued for reprocessing"}


@router.get("/books/{book_id}/download")
async def admin_download_book(
    book_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Generate presigned URL for downloading book file (admin access)"""
    from services.minio_service import minio_service
    
    # Find book
    result = await db.execute(
        select(Book).where(Book.id == book_id)
    )
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Generate presigned URL (valid for 1 hour)
    try:
        url = await minio_service.get_file_url(book.file_path, expires=3600)
        return {
            "download_url": url, 
            "filename": book.original_filename or f"{book.title}.{book.file_type}",
            "file_size": book.file_size,
            "file_type": book.file_type
        }
    except Exception as e:
        logger.error("admin_download_url_generation_failed", book_id=book_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate download URL: {str(e)}"
        )
