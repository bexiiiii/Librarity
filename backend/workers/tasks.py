"""
Celery Tasks for Background Processing
"""
from workers.celery_app import celery_app
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
import structlog
from datetime import datetime
import PyPDF2
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup

from core.config import settings
from models.book import Book
from services.langchain_service import rag_pipeline

logger = structlog.get_logger()

# Create sync engine for Celery tasks
sync_db_url = settings.DATABASE_URL.replace("+asyncpg", "")
engine = create_engine(sync_db_url)
SessionLocal = sessionmaker(bind=engine)


@celery_app.task(bind=True, max_retries=3)
def process_book_task(self, book_id: str):
    """Process uploaded book - extract text, chunk, and embed"""
    
    logger.info("book_processing_started", book_id=book_id)
    
    db = SessionLocal()
    book = None
    
    try:
        # Get book from database
        result = db.execute(
            select(Book).where(Book.id == book_id)
        )
        book = result.scalar_one_or_none()
        
        if not book:
            logger.error("book_not_found", book_id=book_id)
            return
        
        # Update status
        book.processing_status = "processing"
        db.commit()
        
        # Extract metadata first
        file_metadata = {}
        if book.file_type == "epub":
            file_metadata = extract_epub_metadata(book.file_path)
        elif book.file_type == "pdf":
            file_metadata = extract_pdf_metadata(book.file_path)
        
        # Update book with extracted metadata if not already set
        if file_metadata.get('author') and not book.author:
            book.author = file_metadata['author']
            logger.info("extracted_author", book_id=book_id, author=book.author)
        
        if file_metadata.get('title') and (not book.title or book.title == book.original_filename):
            book.title = file_metadata['title']
            logger.info("extracted_title", book_id=book_id, title=book.title)
        
        db.commit()
        
        # Extract text based on file type
        if book.file_type == "pdf":
            text = extract_text_from_pdf(book.file_path)
        elif book.file_type == "epub":
            text = extract_text_from_epub(book.file_path)
        elif book.file_type == "txt":
            with open(book.file_path, "r", encoding="utf-8") as f:
                text = f.read()
        else:
            raise ValueError(f"Unsupported file type: {book.file_type}")
        
        if not text or len(text) < 100:
            raise ValueError("Extracted text is too short or empty")
        
        # Count words and estimate pages
        word_count = len(text.split())
        estimated_pages = word_count // 250  # Rough estimate
        
        # Prepare metadata
        metadata = {
            "title": book.title,
            "author": book.author,
            "book_id": str(book.id)
        }
        
        # Process and embed with LangChain/Qdrant
        # Note: This is a sync wrapper for async function
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        total_chunks = loop.run_until_complete(
            rag_pipeline.process_and_embed_book(
                book_id=str(book.id),
                text=text,
                metadata=metadata
            )
        )
        
        # Update book record
        book.is_processed = True
        book.processing_status = "completed"
        book.total_words = word_count
        book.total_pages = estimated_pages
        book.total_chunks = total_chunks
        book.processed_at = datetime.utcnow()
        book.qdrant_collection_id = f"book_{book.id}"
        book.embedding_model = "all-MiniLM-L6-v2"  # Local sentence-transformers model
        
        db.commit()
        
        logger.info(
            "book_processing_completed",
            book_id=book_id,
            chunks=total_chunks,
            words=word_count
        )
        
        return {
            "success": True,
            "book_id": book_id,
            "total_chunks": total_chunks
        }
        
    except Exception as e:
        logger.error("book_processing_failed", book_id=book_id, error=str(e))
        
        # Update book with error
        if book:
            book.processing_status = "failed"
            book.processing_error = str(e)
            db.commit()
        
        # Retry
        raise self.retry(exc=e, countdown=60)
        
    finally:
        db.close()


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF file"""
    text = ""
    
    try:
        with open(file_path, "rb") as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                page_text = page.extract_text()
                
                if page_text:
                    text += f"\n\n--- Page {page_num + 1} ---\n\n"
                    text += page_text
        
        return text.strip()
        
    except Exception as e:
        logger.error("pdf_extraction_failed", error=str(e))
        raise


def extract_text_from_epub(file_path: str) -> str:
    """Extract text from EPUB file"""
    text = ""
    
    try:
        book = epub.read_epub(file_path)
        
        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_DOCUMENT:
                content = item.get_content()
                soup = BeautifulSoup(content, "html.parser")
                chapter_text = soup.get_text()
                
                if chapter_text:
                    text += "\n\n" + chapter_text
        
        return text.strip()
        
    except Exception as e:
        logger.error("epub_extraction_failed", error=str(e))
        raise


def extract_epub_metadata(file_path: str) -> dict:
    """Extract metadata from EPUB file"""
    try:
        book = epub.read_epub(file_path)
        metadata = {}
        
        # Try to get author
        author = book.get_metadata('DC', 'creator')
        if author and len(author) > 0:
            metadata['author'] = author[0][0]
        
        # Try to get title
        title = book.get_metadata('DC', 'title')
        if title and len(title) > 0:
            metadata['title'] = title[0][0]
        
        return metadata
    except Exception as e:
        logger.error("epub_metadata_extraction_failed", error=str(e))
        return {}


def extract_pdf_metadata(file_path: str) -> dict:
    """Extract metadata from PDF file"""
    try:
        with open(file_path, "rb") as file:
            pdf_reader = PyPDF2.PdfReader(file)
            metadata = {}
            
            if pdf_reader.metadata:
                # Try to get author
                if pdf_reader.metadata.get('/Author'):
                    metadata['author'] = pdf_reader.metadata.get('/Author')
                
                # Try to get title
                if pdf_reader.metadata.get('/Title'):
                    metadata['title'] = pdf_reader.metadata.get('/Title')
            
            return metadata
    except Exception as e:
        logger.error("pdf_metadata_extraction_failed", error=str(e))
        return {}
    except Exception as e:
        logger.error("epub_extraction_failed", error=str(e))
        raise
