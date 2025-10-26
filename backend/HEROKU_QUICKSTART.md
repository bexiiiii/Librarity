# 🚀 Быстрый старт деплоя на Heroku

## Один скрипт для настройки всего

```bash
cd backend
./scripts/heroku-setup.sh
```

Этот скрипт:
- ✅ Создаст приложение на Heroku
- ✅ Добавит PostgreSQL и Redis
- ✅ Настроит все переменные окружения
- ✅ Сгенерирует секретные ключи
- ✅ Подготовит к деплою

## После настройки - деплой

```bash
./scripts/heroku-deploy.sh librarity-backend
```

## Или вручную

### 1. Установите Heroku CLI
```bash
brew tap heroku/brew && brew install heroku
heroku login
```

### 2. Создайте приложение
```bash
cd backend
heroku create librarity-backend
```

### 3. Добавьте аддоны
```bash
heroku addons:create heroku-postgresql:essential-0 -a librarity-backend
heroku addons:create heroku-redis:mini -a librarity-backend
```

### 4. Установите переменные окружения
```bash
# Минимальный набор
heroku config:set GOOGLE_API_KEY=your-key -a librarity-backend
heroku config:set QDRANT_URL=your-qdrant-url -a librarity-backend
heroku config:set SECRET_KEY=$(openssl rand -hex 32) -a librarity-backend
heroku config:set CORS_ORIGINS=https://your-frontend.com -a librarity-backend
```

### 5. Деплой
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### 6. Запустите dynos
```bash
heroku ps:scale web=1 worker=1 -a librarity-backend
```

## Проверка

```bash
# Статус
heroku ps -a librarity-backend

# Логи
heroku logs --tail -a librarity-backend

# Открыть в браузере
heroku open -a librarity-backend
```

## Важно!

### Qdrant Database
Heroku не поддерживает Qdrant. Используйте:
- **Qdrant Cloud**: https://cloud.qdrant.io (есть free tier)
- **Railway.app**: Разверните Qdrant там
- **DigitalOcean**: Создайте Droplet с Qdrant

### File Storage
Heroku использует ephemeral storage. Обязательно настройте S3:
```bash
heroku config:set USE_S3=True -a librarity-backend
heroku config:set S3_ENDPOINT=https://s3.amazonaws.com -a librarity-backend
heroku config:set S3_ACCESS_KEY=your-key -a librarity-backend
heroku config:set S3_SECRET_KEY=your-secret -a librarity-backend
heroku config:set S3_BUCKET_NAME=librarity-books -a librarity-backend
```

### Размер приложения (Slug Size)
Если получите ошибку "Slug size too large":
1. Используйте `.slugignore` (уже создан)
2. Или переключитесь на API embeddings вместо локальной модели

## Стоимость

### Минимальная конфигурация (~$14/месяц):
- Web dyno (Eco): $5
- Worker dyno (Eco): $5  
- PostgreSQL (Essential): $0-5
- Redis (Mini): $3

### Продакшн (~$75/месяц):
- Web dyno (Standard-1X): $25
- Worker dyno (Standard-1X): $25
- PostgreSQL (Standard-0): $50
- Redis (Premium-0): $15

## Альтернативы Heroku

- **Railway.app** - проще и дешевле
- **Render.com** - есть free tier
- **Fly.io** - хороший для Docker
- **DigitalOcean App Platform** - предсказуемые цены

## Нужна помощь?

Полная документация: `HEROKU_DEPLOYMENT.md`
