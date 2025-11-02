# 📊 Visitor Tracking Deployment Guide

## Overview
Новая система отслеживания анонимных посетителей позволяет:
- ✅ Видеть сколько людей заходит на сайт но не регистрируется
- ✅ Анализировать conversion funnel (воронку конверсии)
- ✅ Отслеживать bounce rate (процент отказов)
- ✅ Видеть источники трафика (UTM параметры)
- ✅ Анализировать устройства посетителей

## Backend Deployment

### 1. Подключиться к серверу
```bash
ssh root@student-vps
cd ~/Librarity
```

### 2. Обновить код
```bash
git pull origin main
# Должны быть commits:
# - e2e5dd2: AI prompt improvements
# - 4d88add: Visitor tracking feature
# - 54b525a: SQL migration fix
```

### 3. Применить миграцию базы данных
```bash
cd backend

# Запустить миграцию
psql -U postgres -d librarity -f scripts/add_visitor_tracking.sql

# Проверить что таблица создана
psql -U postgres -d librarity -c "\d anonymous_visitors"
```

Вы должны увидеть структуру таблицы с колонками:
- `id`, `visitor_id`, `first_visit`, `last_visit`, `visit_count`
- `converted_to_user`, `user_id`
- `utm_source`, `utm_medium`, `utm_campaign`, `referrer`
- `device_type`, `browser`, `os`
- `country`, `city`
- `landing_page`, `pages_visited`
- `created_at`, `updated_at`

### 4. Перезапустить backend
```bash
sudo systemctl restart backend
sudo systemctl status backend

# Проверить логи
sudo journalctl -u backend -f --lines=50
```

### 5. Проверить API endpoints
```bash
# Должны быть доступны новые endpoints:
# POST /api/tracking/visit - Track visitor (public)
# GET /api/tracking/stats - Get statistics (admin only)
# GET /api/tracking/funnel - Get conversion funnel (admin only)

curl -X GET https://student-vps.dev/api/docs
# Найдите раздел "Visitor Tracking"
```

## Frontend Deployment

### 1. Собрать frontend
```bash
cd ~/Librarity/librarity
git pull origin main
npm install  # Установит @fingerprintjs/fingerprintjs
npm run build
```

### 2. Перезапустить frontend
```bash
pm2 restart librarity-frontend
pm2 logs librarity-frontend --lines=50
```

### 3. Проверить что трекинг работает
```bash
# Откройте сайт в браузере (в режиме инкогнито)
# Откройте Developer Tools -> Network
# Должен появиться запрос: POST /api/tracking/visit
# Ответ: {"success": true, "visitor_id": "...", "visit_count": 1}
```

## Доступ к статистике

### Admin Dashboard
```
https://lexentai.com/admin/visitors
```

**Требуется:** Admin аккаунт

### Что можно увидеть:

1. **Key Metrics:**
   - Total Visitors (всего посетителей за период)
   - Anonymous Visitors (НЕ зарегистрировались) ← **ЭТО ТО ЧТО ТЫ ХОТЕЛ!**
   - Conversion Rate (процент конверсии)
   - Bounce Rate (процент отказов)

2. **Conversion Funnel (Воронка):**
   - Landed on site → 100%
   - Returned visitor → X%
   - Registered → Y%
   - Uploaded book → Z%
   - Active user (chatted) → W%
   - Paying customer → V%

3. **Traffic Sources:**
   - Источники трафика (если используются UTM параметры)
   - Например: Google, Facebook, Direct

4. **Devices:**
   - Desktop / Mobile / Tablet
   - Browser (Chrome, Safari, Firefox, etc.)
   - OS (Windows, macOS, Linux, Android, iOS)

5. **Timeline:**
   - Daily новые посетители
   - Daily конверсии

## Примеры использования

### Пример 1: Сколько людей зашли но не зарегистрировались?
```
Admin Dashboard → Visitors → Anonymous Visitors (красное число)
```

### Пример 2: Где теряются пользователи?
```
Admin Dashboard → Visitors → Conversion Funnel
Смотрим на каком шаге самое большое падение процента
```

### Пример 3: Откуда приходит трафик?
```
Admin Dashboard → Visitors → Traffic Sources
```

