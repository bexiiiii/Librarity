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
import hashlib
from datetime import datetime
import PyPDF2
from io import BytesIO
import re

from core.database import get_db
from models.user import User
from models.book import Book
from models.subscription import Subscription
from schemas import BookResponse, BookList, SuccessResponse
from api.auth import get_current_user
from services.langchain_service import rag_pipeline
from services.cache_service import get_cache_service
from services.minio_service import MinIOService
from workers.tasks import process_book_task
from core.config import settings

router = APIRouter()
logger = structlog.get_logger()
cache = get_cache_service()
minio_service = MinIOService()


def validate_pdf_content(content: bytes) -> tuple[bool, str]:
    """
    Validate that PDF contains book-like content, not scripts or malicious code
    
    Returns:
        (is_valid, error_message)
    """
    try:
        pdf_file = BytesIO(content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        # Check if PDF has pages
        if len(pdf_reader.pages) == 0:
            return False, "PDF file is empty or corrupted"
        
        # Check minimum pages for a book (at least 5 pages)
        if len(pdf_reader.pages) < 5:
            return False, "File is too short to be a book. Books should have at least 5 pages."
        
        # Extract text from first few pages
        sample_text = ""
        pages_to_check = min(10, len(pdf_reader.pages))
        
        for i in range(pages_to_check):
            try:
                page_text = pdf_reader.pages[i].extract_text()
                if page_text:
                    sample_text += page_text + " "
            except Exception:
                continue
        
        # Check if we extracted any text
        if not sample_text or len(sample_text.strip()) < 100:
            return False, "Cannot extract text from PDF. Please upload a readable book file."
        
        # Patterns that indicate scripts or code (not books)
        suspicious_patterns = [
            r'#!/bin/bash',
            r'#!/usr/bin/env',
            r'import\s+(?:os|sys|subprocess|socket)',
            r'from\s+(?:os|sys|subprocess|socket)',
            r'<script[\s>]',
            r'<?php',
            r'SELECT\s+\*\s+FROM',
            r'DROP\s+TABLE',
            r'eval\s*\(',
            r'exec\s*\(',
            r'system\s*\(',
            r'curl\s+-',
            r'wget\s+http',
            r'rm\s+-rf',
            r'sudo\s+',
        ]
        
        # Check for suspicious patterns
        sample_lower = sample_text.lower()
        for pattern in suspicious_patterns:
            if re.search(pattern, sample_text, re.IGNORECASE):
                return False, "This PDF appears to contain scripts or code, not a book. Please upload only book files."
        
        # Check for excessive code-like content (many special characters)
        special_chars = sum(1 for c in sample_text[:1000] if c in '{}<>[]();=|&$#@')
        if special_chars > 100:  # Too many special characters
            return False, "This PDF appears to contain code or scripts, not readable book text."
        
        # Basic heuristic: books have more regular text with spaces and letters
        words = sample_text.split()
        if len(words) < 50:
            return False, "PDF content is too sparse to be a book."
        
        # Check average word length (books typically have 4-8 characters per word)
        avg_word_length = sum(len(w) for w in words[:100]) / min(100, len(words))
        if avg_word_length < 2 or avg_word_length > 15:
            return False, "PDF content doesn't appear to be normal book text."
        
        logger.info("pdf_content_validated", 
                   pages=len(pdf_reader.pages),
                   sample_length=len(sample_text),
                   words=len(words))
        
        return True, ""
        
    except PyPDF2.errors.PdfReadError:
        return False, "Invalid or corrupted PDF file"
    except Exception as e:
        logger.error("pdf_validation_error", error=str(e))
        return False, f"Failed to validate PDF: {str(e)}"


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
        subscription = Subscription(
            user_id=current_user.id,
            tier="free",
            status="active",
            token_limit=settings.FREE_TIER_TOKEN_LIMIT,
            tokens_used=0,
            max_books=3  # Увеличено до 3 книг для Free tier
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
    
    # Validate file type - ONLY PDF files for books
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported. Please upload a book in PDF format, not scripts or other documents."
        )
    
    # Additional validation - check file extension
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .pdf files are allowed. Please upload a book in PDF format."
        )
    
    # Read file content once
    content = await file.read()
    file_size = len(content)
    
    # Validate PDF content - check if it's really a book
    is_valid, validation_error = validate_pdf_content(content)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=validation_error
        )
    
    # Calculate file hash for deduplication
    file_hash = hashlib.sha256(content).hexdigest()
    
    # Check if user already has this exact file
    result = await db.execute(
        select(Book).where(
            Book.owner_id == current_user.id,
            Book.file_hash == file_hash
        )
    )
    existing_book = result.scalar_one_or_none()
    
    if existing_book:
        logger.info("duplicate_book_upload_prevented", 
                   book_id=str(existing_book.id), 
                   user_id=str(current_user.id),
                   file_hash=file_hash)
        
        # If book is not processed yet, trigger processing
        if not existing_book.is_processed and existing_book.processing_status != "processing":
            task = process_book_task.delay(str(existing_book.id))
            logger.info("celery_task_sent_for_existing_book", 
                       book_id=str(existing_book.id), 
                       task_id=str(task.id))
        
        # Return existing book instead of error
        return existing_book
    
    # Generate unique file ID
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"{file_id}{file_ext}"
    
    # Upload file to MinIO
    try:
        object_name = f"{current_user.id}/{filename}"
        await minio_service.upload_file(
            file_data=content,
            object_name=object_name,
            content_type=file.content_type
        )
        logger.info("book_uploaded_to_minio", 
                   object_name=object_name,
                   user_id=str(current_user.id))
    except Exception as e:
        logger.error("minio_upload_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file to storage: {str(e)}"
        )
    
    # Create book record with MinIO path
    book = Book(
        owner_id=current_user.id,
        title=title or file.filename,
        author=author,
        description=description,
        original_filename=file.filename,
        file_type=file_ext[1:],
        file_size=file_size,
        file_path=object_name,  # Store MinIO object name
        file_hash=file_hash,
        processing_status="pending"
    )
    
    db.add(book)
    await db.commit()
    await db.refresh(book)
    
    # Trigger background processing
    task = process_book_task.delay(str(book.id))
    logger.info("celery_task_sent", book_id=str(book.id), task_id=str(task.id))
    
    logger.info("book_uploaded", book_id=str(book.id), user_id=str(current_user.id))
    
    return book


