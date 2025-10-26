# 📚 Librarity - AI Book Intelligence Platform

Transform your reading experience with AI-powered book interactions. Upload PDFs, EPUBs, or text files and engage with them using advanced AI models.

![License](https://img.shields.io/badge/license-Commercial-blue)
![Python](https://img.shields.io/badge/python-3.11+-green)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal)
![Next.js](https://img.shields.io/badge/Next.js-15-black)

## ✨ Features

### 🤖 AI Chat Modes
- **Tutor Mode**: Get detailed explanations and learn concepts
- **Summarizer Mode**: Quick summaries and key takeaways
- **Questioner Mode**: Generate quiz questions and test knowledge
- **Free Chat**: Natural conversation about book content

### 📖 Book Management
- Support for PDF, EPUB, and TXT files
- Automatic text extraction and processing
- Vector embeddings for semantic search
- Multi-book library with progress tracking

### 🔐 Security & Privacy
- JWT authentication with refresh tokens
- Rate limiting (10 req/s for API, 5 req/m for auth)
- File validation (malicious content detection)
- Data encryption for sensitive fields
- Security headers (CSP, CORS, XSS protection)
- Token blacklist for logout

### 📊 Analytics & Insights
- Detailed usage tracking (tokens, chats, books)
- PostHog integration for behavioral analytics
- User retention metrics (DAU/MAU)
- Popular books and trending content
- Feature usage statistics

### 💳 Flexible Billing
- **Free**: 10,000 tokens, 1 book
- **PRO**: 100,000 tokens, 5 books
- **Ultimate**: 300,000 tokens, unlimited books
- 7-day free trial for new users
- Soft caps (80% warning) and hard caps
- Auto-renewal with monthly token reset

### 🎮 Gamification
- Leaderboards with rankings
- Streak tracking (consecutive active days)
- Achievement system
- Public profiles with stats
- Social sharing (quotes, summaries, cards)

### 🔗 Integrations
- **Email**: Resend API (welcome, upgrade, re-engagement)
- **OAuth**: Google and GitHub login
- **Telegram**: Admin notifications (new users, errors)
- **Analytics**: PostHog for product insights
- **Monitoring**: Sentry for error tracking

### 🚀 Production Ready
- Docker Compose for easy deployment
- Nginx reverse proxy with rate limiting
- CI/CD with GitHub Actions
- Health checks for Kubernetes
- Celery for background tasks
- Redis for caching and rate limiting
- PostgreSQL for data persistence
- Qdrant for vector storage

## 🏗️ Architecture

```
librarity/
├── backend/              # FastAPI backend
│   ├── api/             # API endpoints
│   ├── core/            # Core functionality (auth, security, DB)
│   ├── models/          # SQLAlchemy models
│   ├── services/        # Business logic services
│   └── tasks/           # Celery background tasks
├── librarity/           # Next.js frontend (user-facing)
├── admin/               # Next.js admin panel
├── nginx/               # Nginx configuration
└── .github/workflows/   # CI/CD pipelines
```

### Tech Stack

**Backend:**
- FastAPI 0.115 (async Python web framework)
- SQLAlchemy 2.0 (async ORM)
- PostgreSQL 16 (primary database)
- Redis 7 (caching, rate limiting)
- Qdrant (vector database for embeddings)
- Celery (background tasks)
- Google Gemini (primary AI model)
- OpenAI GPT-4 (fallback AI model)
- Anthropic Claude (fallback AI model)

**Frontend:**
- Next.js 15 (React framework)
- TypeScript
- Tailwind CSS
- shadcn/ui components

**Infrastructure:**
- Docker & Docker Compose
- Nginx (reverse proxy)
- GitHub Actions (CI/CD)
- Sentry (error tracking)
- PostHog (analytics)

## 📦 Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 16
- Redis 7
- Docker & Docker Compose (optional)

### Quick Start with Docker

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/librarity.git
cd librarity
```

2. **Set up environment variables**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys
```

3. **Start all services**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

4. **Run database migrations**
```bash
docker-compose exec backend alembic upgrade head
```

5. **Access the applications**
- Frontend: http://localhost:3000
- Admin Panel: http://localhost:3001
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Flower (Celery): http://localhost:5555

### Manual Installation

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run migrations
alembic upgrade head

# Start the server
uvicorn main:app --reload --port 8000
```

#### Start Celery Worker & Beat

```bash
# Terminal 1: Celery worker
celery -A celery_app worker --loglevel=info

# Terminal 2: Celery beat (scheduler)
celery -A celery_app beat --loglevel=info

# Terminal 3: Flower (monitoring)
celery -A celery_app flower --port=5555
```

#### Frontend Setup

```bash
cd librarity
npm install
npm run dev
```

#### Admin Panel Setup

```bash
cd admin
npm install
npm run dev
```

## 🔑 Environment Variables

### Required

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/librarity

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
ENCRYPTION_KEY=generate-with-fernet

# Redis
REDIS_URL=redis://localhost:6379

# AI Models
GOOGLE_API_KEY=your-gemini-api-key

# Email
RESEND_API_KEY=your-resend-key
FROM_EMAIL=noreply@librarity.com
```

### Optional (for advanced features)

```env
# Additional AI Models (fallback)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Telegram Notifications
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_ADMIN_CHAT_ID=your-chat-id

# Analytics
POSTHOG_API_KEY=your-posthog-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

## 📖 API Documentation

### Authentication

```bash
# Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

# Response
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

### Book Upload

```bash
POST /api/books/upload
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data

File: book.pdf
```

### Chat with Book

```bash
POST /api/chat
Headers: Authorization: Bearer <token>
{
  "book_id": "uuid",
  "message": "Explain the main concept",
  "mode": "tutor",
  "session_id": "uuid"
}
```

Full API documentation: http://localhost:8000/docs

## 🔧 Development

### Pre-commit Hooks

```bash
pip install pre-commit
pre-commit install
```

This will run on every commit:
- Black (code formatting)
- isort (import sorting)
- Flake8 (linting)
- Bandit (security checks)

### Running Tests

```bash
cd backend
pytest --cov=. --cov-report=html
```

### Code Style

```bash
# Format code
black .
isort .

# Lint
flake8 .
ruff check .
```

## 🚀 Deployment

### Production Checklist

- [ ] Update `.env` with production values
- [ ] Set `DEBUG=False`
- [ ] Configure SSL certificates
- [ ] Set up domain DNS records
- [ ] Configure Sentry DSN
- [ ] Set up PostHog project
- [ ] Configure backup strategy
- [ ] Set up monitoring (Grafana, Prometheus)
- [ ] Configure CDN for static files
- [ ] Set up log aggregation

### Deploy to Production

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=4
```

### CI/CD Pipeline

GitHub Actions automatically:
1. Runs tests on every push
2. Checks code quality (linting, formatting)
3. Deploys to production on merge to `main`

## 📊 Monitoring

### Health Checks

- Basic: `GET /health`
- Detailed: `GET /health/detailed`
- Readiness: `GET /health/ready`
- Liveness: `GET /health/live`

### Celery Monitoring

Access Flower at http://localhost:5555 to monitor:
- Active tasks
- Worker status
- Task history
- Performance metrics

### Error Tracking

Sentry captures:
- Unhandled exceptions
- API errors
- Performance issues
- User feedback

### Analytics

PostHog tracks:
- User behavior
- Feature usage
- Conversion funnels
- Retention cohorts

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under a Commercial License. See [LICENSE](LICENSE) for details.

## 📧 Support

- **Email**: support@librarity.com
- **Documentation**: https://docs.librarity.com
- **Issues**: https://github.com/yourusername/librarity/issues

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) for the excellent web framework
- [LangChain](https://www.langchain.com/) for AI orchestration
- [Qdrant](https://qdrant.tech/) for vector search
- [shadcn/ui](https://ui.shadcn.com/) for beautiful components
- Google, OpenAI, and Anthropic for AI models

---

Built with ❤️ by the Librarity team
