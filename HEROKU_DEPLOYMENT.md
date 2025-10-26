# 🚀 Деплой Librarity на Heroku

## Предварительные требования

1. **Установите Heroku CLI:**
   ```bash
   brew tap heroku/brew && brew install heroku
   ```

2. **Войдите в Heroku:**
   ```bash
   heroku login
   ```

## 📦 Вариант 1: Деплой Backend (Рекомендуется для старта)

### Шаг 1: Создайте приложение Heroku

```bash
cd backend

# Создайте основное приложение (web dyno)
heroku create librarity-backend

# Создайте приложение для Celery worker (опционально)
heroku create librarity-worker
```

### Шаг 2: Добавьте необходимые аддоны

```bash
# PostgreSQL database (Essential Plan - $5/месяц или Mini - $0)
heroku addons:create heroku-postgresql:essential-0 -a librarity-backend

# Redis (Premium-0 - $15/месяц или Mini - $3/месяц)
heroku addons:create heroku-redis:mini -a librarity-backend

# Опционально: Heroku Scheduler для периодических задач
heroku addons:create scheduler:standard -a librarity-backend
```

### Шаг 3: Настройте переменные окружения

```bash
# Основные настройки
heroku config:set ENVIRONMENT=production -a librarity-backend
heroku config:set DEBUG=False -a librarity-backend
heroku config:set LOG_LEVEL=INFO -a librarity-backend

# Database (автоматически устанавливается аддоном)
# DATABASE_URL уже установлен через heroku-postgresql

# Redis (автоматически устанавливается аддоном)
# REDIS_URL уже установлен через heroku-redis

# Celery (использует тот же Redis)
heroku config:set CELERY_BROKER_URL=$(heroku config:get REDIS_URL -a librarity-backend) -a librarity-backend
heroku config:set CELERY_RESULT_BACKEND=$(heroku config:get REDIS_URL -a librarity-backend) -a librarity-backend

# Google Gemini API
heroku config:set GOOGLE_API_KEY=AIzaSyDdYFNbM6qrgMJEAJTp_XUAPS589WkR2pQ -a librarity-backend
heroku config:set GEMINI_MODEL=gemini-2.0-flash-exp -a librarity-backend

# Qdrant (вам нужно развернуть Qdrant отдельно)
heroku config:set QDRANT_URL=https://your-qdrant-instance.com -a librarity-backend
heroku config:set QDRANT_API_KEY=your-qdrant-api-key -a librarity-backend

# Security
heroku config:set SECRET_KEY=$(openssl rand -hex 32) -a librarity-backend
heroku config:set JWT_SECRET_KEY=$(openssl rand -hex 32) -a librarity-backend
heroku config:set ENCRYPTION_KEY=$(openssl rand -hex 32) -a librarity-backend

# CORS (замените на ваш фронтенд домен)
heroku config:set CORS_ORIGINS=https://your-frontend.vercel.app,https://librarity.com -a librarity-backend
heroku config:set FRONTEND_URL=https://your-frontend.vercel.app -a librarity-backend

# File Storage - используйте S3 или аналог
heroku config:set USE_S3=True -a librarity-backend
heroku config:set S3_ENDPOINT=https://s3.amazonaws.com -a librarity-backend
heroku config:set S3_ACCESS_KEY=your-aws-access-key -a librarity-backend
heroku config:set S3_SECRET_KEY=your-aws-secret-key -a librarity-backend
heroku config:set S3_BUCKET_NAME=librarity-books -a librarity-backend

# Book Processing
heroku config:set CHUNK_SIZE=1000 -a librarity-backend
heroku config:set CHUNK_OVERLAP=200 -a librarity-backend
heroku config:set MAX_UPLOAD_SIZE_MB=50 -a librarity-backend

# Telegram (опционально)
heroku config:set TELEGRAM_BOT_TOKEN=8431190194:AAG8yf8V1wXKVYwfqMVkBjZRacB10php9Zo -a librarity-backend
heroku config:set TELEGRAM_ADMIN_CHAT_ID=6322824405 -a librarity-backend
```

### Шаг 4: Деплой приложения

```bash
# Добавьте Heroku remote
heroku git:remote -a librarity-backend

# Задеплойте backend
git subtree push --prefix backend heroku main

# ИЛИ если у вас отдельный репозиторий backend:
# git push heroku main
```

### Шаг 5: Запустите миграции базы данных

```bash
heroku run python -m alembic upgrade head -a librarity-backend
```

### Шаг 6: Масштабируйте dynos

```bash
# Web dyno (обязательно)
heroku ps:scale web=1 -a librarity-backend

# Worker dyno для Celery (рекомендуется)
heroku ps:scale worker=1 -a librarity-backend
```

### Шаг 7: Проверьте логи

```bash
heroku logs --tail -a librarity-backend
```

## 🔧 Настройка Qdrant Vector Database

Heroku не поддерживает Qdrant напрямую. Варианты:

### Вариант A: Qdrant Cloud (Рекомендуется)

1. Зарегистрируйтесь на https://cloud.qdrant.io
2. Создайте кластер (Free tier доступен)
3. Получите URL и API ключ
4. Установите переменные:
   ```bash
   heroku config:set QDRANT_URL=https://your-cluster.qdrant.io -a librarity-backend
   heroku config:set QDRANT_API_KEY=your-api-key -a librarity-backend
   ```