### Пример 4: С каких устройств заходят?
```
Admin Dashboard → Visitors → Devices
```

## API для интеграций

### Track Visit (Public)
```bash
POST /api/tracking/visit
Content-Type: application/json

{
  "visitor_id": "unique-fingerprint-id",
  "landing_page": "/",
  "referrer": "https://google.com",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "winter_sale",
  "device_type": "desktop",
  "browser": "Chrome",
  "os": "Windows"
}
```

### Get Statistics (Admin)
```bash
GET /api/tracking/stats?days=30
Authorization: Bearer <admin_token>

Response:
{
  "period_days": 30,
  "total_visitors": 1500,
  "period_visitors": 500,
  "anonymous_visitors": 350,  // ← Не зарегистрировались
  "converted_visitors": 150,
  "conversion_rate_percent": 30.0,
  "bounce_rate_percent": 45.5,
  "avg_visits_per_visitor": 2.3,
  "traffic_sources": [...],
  "devices": [...],
  "timeline": [...]
}
```

### Get Funnel (Admin)
```bash
GET /api/tracking/funnel?days=30
Authorization: Bearer <admin_token>

Response:
{
  "period_days": 30,
  "funnel": [
    {"step": "Landed on site", "count": 500, "conversion_rate": 100.0},
    {"step": "Returned visitor", "count": 300, "conversion_rate": 60.0},
    {"step": "Registered", "count": 150, "conversion_rate": 30.0},
    {"step": "Uploaded book", "count": 100, "conversion_rate": 20.0},
    {"step": "Active user (chatted)", "count": 80, "conversion_rate": 16.0},
    {"step": "Paying customer", "count": 20, "conversion_rate": 4.0}
  ]
}
```

## Мониторинг

### Проверить что трекинг работает
```bash
# На сервере
psql -U postgres -d librarity -c "SELECT COUNT(*) FROM anonymous_visitors;"
psql -U postgres -d librarity -c "SELECT COUNT(*) FROM anonymous_visitors WHERE converted_to_user = false;"
```

### Посмотреть последних посетителей
```bash
psql -U postgres -d librarity -c "
SELECT 
  visitor_id, 
  first_visit, 
  visit_count, 
  converted_to_user,
  device_type,
  landing_page
FROM anonymous_visitors 
ORDER BY first_visit DESC 
LIMIT 10;
"
```

## Troubleshooting

### Проблема: "Cannot find module '@fingerprintjs/fingerprintjs'"
```bash
cd librarity
npm install @fingerprintjs/fingerprintjs
npm run build
pm2 restart librarity-frontend
```

### Проблема: API возвращает 500 ошибку
```bash
# Проверить логи backend
sudo journalctl -u backend -f --lines=100

# Проверить что таблица существует
psql -U postgres -d librarity -c "\dt anonymous_visitors"
```

### Проблема: Visitor tracking не работает в frontend
```bash
# Проверить консоль браузера на ошибки
# Проверить что /api/tracking/visit доступен

curl -X POST https://lexentai.com/api/tracking/visit \
  -H "Content-Type: application/json" \
  -d '{"visitor_id": "test-123", "landing_page": "/"}'
```

## Улучшения AI промптов (также в этом деплое)

Commits e2e5dd2 и 54b525a также включают улучшения AI:
- ✅ AI теперь ПОДРОБНО объясняет все концепции (Матрица Эйзенхауэра, Pomodoro, и т.д.)
- ✅ AI понимает контекст разговора и не повторяется
- ✅ AI извиняется и дает НОВЫЙ контент если пользователь говорит "ты уже об этом упоминал"

Перезапуск backend применит эти улучшения автоматически.

## Next Steps

После деплоя рекомендуется:
1. ✅ Проверить admin dashboard работает
2. ✅ Открыть сайт в инкогнито и убедиться что трекинг срабатывает
3. ✅ Подождать несколько дней и посмотреть реальную статистику
4. 📊 Использовать данные для оптимизации conversion rate
5. 🎯 Настроить UTM параметры для рекламных кампаний
6. 💰 Анализировать где теряются пользователи в воронке

---

**Вопросы?** Проверь логи или напиши в чат!
