# 🚀 Production Deployment Guide - Librarity

## ⚠️ Важные изменения для Production на VPS

### Что нужно исправить в .env на сервере:

❌ **НЕ ПРАВИЛЬНО:**
```env
ENVIRONMENT=development
DEBUG=True
DB_ECHO=True
POLAR_SUCCESS_URL=http://localhost:3000/...
FRONTEND_URL=http://localhost:3005,https://librarity.1edu.kz
S3_ENDPOINT=http://164.90.180.120:9000
```

✅ **ПРАВИЛЬНО:**
```env
ENVIRONMENT=production
DEBUG=False
DB_ECHO=False
POLAR_SUCCESS_URL=https://librarity.1edu.kz/subscription/success?checkout_id={CHECKOUT_ID}
FRONTEND_URL=https://librarity.1edu.kz
CORS_ORIGINS=https://librarity.1edu.kz

# MinIO (внешний S3)
MINIO_ENDPOINT=api.euroline.storage.1edu.kz
MINIO_ACCESS_KEY=ваш-ключ-доступа
MINIO_SECRET_KEY=ваш-секретный-ключ
MINIO_BUCKET_NAME=librarityl
MINIO_SECURE=True
```

---

## 📋 Пошаговая установка на VPS DigitalOcean

### 1. Подключение к серверу

```bash
ssh root@164.90.180.120
```

### 2. Установка зависимостей

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Python 3.11+
sudo apt install python3.11 python3.11-venv python3-pip python3.11-dev build-essential -y

# Установка Nginx
sudo apt install nginx -y

# Установка дополнительных инструментов
sudo apt install git curl certbot python3-certbot-nginx -y
```

### 3. Клонирование проекта

```bash
# Создание директории
mkdir -p /var/www/librarity
cd /var/www/librarity

# Клонирование репозитория
git clone https://github.com/bexiiiii/Librarity.git .
```

### 4. Настройка Backend

```bash
cd /var/www/librarity/backend

# Создание виртуального окружения
python3.11 -m venv venv
source venv/bin/activate

# Установка зависимостей
pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Создание правильного .env файла

```bash
nano /var/www/librarity/backend/.env
```

**Вставьте (с исправлениями для production):**

```env
# APPLICATION SETTINGS
APP_NAME=Librarity
ENVIRONMENT=production
DEBUG=False
HOST=0.0.0.0
PORT=8000
API_V1_PREFIX=/api

# DATABASE
DATABASE_URL=postgresql+asyncpg://behruz:234Bex456@164.90.180.120:5432/librarity
DB_ECHO=False

# SECURITY
SECRET_KEY=d8bf5280a171e03905ce26de60621ea48fe52337d75b6747e5a52af00bd4bdd0
JWT_SECRET_KEY=d8bf5280a171e03905ce26de60621ea48fe52337d75b6747e5a52af00bd4bdd0
ENCRYPTION_KEY=d8bf5280a171e03905ce26de60621ea48fe52337d75b6747e5a52af00bd4bdd0
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# REDIS
REDIS_URL=redis://:super_secret_pass@164.90.180.120:6379/0
REDIS_HOST=164.90.180.120
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=super_secret_pass

# CELERY
CELERY_BROKER_URL=redis://:super_secret_pass@164.90.180.120:6379/1
CELERY_RESULT_BACKEND=redis://:super_secret_pass@164.90.180.120:6379/2

# QDRANT
QDRANT_URL=http://164.90.180.120:6333
QDRANT_API_KEY=
QDRANT_COLLECTION_NAME=librarity_books

# AI MODELS
GOOGLE_API_KEY=AIzaSyCuve5903CgmeMhEN5DFbSvlfwdfL9Os_Q
GEMINI_MODEL=gemini-2.0-flash-exp
GEMINI_EMBEDDING_MODEL=models/embedding-001

# POLAR.SH
POLAR_API_KEY=polar_oat_9OkMeWJ799ZgFycIhYJItqO68dy2cZtTslrxZ4JYxTP
POLAR_ORGANIZATION_ID=479a868b-9caa-4ee6-86a3-6c3a92696d1f
POLAR_WEBHOOK_SECRET=
POLAR_SANDBOX_MODE=true
POLAR_SERVER=sandbox
POLAR_SUCCESS_URL=https://librarity.1edu.kz/subscription/success?checkout_id={CHECKOUT_ID}

# TELEGRAM
TELEGRAM_BOT_TOKEN=8431190194:AAG8yf8V1wXKVYwfqMVkBjZRacB10php9Zo
TELEGRAM_ADMIN_CHAT_ID=6322824405

# MINIO (ВАЖНО!)
USE_S3=True
MINIO_ENDPOINT=api.euroline.storage.1edu.kz
MINIO_ACCESS_KEY=ваш-minio-access-key
MINIO_SECRET_KEY=ваш-minio-secret-key
MINIO_BUCKET_NAME=librarityl
MINIO_SECURE=True

# CORS (ВАЖНО!)
CORS_ORIGINS=https://librarity.1edu.kz
FRONTEND_URL=https://librarity.1edu.kz

# RATE LIMITING
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000

# TOKEN LIMITS
FREE_TIER_TOKEN_LIMIT=10000
PRO_TIER_TOKEN_LIMIT=100000
ULTIMATE_TIER_TOKEN_LIMIT=300000

# BOOK PROCESSING
MAX_UPLOAD_SIZE_MB=50
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# LOGGING
LOG_LEVEL=INFO
LOG_FORMAT=json
```

