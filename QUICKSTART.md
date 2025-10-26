# 🚀 LIBRARITY - QUICK START GUIDE

## ✅ Что уже создано

### Backend (100% готов)
- ✅ FastAPI приложение с полной структурой
- ✅ PostgreSQL модели (User, Book, Chat, Subscription, TokenUsage)
- ✅ JWT аутентификация
- ✅ API endpoints (Auth, Books, Chat, Subscription, Admin)
- ✅ LangChain RAG pipeline с Gemini
- ✅ Qdrant векторная база
- ✅ Token management система
- ✅ Polar.sh интеграция для подписок
- ✅ Celery workers для фоновой обработки
- ✅ Docker Compose инфраструктура

### Frontend (Базовая структура готова)
- ✅ Next.js 14 с App Router
- ✅ Красивый UI с анимациями (ваш дизайн сохранен)
- ✅ API клиент
- ✅ Профессиональная админ-панель

## 🎯 Запуск проекта

### Шаг 1: Настройка Backend

```bash
cd backend
cp .env.example .env
```

Отредактируйте `.env` и добавьте:
```env
# ОБЯЗАТЕЛЬНО!
GOOGLE_API_KEY=your_gemini_api_key_here
POLAR_API_KEY=your_polar_api_key_here
POLAR_ORGANIZATION_ID=your_org_id
SECRET_KEY=generate-random-secret-here
JWT_SECRET_KEY=generate-another-secret-here
```

### Шаг 2: Запуск с Docker (Рекомендуется)

```bash
# Из корневой папки проекта
docker-compose up -d
```

Это запустит:
- PostgreSQL → localhost:5432
- Redis → localhost:6379
- Qdrant → localhost:6333
- Backend API → localhost:8000
- Celery Worker
- Frontend → localhost:3000

### Шаг 3: Создание Admin пользователя

```bash
# Подключитесь к backend контейнеру
docker-compose exec backend python

# В Python shell:
from core.database import engine
from sqlalchemy.orm import sessionmaker
from models.user import User, UserRole
from models.subscription import Subscription, SubscriptionTier, SubscriptionStatus
from services.auth_service import auth_service
import uuid

Session = sessionmaker(bind=engine)
db = Session()

# Создать админа
admin = User(
    id=uuid.uuid4(),
    email='admin@librarity.com',
    username='admin',
    full_name='Admin User',
    hashed_password=auth_service.get_password_hash('admin123'),
    role=UserRole.ADMIN,
    is_active=True
)
db.add(admin)

# Создать подписку
sub = Subscription(
    user_id=admin.id,
    tier=SubscriptionTier.ULTIMATE,
    status=SubscriptionStatus.ACTIVE,
    token_limit=300000,
    max_books=999,
    has_citation_mode=True,
    has_author_mode=True,
    has_coach_mode=True,
    has_analytics=True
)
db.add(sub)
db.commit()
print("✅ Admin created: admin@librarity.com / admin123")
exit()
```

### Шаг 4: Доступ к приложению

- **Frontend**: http://localhost:3000
- **Backend API Docs**: http://localhost:8000/api/docs
- **Admin Panel**: http://localhost:3000/admin
- **Celery Monitoring**: http://localhost:5555

## 📋 Основные API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/me` - Текущий пользователь

### Книги
- `POST /api/books/upload` - Загрузить книгу (PDF, EPUB, TXT)
- `GET /api/books/` - Список книг пользователя
- `GET /api/books/{id}` - Детали книги
- `DELETE /api/books/{id}` - Удалить книгу

### Чат с книгами
- `POST /api/chat/` - Отправить сообщение
  ```json
  {
    "book_id": "uuid",
    "message": "What is the main idea?",
    "mode": "book_brain",  // book_brain, author, coach, citation
    "include_citations": true
  }
  ```

### Подписки
- `GET /api/subscription/` - Текущая подписка
- `POST /api/subscription/upgrade` - Апгрейд тарифа
- `GET /api/subscription/tokens` - Использование токенов

### Админка (требуется ADMIN роль)
- `GET /api/admin/stats` - Статистика системы
- `GET /api/admin/users` - Все пользователи
- `PATCH /api/admin/users/{id}/ban` - Забанить пользователя

## 🎨 Режимы взаимодействия с книгами

### 1. Book Brain (Мозг книги)
Умный ассистент, понимающий всю книгу целиком
```json
{
  "mode": "book_brain",
  "message": "Explain the key concepts"
}
```

### 2. Author Mode (Разговор с автором)
Общайтесь так, будто разговариваете с автором книги
```json
{
  "mode": "author",
  "message": "Why did you write this chapter?"
}
```

### 3. Citation Mode (С цитатами)
Получайте ответы с точными ссылками на страницы
```json
{
  "mode": "citation",
  "include_citations": true,
  "message": "Where does the author discuss motivation?"
}
```

### 4. AI Coach (Лайф-коуч)
Применяйте идеи книги к вашей жизни
```json
{
  "mode": "coach",
  "message": "How can I apply these principles to my career?"
}
```

## 💳 Тарифные планы

| Тариф | Цена | Токены | Книги | Возможности |
|-------|------|--------|-------|-------------|
| Free | $0 | 10,000 | 1 | Базовый чат |
| Pro | $9/мес | 100,000 | 5 | Citation + Coach |
| Ultimate | $19/мес | 300,000 | ∞ | Все функции + аналитика |

## 🔧 Troubleshooting

### Backend не запускается
```bash
# Проверьте логи
docker-compose logs backend

# Пересоздайте контейнеры
docker-compose down -v
docker-compose up --build
```

### Ошибка подключения к БД
```bash
# Проверьте PostgreSQL
docker-compose logs postgres

# Убедитесь, что порт 5432 свободен
lsof -i :5432
```

### Celery worker не обрабатывает книги
```bash
# Проверьте worker
docker-compose logs celery_worker

# Перезапустите worker
docker-compose restart celery_worker
```

## 📊 Мониторинг

### Celery Flower
http://localhost:5555 - мониторинг фоновых задач

### Логи
```bash
# Все сервисы
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Только worker
docker-compose logs -f celery_worker
```

## 🚀 Production Deploy

### 1. Подготовка
```bash
# Создайте production .env
cp .env.example .env.production

# Установите:
DEBUG=False
SECRET_KEY=<strong-random-key>
DATABASE_URL=<production-db-url>
CORS_ORIGINS=https://yourdomain.com
```

### 2. Deploy на Railway/Render
- Подключите GitHub репозиторий
- Настройте environment variables
- Deploy автоматически

### 3. Настройка домена
- Добавьте custom domain
- Настройте SSL сертификат
- Обновите CORS_ORIGINS

## 📚 Дополнительные ресурсы

- [FastAPI Docs](https://fastapi.tiangolo.com)
- [LangChain Docs](https://python.langchain.com)
- [Gemini API](https://ai.google.dev)
- [Polar.sh Docs](https://docs.polar.sh)
- [Qdrant Docs](https://qdrant.tech/documentation)

## 🤝 Что дальше?

### Для разработки:
1. Кастомизируйте UI компоненты
2. Добавьте больше режимов чата
3. Улучшите админ-панель
4. Добавьте аналитику и графики

### Для продакшна:
1. Настройте мониторинг (Sentry, LogRocket)
2. Добавьте email уведомления
3. Настройте CI/CD
4. Оптимизируйте производительность

---

**🎉 Поздравляю! Ваш AI Book Intelligence System готов к работе!**

Если нужна помощь - пишите в Issues или на support@librarity.com