@router.get("/", response_model=BookList)
async def list_books(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List user's books with caching"""
    
    # Try to get from cache first
    cached_data = cache.get_user_books_list(str(current_user.id), page, page_size)
    if cached_data:
        logger.info("books_list_cache_hit", user_id=str(current_user.id))
        return cached_data
    
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
    
    # Generate file URLs for each book
    items = []
    for book in books:
        file_url = None
        try:
            file_url = await minio_service.get_file_url(book.file_path, expires=3600)
        except Exception as e:
            logger.error("file_url_generation_failed", error=str(e), book_id=str(book.id))
        
        items.append({
            "id": str(book.id),
            "title": book.title,
            "author": book.author,
            "original_filename": book.original_filename,
            "file_type": book.file_type,
            "file_size": book.file_size,
            "file_url": file_url,
            "is_processed": book.is_processed,
            "processing_status": book.processing_status,
            "created_at": book.created_at.isoformat() if book.created_at else None,
        })
    
    response_data = {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }
    
    # Cache for 5 minutes
    cache.set_user_books_list(str(current_user.id), page, page_size, response_data, ttl=300)
    
    return response_data


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
    
    # Generate presigned URL for the book file
    file_url = None
    try:
        file_url = await minio_service.get_file_url(book.file_path, expires=3600)
    except Exception as e:
        logger.error("file_url_generation_failed", error=str(e), book_id=book_id)
    
    # Convert to dict and add file_url
    book_dict = {
        "id": book.id,
        "owner_id": book.owner_id,
        "title": book.title,
        "author": book.author,
        "description": book.description,
        "original_filename": book.original_filename,
        "file_type": book.file_type,
        "file_size": book.file_size,
        "file_url": file_url,
        "total_pages": book.total_pages,
        "total_words": book.total_words,
        "total_chunks": book.total_chunks,
        "is_processed": book.is_processed,
        "processing_status": book.processing_status,
        "created_at": book.created_at,
        "processed_at": book.processed_at,
    }
    
    return book_dict


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
    
    # Delete file from MinIO
    try:
        await minio_service.delete_file(book.file_path)
        logger.info("book_file_deleted_from_minio", object_path=book.file_path)
    except Exception as e:
        logger.error("minio_delete_failed", error=str(e), object_path=book.file_path)
        # Continue even if MinIO delete fails
    
    # Delete from database
    await db.delete(book)
    await db.commit()
    
    # Invalidate cache
    cache.invalidate_user_books_cache(str(current_user.id))
    cache.invalidate_book_cache(book_id)
    
    logger.info("book_deleted", book_id=book_id, user_id=str(current_user.id))
    
    return {"success": True, "message": "Book deleted successfully"}


@router.get("/{book_id}/download")
async def download_book(
    book_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get presigned URL for downloading book file"""
    
    result = await db.execute(
        select(Book).where(Book.id == book_id, Book.owner_id == current_user.id)
    )
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Generate presigned URL (valid for 1 hour)
    try:
        url = await minio_service.get_file_url(book.file_path, expires=3600)
        return {"download_url": url, "filename": book.original_filename}
    except Exception as e:
        logger.error("download_url_generation_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate download URL"
        )

