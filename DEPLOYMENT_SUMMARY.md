# 🎉 Готово к деплою на Heroku!

## ✅ Что создано

### Основные файлы конфигурации
1. **`Procfile`** - определяет процессы (web, worker, release)
2. **`runtime.txt`** - Python 3.11.9
3. **`heroku.yml`** - для Docker деплоя
4. **`requirements-heroku.txt`** - оптимизированные зависимости
5. **`.slugignore`** - исключения для уменьшения размера
6. **`release.sh`** - автоматические миграции при деплое

### Скрипты автоматизации
1. **`scripts/heroku-setup.sh`** - полная автоматическая настройка
2. **`scripts/heroku-deploy.sh`** - быстрый деплой

### Документация
1. **`DEPLOY_README.md`** - краткая инструкция (НАЧНИТЕ С ЭТОГО)
2. **`HEROKU_QUICKSTART.md`** - быстрый старт
3. **`HEROKU_DEPLOYMENT.md`** - полная детальная инструкция
4. **`DEPLOYMENT_CHECKLIST.md`** - checklist перед деплоем

### Дополнительно
1. **`railway.json`** - конфиг для Railway.app
2. **`render.yaml`** - конфиг для Render.com
3. **`api/health.py`** - health check endpoints (если нужно создать)

## 🚀 Как деплоить

### Вариант 1: Автоматически (рекомендуется)

```bash
cd /Users/behruztohtamishov/librarity/backend

# 1. Полная настройка (один раз)
./scripts/heroku-setup.sh

# 2. Деплой (каждый раз когда нужно задеплоить)
./scripts/heroku-deploy.sh your-app-name
```

### Вариант 2: Вручную

1. Прочитайте `DEPLOY_README.md`
2. Следуйте `DEPLOYMENT_CHECKLIST.md`
3. Используйте команды из `HEROKU_QUICKSTART.md`

## ⚠️ Важные требования

### 1. Qdrant Vector Database (ОБЯЗАТЕЛЬНО)
Heroku не поддерживает Qdrant. Нужно развернуть отдельно:

**Самый простой способ: Qdrant Cloud**
```bash
# 1. Зарегистрируйтесь: https://cloud.qdrant.io
# 2. Создайте кластер (есть free tier)
# 3. Получите URL и API ключ
# 4. Установите в Heroku:
heroku config:set QDRANT_URL=https://your-cluster.qdrant.io -a your-app
heroku config:set QDRANT_API_KEY=your-api-key -a your-app
```

### 2. File Storage - S3 (ОБЯЗАТЕЛЬНО)
Heroku удаляет файлы при рестарте. Нужен S3:

**AWS S3:**
```bash
heroku config:set USE_S3=True -a your-app
heroku config:set S3_ENDPOINT=https://s3.amazonaws.com -a your-app
heroku config:set S3_ACCESS_KEY=your-key -a your-app
heroku config:set S3_SECRET_KEY=your-secret -a your-app
heroku config:set S3_BUCKET_NAME=librarity-books -a your-app
```

### 3. API ключи
```bash
# Google Gemini (обязательно)
heroku config:set GOOGLE_API_KEY=AIzaSyDdYFNbM6qrgMJEAJTp_XUAPS589WkR2pQ -a your-app

# CORS (замените на ваш фронтенд)
heroku config:set CORS_ORIGINS=https://your-frontend.vercel.app -a your-app
```

## 📦 Структура Heroku app

```
Heroku Application
├── web dyno          → FastAPI backend (Procfile: web)
├── worker dyno       → Celery worker (Procfile: worker)
├── release phase     → Database migrations (release.sh)
└── addons
    ├── PostgreSQL    → База данных
    └── Redis         → Celery broker + cache
```

## 💰 Стоимость (примерная)

### Development / Testing
```
Web dyno (Eco):       $5/месяц
Worker dyno (Eco):    $5/месяц
PostgreSQL (Mini):    Free
Redis (Mini):         $3/месяц
─────────────────────────────
ИТОГО:                ~$13/месяц
```

### Production
```
Web dyno (Standard-1X):      $25/месяц
Worker dyno (Standard-1X):   $25/месяц
PostgreSQL (Standard-0):     $50/месяц
Redis (Premium-0):           $15/месяц
─────────────────────────────
ИТОГО:                       ~$115/месяц
```

**Внешние сервисы (дополнительно):**
- Qdrant Cloud: Free tier или от $25/месяц
- AWS S3: ~$0.023/GB + запросы (обычно $1-5/месяц)

