# Content generation Celery tasks
from celery_app import celery_app
from core.database import async_session
from services.ai_improvements import SmartSummarizer
from services.sharing_service import sharing_service
from sqlalchemy import select, func
from models.book import Book
from models.book_summary import BookSummary
import random

@celery_app.task(name="tasks.content_tasks.generate_daily_quote")
def generate_daily_quote():
    """Generate and share a daily AI-powered quote"""
    import asyncio
    
    async def _generate():
        async with async_session() as db:
            # Get a random popular book
            result = await db.execute(
                select(Book, BookSummary)
                .join(BookSummary)
                .order_by(func.random())
                .limit(1)
            )
            book_data = result.first()
            
            if not book_data:
                return "No books available"
            
            book, summary = book_data
            
            # Get quotes from summary
            quotes = summary.key_quotes or []
            if not quotes:
                return "No quotes available"
            
            # Pick a random quote
            quote = random.choice(quotes)
            
            # Generate share card
            share_url = await sharing_service.generate_quote_image(
                db=db,
                quote_text=quote.get("text", ""),
                book_title=book.title,
                author=quote.get("author", "Unknown"),
                user_id=book.user_id
            )
            
            return f"Generated quote card: {share_url}"
    
    result = asyncio.run(_generate())
    return result

@celery_app.task(name="tasks.content_tasks.auto_summarize_book")
def auto_summarize_book(book_id: str):
    """Auto-generate summary for uploaded book"""
    import asyncio
    
    async def _summarize():
        async with async_session() as db:
            # Get book
            result = await db.execute(
                select(Book).where(Book.id == book_id)
            )
            book = result.scalar_one_or_none()
            
            if not book:
                return "Book not found"
            
            # Generate summary
            summarizer = SmartSummarizer()
            summary_data = await summarizer.generate_summary(
                text=book.content[:10000],  # First 10k chars
                length="medium"
            )
            
            # Save to database
            from models.book_summary import BookSummary
            
            book_summary = BookSummary(
                book_id=book.id,
                short_summary=summary_data.get("summary", ""),
                long_summary=summary_data.get("long_summary", ""),
                key_topics=summary_data.get("topics", []),
                key_quotes=summary_data.get("quotes", []),
                seo_title=f"{book.title} - AI Summary",
                seo_description=summary_data.get("summary", "")[:160],
                seo_slug=book.title.lower().replace(" ", "-")
            )
            
            db.add(book_summary)
            await db.commit()
            
            return f"Generated summary for {book.title}"
    
    result = asyncio.run(_summarize())
    return result
