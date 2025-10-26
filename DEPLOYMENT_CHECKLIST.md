# ✅ Pre-Deployment Checklist

## 📋 Перед деплоем проверьте:

### 1. Файлы конфигурации
- [x] `Procfile` создан
- [x] `runtime.txt` создан (Python 3.11.9)
- [x] `requirements.txt` или `requirements-heroku.txt` актуален
- [x] `.slugignore` создан
- [x] `release.sh` создан и исполняемый

### 2. Переменные окружения
- [ ] `GOOGLE_API_KEY` - ключ Google Gemini
- [ ] `QDRANT_URL` - URL Qdrant instance
- [ ] `QDRANT_API_KEY` - API ключ Qdrant (если есть)
- [ ] `SECRET_KEY` - сгенерирован
- [ ] `JWT_SECRET_KEY` - сгенерирован
- [ ] `ENCRYPTION_KEY` - сгенерирован
- [ ] `CORS_ORIGINS` - URL фронтенда
- [ ] `FRONTEND_URL` - URL фронтенда
- [ ] `DATABASE_URL` - будет автоматически от Heroku
- [ ] `REDIS_URL` - будет автоматически от Heroku

### 3. Внешние сервисы

#### Qdrant Vector Database (Обязательно!)
Выберите один вариант:

**Вариант А: Qdrant Cloud** (Рекомендуется)
- [ ] Зарегистрироваться на https://cloud.qdrant.io
- [ ] Создать кластер (Free tier доступен)
- [ ] Получить URL и API ключ
- [ ] Установить в Heroku: `heroku config:set QDRANT_URL=... QDRANT_API_KEY=...`

**Вариант Б: Railway.app**
- [ ] Зарегистрироваться на https://railway.app
- [ ] Создать проект Qdrant из шаблона
- [ ] Получить URL
- [ ] Установить в Heroku: `heroku config:set QDRANT_URL=...`

**Вариант В: DigitalOcean**
- [ ] Создать Droplet
- [ ] Установить Qdrant через Docker
- [ ] Настроить firewall
- [ ] Установить в Heroku: `heroku config:set QDRANT_URL=...`

#### File Storage (Обязательно!)
Heroku использует ephemeral filesystem. Выберите:

**AWS S3** (Рекомендуется)
- [ ] Создать S3 bucket
- [ ] Получить Access Key и Secret Key
- [ ] Настроить CORS для bucket
- [ ] Установить переменные:
  ```bash
  heroku config:set USE_S3=True
  heroku config:set S3_ENDPOINT=https://s3.amazonaws.com
  heroku config:set S3_ACCESS_KEY=...
  heroku config:set S3_SECRET_KEY=...
  heroku config:set S3_BUCKET_NAME=librarity-books
  ```

**MinIO** (Альтернатива)
- [ ] Развернуть MinIO на отдельном сервере
- [ ] Получить credentials
- [ ] Установить переменные

**Cloudflare R2** (Дешевая альтернатива S3)
- [ ] Создать R2 bucket
- [ ] Получить API токен
- [ ] Установить переменные

### 4. Heroku аддоны
- [ ] PostgreSQL добавлен: `heroku addons:create heroku-postgresql:essential-0`
- [ ] Redis добавлен: `heroku addons:create heroku-redis:mini`
- [ ] (Опционально) Scheduler: `heroku addons:create scheduler:standard`

### 5. Git репозиторий
- [ ] Git инициализирован
- [ ] Все файлы закоммичены
- [ ] `.gitignore` настроен (не коммитить .env)
- [ ] Heroku remote добавлен: `heroku git:remote -a app-name`

### 6. Database migrations
- [ ] Alembic миграции созданы
- [ ] `release.sh` запускает миграции автоматически
- [ ] Или запустить вручную: `heroku run python -m alembic upgrade head`

### 7. Безопасность
- [ ] DEBUG=False в production
- [ ] SECRET_KEY изменен с дефолтного
- [ ] API ключи не в коде (только в env vars)
- [ ] CORS настроен правильно (только нужные домены)
- [ ] Rate limiting включен

