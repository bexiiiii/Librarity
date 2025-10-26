"""
Books API Endpoints - Upload and manage books
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
import structlog
import os
import uuid
from datetime import datetime

from core.database import get_db
from models.user import User
from models.book import Book
from models.subscription import Subscription
from schemas import BookResponse, BookList, SuccessResponse
from api.auth import get_current_user
from services.langchain_service import rag_pipeline
from workers.tasks import process_book_task

router = APIRouter()
logger = structlog.get_logger()


@router.post("/upload", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def upload_book(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a new book"""
    
    # Check subscription limits
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()
    
    # If no subscription, create free tier subscription
    if not subscription:
        from core.config import get_settings
        settings = get_settings()
        subscription = Subscription(
            user_id=current_user.id,
            tier="free",
            status="active",
            token_limit=settings.FREE_TIER_TOKEN_LIMIT,
            tokens_used=0,
            max_books=1
        )
        db.add(subscription)
        await db.commit()
        await db.refresh(subscription)
    
    # Count user's books
    result = await db.execute(
        select(func.count(Book.id)).where(Book.owner_id == current_user.id)
    )
    book_count = result.scalar()
    
    # Check book limit (max_books = -1 means unlimited)
    if subscription.max_books != -1 and book_count >= subscription.max_books:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Book limit reached ({subscription.max_books} books max). Upgrade your plan to upload more books."
        )
    
    # Validate file type
    allowed_types = ["application/pdf", "application/epub+zip", "text/plain"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, EPUB, and TXT files are supported"
        )
    
    # Save file
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1]
    file_path = f"uploads/{current_user.id}/{file_id}{file_ext}"
    
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    file_size = len(content)
    
    # Create book record
    book = Book(
        owner_id=current_user.id,
        title=title or file.filename,
        author=author,
        description=description,
        original_filename=file.filename,
        file_type=file_ext[1:],
        file_size=file_size,
        file_path=file_path,
        processing_status="pending"
    )
    
    db.add(book)
    await db.commit()
    await db.refresh(book)
    
    # Trigger background processing
    process_book_task.delay(str(book.id))
    
    logger.info("book_uploaded", book_id=str(book.id), user_id=str(current_user.id))
    
    return book


@router.get("/", response_model=BookList)
async def list_books(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List user's books"""
    
    offset = (page - 1) * page_size
    
    result = await db.execute(
        select(Book)
        .where(Book.owner_id == current_user.id)
        .offset(offset)
        .limit(page_size)
        .order_by(Book.created_at.desc())
    )
    books = result.scalars().all()
    
    # Get total count
    result = await db.execute(
        select(func.count(Book.id)).where(Book.owner_id == current_user.id)
    )
    total = result.scalar()
    
    return {
        "books": books,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/{book_id}", response_model=BookResponse)
async def get_book(
    book_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get book details"""
    
    result = await db.execute(
        select(Book).where(Book.id == book_id, Book.owner_id == current_user.id)
    )
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    return book


@router.delete("/{book_id}", response_model=SuccessResponse)
async def delete_book(
    book_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a book"""
    
    result = await db.execute(
        select(Book).where(Book.id == book_id, Book.owner_id == current_user.id)
    )
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Delete file
    if os.path.exists(book.file_path):
        os.remove(book.file_path)
    
    # Delete from database
    await db.delete(book)
    await db.commit()
    
    logger.info("book_deleted", book_id=book_id, user_id=str(current_user.id))
    
    return {"success": True, "message": "Book deleted successfully"}