### Вариант B: DigitalOcean App Platform

1. Создайте Droplet на DigitalOcean
2. Установите Qdrant через Docker
3. Используйте публичный IP или настройте домен

### Вариант C: Railway.app

1. Зарегистрируйтесь на https://railway.app
2. Разверните Qdrant из шаблона
3. Получите URL и используйте в Heroku

## 🌐 Вариант 2: Деплой Frontend (Next.js) на Vercel

### Шаг 1: Подготовьте frontend

```bash
cd librarity

# Создайте .env.production
cat > .env.production << EOL
NEXT_PUBLIC_API_URL=https://librarity-backend.herokuapp.com/api
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
EOL
```

### Шаг 2: Деплой на Vercel

```bash
# Установите Vercel CLI
npm i -g vercel

# Войдите
vercel login

# Задеплойте
vercel --prod
```

## 📊 Структура Dynos и стоимость

### Минимальная конфигурация (Hobby - ~$14/месяц):
- **Web dyno**: Eco ($5/месяц) - для FastAPI
- **Worker dyno**: Eco ($5/месяц) - для Celery
- **PostgreSQL**: Mini ($0) или Essential ($5/месяц)
- **Redis**: Mini ($3/месяц)

### Продакшн конфигурация (от $50/месяц):
- **Web dyno**: Basic или Standard
- **Worker dyno**: Basic
- **PostgreSQL**: Standard-0 ($50/месяц)
- **Redis**: Premium-0 ($15/месяц)

## 🔄 CI/CD с GitHub Actions

Создайте файл `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Heroku

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "librarity-backend"
          heroku_email: "your-email@example.com"
          appdir: "backend"
```

## 📝 Важные заметки

### 1. Размер Slug Limit (500MB)
Heroku имеет лимит на размер приложения. Если `sentence-transformers` слишком большой:

```bash
# Опция 1: Используйте более легкую модель
# В langchain_service.py замените на:
# SentenceTransformer('paraphrase-MiniLM-L3-v2')  # меньше весит

# Опция 2: Используйте внешний API для эмбеддингов
# Переключитесь на OpenAI Embeddings или Google Embeddings
```

### 2. Ephemeral Filesystem
Heroku использует ephemeral filesystem - файлы удаляются при рестарте. Обязательно используйте S3 для хранения загруженных файлов.

### 3. Request Timeout
Heroku имеет 30-секундный таймаут для HTTP запросов. Для долгих задач используйте:
- Celery для фоновой обработки
- WebSockets для real-time обновлений
- Polling для проверки статуса задач

### 4. Memory Limits
- **Eco dyno**: 512MB RAM
- **Basic dyno**: 512MB RAM
- **Standard-1X**: 512MB RAM
- **Standard-2X**: 1GB RAM

Если `sentence-transformers` требует больше памяти, апгрейдьте до Standard-2X или используйте API эмбеддингов.

## 🧪 Тестирование после деплоя

```bash
# Проверьте здоровье API
curl https://librarity-backend.herokuapp.com/api/health

# Проверьте документацию
open https://librarity-backend.herokuapp.com/api/docs

# Проверьте логи
heroku logs --tail -a librarity-backend

# Проверьте статус dynos
heroku ps -a librarity-backend

# Проверьте переменные окружения
heroku config -a librarity-backend
```

## 🐛 Устранение неполадок

### Ошибка: "Application Error"
```bash
heroku logs --tail -a librarity-backend
# Проверьте логи на ошибки
```

### Ошибка: "Database connection failed"
```bash
# Проверьте DATABASE_URL
heroku config:get DATABASE_URL -a librarity-backend

# Запустите миграции
heroku run python -m alembic upgrade head -a librarity-backend
```

### Ошибка: "Redis connection failed"
```bash
# Проверьте Redis addon
heroku addons:info heroku-redis -a librarity-backend

# Проверьте REDIS_URL
heroku config:get REDIS_URL -a librarity-backend
```

### Ошибка: "Slug size too large"
```bash
# Очистите кэш
heroku repo:purge_cache -a librarity-backend

# Используйте .slugignore для исключения файлов
echo "*.pyc" >> .slugignore
echo "__pycache__/" >> .slugignore
echo ".pytest_cache/" >> .slugignore
```

## 🚀 Альтернативы Heroku

Если Heroku не подходит:

1. **Railway.app** - похож на Heroku, проще для Python
2. **Render.com** - бесплатный tier, хороший для старта
3. **DigitalOcean App Platform** - предсказуемые цены
4. **AWS Elastic Beanstalk** - больше контроля
5. **Google Cloud Run** - serverless, pay-per-use
6. **Fly.io** - отличный для Docker

## 📞 Поддержка

Если возникнут проблемы с деплоем:
1. Проверьте логи: `heroku logs --tail`
2. Проверьте статус dynos: `heroku ps`
3. Проверьте переменные: `heroku config`
4. Документация Heroku: https://devcenter.heroku.com/

---

**Готово!** Ваш backend должен быть доступен по адресу: `https://librarity-backend.herokuapp.com`