### 8. Оптимизация
- [ ] `.slugignore` уменьшает размер slug
- [ ] Ненужные зависимости удалены из requirements.txt
- [ ] Проверен размер: должен быть < 500MB
- [ ] Если > 500MB - рассмотреть Docker деплой

### 9. Monitoring & Logging
- [ ] Настроить логирование (structlog уже есть)
- [ ] (Опционально) Sentry для error tracking
- [ ] (Опционально) PostHog для аналитики
- [ ] Health check endpoint работает: `/api/health`

### 10. Testing
После деплоя проверить:
- [ ] API docs доступны: `https://your-app.herokuapp.com/api/docs`
- [ ] Health check: `curl https://your-app.herokuapp.com/api/health`
- [ ] Database подключена (проверить в логах)
- [ ] Redis подключен (проверить в логах)
- [ ] Qdrant подключен (попробовать загрузить книгу)
- [ ] S3 работает (попробовать загрузить файл)
- [ ] Celery worker запущен: `heroku ps -a app-name`

## 🚀 Команды для деплоя

### Быстрый старт (автоматически)
```bash
cd backend
./scripts/heroku-setup.sh
./scripts/heroku-deploy.sh your-app-name
```

### Или пошагово (вручную)
```bash
# 1. Создать приложение
heroku create your-app-name

# 2. Добавить аддоны
heroku addons:create heroku-postgresql:essential-0 -a your-app-name
heroku addons:create heroku-redis:mini -a your-app-name

# 3. Установить переменные (см. выше)
heroku config:set KEY=VALUE -a your-app-name

# 4. Деплой
git push heroku main

# 5. Запустить dynos
heroku ps:scale web=1 worker=1 -a your-app-name

# 6. Проверить
heroku logs --tail -a your-app-name
```

## ⚠️ Частые проблемы

### Ошибка: "Slug size too large"
**Решение:**
1. Проверьте `.slugignore`
2. Удалите ненужные зависимости
3. Используйте `requirements-heroku.txt` (облегченная версия)
4. Или используйте Docker деплой: `heroku.yml`

### Ошибка: "Application error"
**Решение:**
```bash
heroku logs --tail -a your-app-name
# Проверьте логи на конкретные ошибки
```

### Ошибка: "Database connection failed"
**Решение:**
```bash
# Проверьте что PostgreSQL addon установлен
heroku addons -a your-app-name

# Проверьте DATABASE_URL
heroku config:get DATABASE_URL -a your-app-name

# Запустите миграции
heroku run python -m alembic upgrade head -a your-app-name
```

### Ошибка: "Memory quota exceeded"
**Решение:**
```bash
# Апгрейд на dyno с большей памятью
heroku ps:resize web=standard-2x -a your-app-name
```

### Worker не запускается
**Решение:**
```bash
# Проверьте что worker dyno включен
heroku ps -a your-app-name

# Запустите worker
heroku ps:scale worker=1 -a your-app-name

# Проверьте логи worker
heroku logs --tail --dyno worker -a your-app-name
```

## 📊 Мониторинг

```bash
# Статус приложения
heroku ps -a your-app-name

# Логи (real-time)
heroku logs --tail -a your-app-name

# Логи только web dyno
heroku logs --tail --dyno web -a your-app-name

# Логи только worker
heroku logs --tail --dyno worker -a your-app-name

# Использование resources
heroku ps:info -a your-app-name

# Database info
heroku pg:info -a your-app-name

# Redis info
heroku redis:info -a your-app-name
```

## 💰 Оценка стоимости

### Development (для тестов)
- Web: Eco ($5) или Free (ограничения)
- Worker: Eco ($5)
- PostgreSQL: Mini (Free) или Essential ($5)
- Redis: Mini ($3)
**Итого: ~$8-15/месяц**

### Production (для реальных пользователей)
- Web: Standard-1X ($25) или Standard-2X ($50)
- Worker: Standard-1X ($25)
- PostgreSQL: Standard-0 ($50)
- Redis: Premium-0 ($15)
**Итого: ~$115-140/месяц**

## ✅ Готово к деплою?

Если все пункты checked - можете деплоить! 🚀

```bash
cd backend
./scripts/heroku-deploy.sh your-app-name
```

Или если хотите все настроить с нуля:

```bash
cd backend
./scripts/heroku-setup.sh
```
