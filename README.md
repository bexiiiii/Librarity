# 📚 LEXENT AI — AI BOOK INTELLIGENCE SYSTEM

**Transform Books into Intelligent Conversational Partners**

Lexent AI is a production-ready AI platform that allows users to upload books and have intelligent conversations with them. Built with cutting-edge AI technology, it offers multiple interaction modes including Book Brain, Author Mode, Citation Mode, and AI Coaching.

## 🎯 Key Features

### 📖 Book Interaction Modes
- **Book Brain** - Chat with the book's knowledge and insights
- **Author Mode** - Converse as if speaking with the author
- **Citation Mode** - Get answers with precise page and chapter references
- **AI Coach** - Receive personalized life coaching based on book teachings

### 💰 Monetization
- **Subscription Tiers** via Polar.sh
  - **Free**: 10K tokens, 1 book, basic chat
  - **Pro ($9/mo)**: 100K tokens, 5 books, Citation + Coach modes
  - **Ultimate ($19/mo)**: 300K tokens, unlimited books, all features + analytics

### 🔧 Technical Features
- RAG (Retrieval-Augmented Generation) with LangChain
- Vector embeddings with Qdrant
- Google Gemini AI integration
- JWT authentication
- Real-time token tracking
- Background task processing with Celery
- Professional admin dashboard

## 🏗️ Architecture

### Backend Stack
- **FastAPI** - High-performance async API
- **PostgreSQL** - Primary database
- **Redis** - Caching and task queue
- **Qdrant** - Vector database for embeddings
- **Celery** - Background task processing
- **LangChain** - AI orchestration
- **Google Gemini** - LLM and embeddings

### Frontend Stack
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Shadcn/UI** - Component library
- **Framer Motion** - Animations
- **NextAuth** - Authentication

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Google Gemini API Key
- Polar.sh Account (for subscriptions)

### 1. Clone Repository
```bash
cd lexent-ai
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env and add your API keys:
# - GOOGLE_API_KEY
# - POLAR_API_KEY
# - SECRET_KEY
# - JWT_SECRET_KEY
```

### 3. Start Services
```bash
# From project root
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Qdrant (port 6333)
- Backend API (port 8000)
- Celery Worker
- Celery Flower (port 5555)
- Frontend (port 3000)

### 4. Create Admin User
```bash
docker-compose exec backend python -c "
from core.database import SessionLocal
from models.user import User, UserRole
from services.auth_service import auth_service

db = SessionLocal()
admin = User(
    email='admin@lexentai.com',
    username='admin',
    full_name='Admin User',
    hashed_password=auth_service.get_password_hash('admin123'),
    role=UserRole.ADMIN,
    is_active=True
)
db.add(admin)
db.commit()
print('Admin user created!')
"
```

### 5. Access Application
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/api/docs
- **Admin Dashboard**: http://localhost:3000/admin
- **Celery Flower**: http://localhost:5555

## 📁 Project Structure

```
lexent-ai/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── core/
│   │   ├── config.py          # Configuration
│   │   ├── database.py        # Database setup
│   │   └── logging_config.py  # Logging
│   ├── models/                # SQLAlchemy models
│   │   ├── user.py
│   │   ├── book.py
│   │   ├── chat.py
│   │   ├── subscription.py
│   │   └── token_usage.py
│   ├── api/                   # API endpoints
│   │   ├── auth.py
│   │   ├── books.py
│   │   ├── chat.py
│   │   ├── subscription.py
│   │   └── admin.py
│   ├── services/              # Business logic
│   │   ├── auth_service.py
│   │   ├── langchain_service.py
│   │   ├── token_manager.py
│   │   └── polar_service.py
│   ├── workers/               # Celery tasks
│   │   ├── celery_app.py
│   │   └── tasks.py
│   ├── schemas.py             # Pydantic schemas
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── librarity/                 # Next.js frontend
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── admin/            # Admin dashboard
│   │   ├── chat/             # Chat interface
│   │   └── account/          # User account
│   ├── components/
│   ├── lib/
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user

### Books
- `POST /api/books/upload` - Upload book
- `GET /api/books/` - List user's books
- `GET /api/books/{id}` - Get book details
- `DELETE /api/books/{id}` - Delete book

### Chat
- `POST /api/chat/` - Chat with book
- `GET /api/chat/history/{session_id}` - Get chat history
- `GET /api/chat/sessions` - List chat sessions

### Subscription
- `GET /api/subscription/` - Get subscription
- `POST /api/subscription/upgrade` - Upgrade tier
- `GET /api/subscription/tokens` - Get token usage
- `POST /api/subscription/webhook` - Polar.sh webhook

### Admin
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/{id}/ban` - Ban user
- `GET /api/admin/books` - List all books

## 🔐 Environment Variables

### Required
```env
# Security
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret

# Google Gemini
GOOGLE_API_KEY=your-gemini-api-key

# Polar.sh
POLAR_API_KEY=your-polar-key
POLAR_ORGANIZATION_ID=your-org-id
POLAR_WEBHOOK_SECRET=your-webhook-secret
```

### Optional
```env
# Database (auto-configured in Docker)
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://localhost:6379/0
QDRANT_URL=http://localhost:6333

# Token Limits
FREE_TIER_TOKEN_LIMIT=10000
PRO_TIER_TOKEN_LIMIT=100000
ULTIMATE_TIER_TOKEN_LIMIT=300000
```

## 📊 Monitoring

### Celery Flower
Monitor background tasks at http://localhost:5555

### Logs
```bash
# Backend logs
docker-compose logs -f backend

# Celery worker logs
docker-compose logs -f celery_worker

# Database logs
docker-compose logs -f postgres
```

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# With coverage
pytest --cov=. --cov-report=html
```

## 🚢 Production Deployment

### 1. Update Environment
```bash
cp .env.example .env.production
# Set production values:
# - DEBUG=False
# - Strong SECRET_KEY and JWT_SECRET_KEY
# - Production database URL
# - CORS_ORIGINS with your domain
```

### 2. Build for Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Run Migrations
```bash
docker-compose exec backend alembic upgrade head
```

### 4. SSL/TLS
Configure Nginx reverse proxy with Let's Encrypt certificates.

## 📈 Scaling

### Horizontal Scaling
- Multiple backend instances behind load balancer
- Separate Celery workers for different queues
- Read replicas for PostgreSQL

### Performance
- Redis caching for frequently accessed data
- Qdrant vector search optimization
- CDN for static assets

## 🛠️ Development

### Local Development Without Docker
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd librarity
npm install
npm run dev
```

### Database Migrations
```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **LangChain** - AI orchestration framework
- **Google Gemini** - Large language model
- **Qdrant** - Vector database
- **Polar.sh** - Subscription platform
- **FastAPI** - Modern Python web framework
- **Next.js** - React framework

## 📞 Support

- **Email**: support@lexentai.com
- **Website**: https://lexentai.com
- **Issues**: GitHub Issues

---

**Built with ❤️ by the Lexent AI Team**

*Transforming books into intelligent companions, one conversation at a time.*