**Сохраните:** Ctrl+O, Enter, Ctrl+X

### 7. Настройка Nginx (Reverse Proxy)

```bash
sudo nano /etc/nginx/sites-available/librarity-api
```

**Вставьте конфигурацию:**

```nginx
server {
    listen 80;
    server_name api.librarity.1edu.kz;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Таймауты для длительных запросов (обработка книг)
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
}
```

**Активируйте конфигурацию:**

```bash
sudo ln -s /etc/nginx/sites-available/librarity-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Установка SSL сертификата

```bash
sudo certbot --nginx -d api.librarity.1edu.kz

# Автообновление сертификатов
sudo systemctl enable certbot.timer
```

### 9. Настройка FastAPI как systemd service

```bash
# Создайте директории для логов
sudo mkdir -p /var/log/fastapi
sudo chown -R www-data:www-data /var/log/fastapi

# Скопируйте service файл
sudo cp /var/www/librarity/backend/fastapi.service /etc/systemd/system/

# Запустите сервис
sudo systemctl daemon-reload
sudo systemctl enable fastapi
sudo systemctl start fastapi
sudo systemctl status fastapi
```

### 10. Настройка Celery как systemd service

```bash
# Создайте директории
sudo mkdir -p /var/log/celery /var/run/celery
sudo chown -R www-data:www-data /var/log/celery /var/run/celery

# Скопируйте service файл
sudo cp /var/www/librarity/backend/celery.service /etc/systemd/system/

# Запустите Celery
sudo systemctl daemon-reload
sudo systemctl enable celery
sudo systemctl start celery
sudo systemctl status celery
```

### 11. Настройка firewall

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
sudo ufw status
```

### 12. Проверка работы

```bash
# Проверьте FastAPI
curl http://localhost:8000/api/health
curl https://api.librarity.1edu.kz/api/health

# Проверьте CORS
curl -I -X OPTIONS https://api.librarity.1edu.kz/api/auth/login \
  -H "Origin: https://librarity.1edu.kz" \
  -H "Access-Control-Request-Method: POST"

# Проверьте логи
sudo journalctl -u fastapi -f
sudo journalctl -u celery -f
```

---

## 🔄 Управление сервисами

### FastAPI

```bash
sudo systemctl start fastapi      # Запуск
sudo systemctl stop fastapi       # Остановка
sudo systemctl restart fastapi    # Перезапуск
sudo systemctl status fastapi     # Статус
sudo journalctl -u fastapi -f     # Логи
```

### Celery

```bash
sudo systemctl start celery       # Запуск
sudo systemctl stop celery        # Остановка
sudo systemctl restart celery     # Перезапуск
sudo systemctl status celery      # Статус
sudo journalctl -u celery -f      # Логи
```

### Nginx

```bash
sudo systemctl restart nginx      # Перезапуск
sudo systemctl status nginx       # Статус
sudo nginx -t                     # Проверка конфигурации
```

---

## 📝 Обновление кода

```bash
cd /var/www/librarity
git pull origin main

# Перезапустите сервисы
sudo systemctl restart fastapi
sudo systemctl restart celery
```

---

## ⚠️ Важные проверки

1. **MinIO ключи**: Замените `ваш-minio-access-key` и `ваш-minio-secret-key` на реальные
2. **DNS**: Убедитесь, что `api.librarity.1edu.kz` указывает на `164.90.180.120`
3. **PostgreSQL**: Должен быть доступен на порту 5432
4. **Redis**: Должен быть доступен на порту 6379
5. **Qdrant**: Должен быть доступен на порту 6333

---

## Pre-deployment Checklist

### ✅ Code Optimization
- [x] Removed all test files (test_*.py, debug_*.py)
- [x] Removed old/unused components (UsersTab-old.tsx, polar_service_old.py)
- [x] Cleaned up console.log statements (handled by Next.js compiler)
- [x] Added .dockerignore files for optimized builds
- [x] Configured Next.js for production optimization
- [x] Added CORS configuration for production domain
- [x] Added MinIO integration for external S3 storage

