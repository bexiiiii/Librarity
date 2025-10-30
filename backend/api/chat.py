"""
Chat API Endpoints - AI conversations with books
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import structlog
import uuid as uuid_lib

from core.database import get_db
from models.user import User
from models.book import Book
from models.chat import Chat, ChatMode
from schemas import ChatRequest, ChatResponse, ChatHistory, ChatHistoryMessages
from api.auth import get_current_user
from services.langchain_service import rag_pipeline
from services.token_manager import token_manager

router = APIRouter()
logger = structlog.get_logger()


@router.post("/", response_model=ChatResponse)
async def chat_with_book(
    chat_request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Chat with a book using AI"""
    
    # Get book and verify ownership
    result = await db.execute(
        select(Book).where(
            Book.id == chat_request.book_id,
            Book.owner_id == current_user.id
        )
    )
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    if not book.is_processed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book is still being processed. Please wait."
        )
    
    # Check token limits (estimate ~500 tokens for this interaction)
    estimated_tokens = 500
    await token_manager.check_token_limit(db, str(current_user.id), estimated_tokens)
    
    # Get conversation history if session_id provided
    conversation_history = []
    session_id = chat_request.session_id or uuid_lib.uuid4()
    
    if chat_request.session_id:
        result = await db.execute(
            select(Chat)
            .where(Chat.session_id == chat_request.session_id)
            .order_by(Chat.created_at.asc())
            .limit(10)
        )
        past_chats = result.scalars().all()
        
        for chat in past_chats:
            conversation_history.append({"role": "user", "content": chat.user_message})
            conversation_history.append({"role": "assistant", "content": chat.ai_response})
    
    # Prepare book metadata
    book_metadata = {
        "title": book.title,
        "author": book.author,
        "description": book.description
    }
    
    # Generate AI response
    try:
        ai_result = await rag_pipeline.chat_with_book(
            book_id=str(book.id),
            user_message=chat_request.message,
            mode=chat_request.mode,
            book_metadata=book_metadata,
            conversation_history=conversation_history
        )
    except Exception as e:
        logger.error("chat_generation_failed", error=str(e), book_id=str(book.id))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate response"
        )
    
    # Create chat record
    chat = Chat(
        user_id=current_user.id,
        book_id=book.id,
        session_id=session_id,
        mode=chat_request.mode,
        user_message=chat_request.message,
        ai_response=ai_result["response"],
        context_used=ai_result.get("context_chunks"),
        citations=ai_result.get("citations") if chat_request.include_citations else None,
        tokens_used=ai_result["tokens_used"]
    )
    
    db.add(chat)
    
    # Consume tokens
    await token_manager.consume_tokens(
        db=db,
        user_id=str(current_user.id),
        tokens_used=ai_result["tokens_used"],
        action="chat",
        mode=chat_request.mode.value
    )
    
    await db.commit()
    await db.refresh(chat)
    
    logger.info(
        "chat_completed",
        chat_id=str(chat.id),
        user_id=str(current_user.id),
        book_id=str(book.id),
        tokens_used=ai_result["tokens_used"]
    )
    
    return chat


@router.get("/history/{session_id}", response_model=ChatHistoryMessages)
async def get_chat_history(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get chat history for a session as flat list of messages"""
    
    result = await db.execute(
        select(Chat)
        .where(
            Chat.session_id == session_id,
            Chat.user_id == current_user.id
        )
        .order_by(Chat.created_at.asc())
    )
    chats = result.scalars().all()
    
    if not chats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    # Get book_id from the first chat
    book_id = chats[0].book_id if chats else None
    
    # Transform each chat into TWO messages: user message + AI response
    messages = []
    for chat in chats:
        # Add user message
        messages.append({
            "role": "user",
            "content": chat.user_message,
            "created_at": chat.created_at
        })
        # Add AI response
        messages.append({
            "role": "assistant",
            "content": chat.ai_response,
            "created_at": chat.created_at
        })
    
    return {
        "messages": messages,
        "total": len(messages),
        "session_id": session_id,
        "book_id": book_id
    }


@router.get("/sessions", response_model=List[dict])
async def get_user_sessions(
    book_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's chat sessions with book details"""
    
    logger.info(f"Getting chat sessions for user {current_user.id}, book_id: {book_id}")
    
    # Join with books to get book title
    query = (
        select(
            Chat.session_id, 
            Chat.book_id, 
            Chat.created_at,
            Book.title,
            Book.author
        )
        .join(Book, Chat.book_id == Book.id)
        .where(Chat.user_id == current_user.id)
    )
    
    if book_id:
        query = query.where(Chat.book_id == book_id)
    
    # Получаем уникальные сессии и сортируем по последнему сообщению
    query = query.distinct(Chat.session_id).order_by(Chat.session_id, Chat.created_at.desc())
    
    result = await db.execute(query)
    sessions = result.all()
    
    logger.info(f"Found {len(sessions)} chat sessions for user {current_user.id}")
    
    return [
        {
            "session_id": str(session[0]),
            "book_id": str(session[1]),
            "created_at": session[2],
            "book_title": session[3],
            "book_author": session[4]
        }
        for session in sessions
    ]
