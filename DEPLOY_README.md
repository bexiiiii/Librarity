# 🚀 Деплой Librarity - Краткая инструкция

## Что подготовлено

Все файлы для деплоя на Heroku уже созданы:

```
backend/
├── Procfile                    ✅ Конфиг для Heroku
├── runtime.txt                 ✅ Python версия
├── heroku.yml                  ✅ Docker деплой (опционально)
├── requirements-heroku.txt     ✅ Облегченные зависимости
├── .slugignore                 ✅ Исключения для оптимизации
├── release.sh                  ✅ Автоматические миграции
├── railway.json                ✅ Для Railway.app
├── render.yaml                 ✅ Для Render.com
└── scripts/
    ├── heroku-setup.sh         ✅ Автоматическая настройка
    └── heroku-deploy.sh        ✅ Быстрый деплой
```

## 🎯 Три способа деплоя

### 1️⃣ Автоматический (самый простой)

```bash
cd backend
./scripts/heroku-setup.sh
```

Скрипт сделает все за вас:
- Создаст приложение
- Добавит PostgreSQL и Redis
- Настроит переменные окружения
- Сгенерирует секретные ключи

Затем:
```bash
./scripts/heroku-deploy.sh your-app-name
```

### 2️⃣ Ручной (больше контроля)

Следуйте инструкциям в `DEPLOYMENT_CHECKLIST.md`

### 3️⃣ Альтернативные платформы

- **Railway.app**: `railway.json` готов
- **Render.com**: `render.yaml` готов
- **Fly.io**: Используйте Docker

## ⚠️ Обязательно настроить ДО деплоя

### 1. Qdrant Vector Database
Heroku не поддерживает Qdrant. Варианты:

**Рекомендуется: Qdrant Cloud**
- Регистрация: https://cloud.qdrant.io
- Free tier доступен
- Получите URL и API ключ
- Установите: `heroku config:set QDRANT_URL=... QDRANT_API_KEY=...`

**Альтернатива: Railway.app**
- Разверните Qdrant там
- Используйте URL в Heroku

### 2. File Storage (S3)
Heroku удаляет файлы при рестарте. Обязательно:

**AWS S3** (рекомендуется)
- Создайте S3 bucket
- Получите Access Key / Secret Key
- Установите переменные:
  ```bash
  heroku config:set USE_S3=True \
    S3_ENDPOINT=https://s3.amazonaws.com \
    S3_ACCESS_KEY=your-key \
    S3_SECRET_KEY=your-secret \
    S3_BUCKET_NAME=librarity-books
  ```

## 📋 Checklist

Перед деплоем проверьте: `DEPLOYMENT_CHECKLIST.md`

## 📚 Документация

- **Краткий старт**: `backend/HEROKU_QUICKSTART.md`
- **Полная инструкция**: `HEROKU_DEPLOYMENT.md`
- **Checklist**: `DEPLOYMENT_CHECKLIST.md`

## 💡 Быстрые команды

```bash
# Логи
heroku logs --tail -a your-app

# Статус
heroku ps -a your-app

# Открыть
heroku open -a your-app

# Консоль
heroku run bash -a your-app

# Перезапуск
heroku restart -a your-app
```

## 💰 Стоимость

**Минимум (~$8-15/мес)**
- Web + Worker: $10 (Eco dynos)
- PostgreSQL: Free-$5
- Redis: $3

**Продакшн (~$115/мес)**
- Web + Worker: $50 (Standard)
- PostgreSQL: $50
- Redis: $15

## 🆘 Проблемы?

1. Проверьте `DEPLOYMENT_CHECKLIST.md`
2. Смотрите логи: `heroku logs --tail`
3. Читайте `HEROKU_DEPLOYMENT.md` - там все проблемы разобраны

## ✅ Готово!

Все готово для деплоя. Выберите способ выше и запускайте! 🚀
