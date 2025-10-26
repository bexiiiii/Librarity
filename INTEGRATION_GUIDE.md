# 🔗 Integration Guide - Connecting New Features

This guide shows how to integrate all the new improvements into the existing Librarity application.

## 📋 Table of Contents

1. [Backend Integration](#backend-integration)
2. [Database Updates](#database-updates)
3. [API Router Updates](#api-router-updates)
4. [Frontend Updates](#frontend-updates)
5. [Environment Setup](#environment-setup)
6. [Testing](#testing)

---

## Backend Integration

### 1. Update main.py

Add new imports and middleware:

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.sentry import init_sentry
from core.docs import custom_openapi
from core.security import SecurityHeadersMiddleware
from api import health, admin_extended

# Initialize Sentry
init_sentry()

app = FastAPI(title="Librarity API", version="1.0.0")

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Include new routers
app.include_router(health.router)
app.include_router(admin_extended.router)

# Custom OpenAPI schema
app.openapi = lambda: custom_openapi(app)
```

### 2. Update database models

Add relationships to existing models:

```python
# models/user.py - Add these fields
from sqlalchemy.orm import relationship

class User(Base):
    # ... existing fields ...
    
    # New fields
    avatar_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    
    # New relationships
    usage_logs = relationship("UsageLog", back_populates="user", cascade="all, delete-orphan")
    leaderboard = relationship("Leaderboard", back_populates="user", uselist=False, cascade="all, delete-orphan")
    oauth_accounts = relationship("OAuthAccount", back_populates="user", cascade="all, delete-orphan")
    shared_content = relationship("SharedContent", back_populates="user", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_user_created_at', 'created_at'),
        Index('idx_user_is_active', 'is_active'),
    )
```

```python
# models/book.py - Add these
from sqlalchemy.orm import relationship
from models.book_summary import BookSummary
from models.book_vector_status import BookVectorStatus

class Book(Base):
    # ... existing fields ...
    
    # New relationships
    summary = relationship("BookSummary", back_populates="book", uselist=False, cascade="all, delete-orphan")
    vector_status = relationship("BookVectorStatus", back_populates="book", uselist=False, cascade="all, delete-orphan")
    usage_logs = relationship("UsageLog", back_populates="book", cascade="all, delete-orphan")
    
    # Property for chat readiness
    @property
    def is_ready_for_chat(self) -> bool:
        if self.vector_status:
            return self.vector_status.is_ready
        return False
    
    # Indexes
    __table_args__ = (
        Index('idx_book_user_created', 'user_id', 'created_at'),
        Index('idx_book_status', 'processing_status'),
    )
```

### 3. Create database migration

```bash
cd backend
alembic revision --autogenerate -m "Add new models and relationships"
alembic upgrade head
```

---

## Database Updates

### Import all new models in models/__init__.py

```python
# models/__init__.py
from models.user import User
from models.book import Book
from models.subscription import Subscription
from models.usage_log import UsageLog
from models.book_summary import BookSummary
from models.book_vector_status import BookVectorStatus
from models.leaderboard import Leaderboard
from models.oauth_account import OAuthAccount
from models.shared_content import SharedContent

__all__ = [
    "User",
    "Book",
    "Subscription",
    "UsageLog",
    "BookSummary",
    "BookVectorStatus",
    "Leaderboard",
    "OAuthAccount",
    "SharedContent"
]
```

---

## API Router Updates

### Update api/__init__.py

```python
# api/__init__.py
from fastapi import APIRouter
from api import auth, books, chat, subscriptions, admin, health, admin_extended

api_router = APIRouter(prefix="/api")

# Existing routers
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(books.router, prefix="/books", tags=["books"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])

# New routers
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(admin_extended.router, prefix="/admin", tags=["admin"])
```

### Update chat endpoint to use new features

```python
# api/chat.py
from services.ai_improvements import MemoryManager, AdaptiveModelRouter, MultiBookSearch
from services.analytics_service import analytics_service
from services.billing_service import billing_service

memory_manager = MemoryManager()
model_router = AdaptiveModelRouter()

@router.post("/")
async def chat_with_book(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Check token limit (with soft/hard caps)
    can_use, message = await billing_service.check_token_limit(
        db=db,
        user_id=current_user.id,
        tokens_to_use=1000  # Estimated
    )
    
    if not can_use:
        raise HTTPException(status_code=429, detail=message)
    
    # Get conversation memory
    memory = await memory_manager.get_memory(request.session_id)
    
    # Get adaptive AI model (with fallback)
    chat_model = await model_router.get_chat_model()
    
    # ... existing chat logic ...
    
    # Log usage
    await analytics_service.log_event(
        db=db,
        user_id=current_user.id,
        event_type="chat_message",
        metadata={
            "book_id": request.book_id,
            "mode": request.mode,
            "tokens": tokens_used
        }
    )
    
    # Consume tokens
    await billing_service.consume_tokens(db, current_user.id, tokens_used)
    
    return response
```

### Update book upload to use new features

```python
# api/books.py
from services.ai_improvements import SmartSummarizer
from models.book_vector_status import BookVectorStatus, VectorStatus
from tasks.content_tasks import auto_summarize_book

@router.post("/upload")
async def upload_book(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # ... existing upload logic ...
    
    # Create vector status tracker
    vector_status = BookVectorStatus(
        book_id=book.id,
        status=VectorStatus.PENDING
    )
    db.add(vector_status)
    await db.commit()
    
    # Queue auto-summarization (async)
    auto_summarize_book.delay(book.id)
    
    return {"book_id": book.id, "status": "processing"}
```

---

## Frontend Updates

### 1. Update admin panel to use extended API

```tsx
// admin/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ExtendedAdminAPI } from '@/lib/admin-api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchStats = async () => {
      const api = new ExtendedAdminAPI();
      const data = await api.getOverviewStats();
      setStats(data);
      setLoading(false);
    };
    
    fetchStats();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Users" value={stats.total_users} />
        <StatsCard title="Total Books" value={stats.total_books} />
        <StatsCard title="Active Today" value={stats.active_users_today} />
        <StatsCard title="Total Revenue" value={`$${stats.total_revenue}`} />
      </div>
      
      {/* Add more components */}
    </div>
  );
}
```

### 2. Add token usage dashboard

```tsx
// librarity/components/token-usage-dashboard.tsx
'use client';

import { useEffect, useState } from 'react';

export function TokenUsageDashboard() {
  const [usage, setUsage] = useState(null);
  
  useEffect(() => {
    fetch('/api/billing/usage', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.json())
      .then(setUsage);
  }, []);
  
  if (!usage) return null;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Token Usage</h3>
      
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <span>Used: {usage.tokens_used.toLocaleString()}</span>
          <span>Remaining: {usage.tokens_remaining.toLocaleString()}</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className={`h-4 rounded-full ${
              usage.usage_percentage > 80 ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ width: `${usage.usage_percentage}%` }}
          />
        </div>
      </div>
      
      <p className="text-sm text-gray-600">
        {usage.usage_percentage > 80 && (
          <span className="text-red-600 font-semibold">
            ⚠️ You're running low on tokens. Consider upgrading your plan.
          </span>
        )}
      </p>
    </div>
  );
}
```

---

## Environment Setup

### 1. Install new dependencies

```bash
cd backend
pip install -r requirements.txt

# Install pre-commit hooks
pip install pre-commit
pre-commit install
```

### 2. Update .env file

```bash
cp backend/.env.example backend/.env
# Add all new environment variables
```

### 3. Generate encryption key

```python
from cryptography.fernet import Fernet
key = Fernet.generate_key()
print(key.decode())  # Add to .env as ENCRYPTION_KEY
```

---

## Testing

### 1. Test security features

```python
# tests/test_security.py
import pytest
from core.security import rate_limit, DataEncryption, FileValidator

def test_rate_limiting():
    # Test rate limit decorator
    pass

def test_encryption():
    encryptor = DataEncryption()
    original = "sensitive data"
    encrypted = encryptor.encrypt(original)
    decrypted = encryptor.decrypt(encrypted)
    assert original == decrypted

def test_file_validation():
    validator = FileValidator()
    # Test PDF validation
    is_valid = validator.validate_pdf(b"valid pdf content")
    assert is_valid
```

### 2. Test AI improvements

```python
# tests/test_ai_improvements.py
import pytest
from services.ai_improvements import MemoryManager, AdaptiveModelRouter

@pytest.mark.asyncio
async def test_memory_manager():
    manager = MemoryManager()
    memory = await manager.get_memory("test-session")
    assert memory is not None

@pytest.mark.asyncio
async def test_adaptive_model_router():
    router = AdaptiveModelRouter()
    model = await router.get_chat_model()
    assert model is not None
```

### 3. Test Celery tasks

```bash
# Start Celery in test mode
celery -A celery_app worker --loglevel=info

# Run tasks
python -c "from tasks.billing_tasks import reset_monthly_tokens; reset_monthly_tokens.delay()"
```

### 4. Test health checks

```bash
curl http://localhost:8000/health
curl http://localhost:8000/health/detailed
curl http://localhost:8000/health/ready
curl http://localhost:8000/health/live
```

---

## 🚀 Deployment Steps

1. **Database Migration**
```bash
alembic upgrade head
```

2. **Start Services**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

3. **Verify Health**
```bash
curl http://localhost:8000/health/detailed
```

4. **Test Endpoints**
```bash
# Test admin API
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/admin/overview-stats

# Test analytics
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/analytics/user-activity
```

5. **Monitor Logs**
```bash
docker-compose logs -f backend
docker-compose logs -f celery-worker
```

---

## 📚 Additional Resources

- **API Documentation**: http://localhost:8000/docs
- **Celery Monitoring**: http://localhost:5555
- **Admin Panel**: http://localhost:3001

For more details, see [DEPLOYMENT.md](DEPLOYMENT.md)