### 🔧 Configuration Files Created
- `.env.production` - Production environment variables template
- `next.config.ts` - Optimized with compression, minification, and console removal
- `.dockerignore` - For both backend and frontend
- `fastapi.service` - Systemd service for FastAPI
- `celery.service` - Systemd service for Celery workers

## Production Optimizations Applied

### Frontend (Next.js)
```typescript
✅ React Strict Mode enabled
✅ Compression enabled
✅ Image optimization (AVIF/WebP)
✅ SWC minification
✅ Console.log removal in production
✅ CSS optimization
✅ Package imports optimization (framer-motion, lucide-react)
✅ Standalone output mode
✅ Suspense boundaries for useSearchParams
```

### Backend (FastAPI)
```python
✅ Debug files removed
✅ Test files removed
✅ Structured logging configured
✅ Proper error handling
✅ Production-ready logging
✅ CORS configured for production domain
✅ MinIO integration for file storage
✅ PDF content validation
```

## Deployment Steps

### 1. Environment Setup

Copy and configure production environment:
```bash
cd backend
cp .env.production .env
# Edit .env with your production values
```

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - Application secret (min 32 chars)
- `JWT_SECRET_KEY` - JWT signing key
- `OPENAI_API_KEY` - OpenAI API key
- `POLAR_API_KEY` - Polar.sh payment integration
- `REDIS_URL` - Redis for caching and Celery
- `RESEND_API_KEY` - Email service
- `AWS_*` - S3 credentials for file storage

### 2. Database Migration

```bash
cd backend
python scripts/apply_migration.py
```

### 3. Build Docker Images

#### Backend:
```bash
cd backend
docker build -f Dockerfile.prod -t librarity-backend:prod .
```

#### Frontend:
```bash
cd librarity
docker build -t librarity-frontend:prod .
```

### 4. Docker Compose Production

Use `docker-compose.prod.yml`:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Health Checks

After deployment, verify:
```bash
# Backend health
curl https://api.yourdomain.com/api/health

# Frontend
curl https://yourdomain.com
```

## Performance Optimizations

### 1. CDN Setup
- Deploy static assets to CDN
- Configure Next.js `assetPrefix` if needed

### 2. Database
- Enable connection pooling
- Set up read replicas for scaling
- Configure proper indexes

### 3. Redis
- Use Redis for session storage
- Enable Redis clustering for high availability

### 4. Monitoring

**Backend Monitoring:**
- Sentry for error tracking
- Prometheus metrics on port 9090
- Structured logging to centralized service

**Frontend Monitoring:**
- Next.js built-in analytics
- Sentry for client-side errors

### 5. Security

**SSL/TLS:**
```bash
# Use Let's Encrypt or similar
certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

**Security Headers:**
- CSP (Content Security Policy)
- HSTS
- X-Frame-Options
- X-Content-Type-Options

### 6. Backup Strategy

**Database:**
```bash
# Daily automated backups
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

**Uploads:**
- Store in S3 with versioning enabled
- Enable S3 lifecycle policies

## Scaling Considerations

### Horizontal Scaling

**Backend:**
- Deploy multiple FastAPI instances behind load balancer
- Use gunicorn with multiple workers
- Scale Celery workers independently

**Frontend:**
- Deploy multiple Next.js instances
- Use nginx or cloud load balancer

### Vertical Scaling

**Recommended Specs:**
- **Small**: 2 CPU, 4GB RAM (up to 100 concurrent users)
- **Medium**: 4 CPU, 8GB RAM (up to 500 concurrent users)
- **Large**: 8 CPU, 16GB RAM (1000+ concurrent users)

## CI/CD Pipeline

### GitHub Actions Example:

```yaml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and Deploy
        run: |
          docker-compose -f docker-compose.prod.yml build
          docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Common Issues

1. **High memory usage**
   - Check for memory leaks in chat history
   - Implement pagination for large datasets
   - Configure proper connection pool sizes

2. **Slow API responses**
   - Enable Redis caching
   - Optimize database queries
   - Use CDN for static assets

3. **File upload issues**
   - Ensure S3 credentials are correct
   - Check file size limits in nginx/load balancer
   - Verify disk space on server

## Monitoring Commands

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Check resource usage
docker stats

# Database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Redis info
redis-cli info stats
```

## Rollback Procedure

```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Deploy previous version
git checkout previous-tag
docker-compose -f docker-compose.prod.yml up -d

# Restore database if needed
psql $DATABASE_URL < backup_previous.sql
```

## Support

For production issues:
1. Check application logs
2. Review Sentry errors
3. Monitor server metrics
4. Contact DevOps team

---

**Last Updated:** $(date +%Y-%m-%d)
**Production Readiness:** ✅ READY