## 🎯 Быстрые команды

```bash
# Создать приложение
heroku create librarity-backend

# Добавить аддоны
heroku addons:create heroku-postgresql:essential-0 -a librarity-backend
heroku addons:create heroku-redis:mini -a librarity-backend

# Деплой
git push heroku main

# Запустить dynos
heroku ps:scale web=1 worker=1 -a librarity-backend

# Логи
heroku logs --tail -a librarity-backend

# Статус
heroku ps -a librarity-backend

# Открыть в браузере
heroku open -a librarity-backend
```

## 🔧 Настройка Stack

### Buildpack деплой (по умолчанию)
Использует `Procfile` и `requirements.txt`
```bash
# Уже настроено, просто:
git push heroku main
```

### Docker деплой (если Slug > 500MB)
Использует `heroku.yml` и `Dockerfile.prod`
```bash
# Включить Docker stack:
heroku stack:set container -a librarity-backend

# Деплой:
git push heroku main
```

## 📊 Мониторинг

### После деплоя проверьте:

1. **API работает:**
   ```bash
   curl https://librarity-backend.herokuapp.com/api/health
   ```

2. **Документация доступна:**
   ```
   https://librarity-backend.herokuapp.com/api/docs
   ```

3. **Dynos запущены:**
   ```bash
   heroku ps -a librarity-backend
   ```

4. **База данных подключена:**
   ```bash
   heroku pg:info -a librarity-backend
   ```

5. **Redis работает:**
   ```bash
   heroku redis:info -a librarity-backend
   ```

6. **Логи без ошибок:**
   ```bash
   heroku logs --tail -a librarity-backend
   ```

## 🐛 Troubleshooting

### Slug size too large (>500MB)
```bash
# Решение 1: Используйте .slugignore (уже создан)
# Решение 2: Используйте requirements-heroku.txt вместо requirements.txt
# Решение 3: Переключитесь на Docker деплой
heroku stack:set container -a librarity-backend
```

### Application Error
```bash
# Смотрите логи:
heroku logs --tail -a librarity-backend

# Проверьте переменные:
heroku config -a librarity-backend

# Перезапустите:
heroku restart -a librarity-backend
```

### Database connection failed
```bash
# Запустите миграции:
heroku run python -m alembic upgrade head -a librarity-backend

# Проверьте DATABASE_URL:
heroku config:get DATABASE_URL -a librarity-backend
```

### Worker не запускается
```bash
# Проверьте статус:
heroku ps -a librarity-backend

# Запустите worker:
heroku ps:scale worker=1 -a librarity-backend

# Логи worker:
heroku logs --tail --dyno worker -a librarity-backend
```

## 🔄 CI/CD (опционально)

### GitHub Actions
Создайте `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Heroku
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "librarity-backend"
          heroku_email: "your@email.com"
          appdir: "backend"
```

## 📱 Frontend деплой

### Vercel (рекомендуется для Next.js)
```bash
cd librarity

# Создайте .env.production
echo "NEXT_PUBLIC_API_URL=https://librarity-backend.herokuapp.com/api" > .env.production

# Деплой
npm i -g vercel
vercel --prod
```

## 🎓 Альтернативы Heroku

Если Heroku не подходит:

1. **Railway.app** - проще, дешевле, `railway.json` готов
2. **Render.com** - free tier, `render.yaml` готов
3. **Fly.io** - хороший для Docker
4. **DigitalOcean App Platform** - предсказуемые цены
5. **AWS Elastic Beanstalk** - больше контроля

## 📞 Получить помощь

1. Проверьте `DEPLOYMENT_CHECKLIST.md` - там все проблемы
2. Читайте `HEROKU_DEPLOYMENT.md` - полная документация
3. Heroku DevCenter: https://devcenter.heroku.com/
4. Логи всегда помогут: `heroku logs --tail`

## ✨ Следующие шаги

После успешного деплоя:

1. ✅ Настройте домен: `heroku domains:add yourdomain.com`
2. ✅ Настройте SSL (автоматически через Heroku)
3. ✅ Настройте мониторинг (Sentry, PostHog)
4. ✅ Настройте бекапы БД: `heroku pg:backups:schedule`
5. ✅ Настройте CI/CD через GitHub Actions

---

## 🎉 Вы готовы!

Все файлы созданы, документация написана. 

**Начните с:** `DEPLOY_README.md`

**Быстрый старт:**
```bash
cd backend
./scripts/heroku-setup.sh
./scripts/heroku-deploy.sh your-app-name
```

Удачного деплоя! 🚀
