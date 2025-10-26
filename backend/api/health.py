# Health check and monitoring endpoints
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from core.database import get_db
from datetime import datetime
import psutil
import os

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/")
async def health_check():
    """Basic health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "librarity-api"
    }

@router.get("/detailed")
async def detailed_health_check(db: AsyncSession = Depends(get_db)):
    """Detailed health check with dependencies"""
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {}
    }
    
    # Check database
    try:
        await db.execute(text("SELECT 1"))
        health_status["checks"]["database"] = "healthy"
    except Exception as e:
        health_status["checks"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"
    
    # Check Redis
    try:
        from core.security import get_redis
        redis_client = await get_redis()
        await redis_client.ping()
        health_status["checks"]["redis"] = "healthy"
    except Exception as e:
        health_status["checks"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check Qdrant
    try:
        from qdrant_client import QdrantClient
        qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        client = QdrantClient(url=qdrant_url)
        collections = client.get_collections()
        health_status["checks"]["qdrant"] = "healthy"
    except Exception as e:
        health_status["checks"]["qdrant"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # System metrics
    health_status["metrics"] = {
        "cpu_percent": psutil.cpu_percent(),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage('/').percent
    }
    
    return health_status

@router.get("/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Kubernetes readiness probe"""
    try:
        await db.execute(text("SELECT 1"))
        return {"ready": True}
    except:
        return {"ready": False}, 503

@router.get("/live")
async def liveness_check():
    """Kubernetes liveness probe"""
    return {"alive": True}
