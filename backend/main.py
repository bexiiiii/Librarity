"""
LIBRARITY - AI Book Intelligence System
Main FastAPI Application Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import time
import structlog
import os

from core.config import settings
from core.database import engine, Base
from api import auth, books, chat, subscription, admin, analytics, revenue, billing, polar_api, fix_subscription
from api import admin_extended
from core.logging_config import setup_logging

# Import Celery app to ensure it's initialized
from workers.celery_app import celery_app

# Setup structured logging
setup_logging()
logger = structlog.get_logger()

# Log Celery configuration
logger.info("celery_config", 
            broker=celery_app.conf.broker_url, 
            backend=celery_app.conf.result_backend)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown events"""
    # Startup
    logger.info("🚀 Starting Librarity AI System...")
    
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("✅ Database tables created")
    logger.info(f"🌐 Server running on {settings.HOST}:{settings.PORT}")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down Librarity...")
    await engine.dispose()


app = FastAPI(
    title="Librarity - AI Book Intelligence",
    description="Transform books into intelligent conversational partners",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests with timing"""
    start_time = time.time()
    
    logger.info(
        "incoming_request",
        method=request.method,
        path=request.url.path,
        client=request.client.host if request.client else None
    )
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.info(
        "request_completed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration=f"{process_time:.3f}s"
    )
    
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
    logger.error(
        "unhandled_exception",
        path=request.url.path,
        error=str(exc),
        exc_info=True
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "message": str(exc) if settings.DEBUG else "An unexpected error occurred"
        }
    )


# Health check endpoint
@app.get("/health", tags=["System"])
async def health_check():
    """System health check"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "Librarity AI"
    }

@app.get("/api/health", tags=["System"])
async def api_health_check():
    """API health check"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "Librarity AI"
    }


# API Routes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(books.router, prefix="/api/books", tags=["Books"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(subscription.router, prefix="/api/subscription", tags=["Subscription"])
app.include_router(billing.router, prefix="/api", tags=["Billing"])
app.include_router(polar_api.router, prefix="/api", tags=["Polar"])
app.include_router(fix_subscription.router, prefix="/api", tags=["Fix"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(admin_extended.router, prefix="/api/admin", tags=["Admin Extended"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])
app.include_router(revenue.router, prefix="/api", tags=["Revenue & Payments"])

# Mount uploads directory for serving files.
# Use a single project-level uploads directory so both FastAPI and Celery
# refer to the same absolute path regardless of working directory.
uploads_dir = os.path.join(settings.BASE_DIR, "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Librarity - AI Book Intelligence System",
        "version": "1.0.0",
        "docs": "/api/docs"
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
