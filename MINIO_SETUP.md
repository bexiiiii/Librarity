# MinIO / S3 Storage Integration

## Overview

Librarity использует MinIO (S3-совместимое хранилище) для хранения загруженных книг. Это обеспечивает:

- ✅ Масштабируемость хранения
- ✅ Надежность и отказоустойчивость  
- ✅ Простоту резервного копирования
- ✅ Возможность использования как локального MinIO, так и внешнего S3

## Текущая конфигурация

### Production S3 Storage (1edu.kz)

```bash
MINIO_ENDPOINT=api.euroline.storage.1edu.kz
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=admin12345
MINIO_BUCKET_NAME=librarityl
MINIO_USE_SSL=true
```

## Как это работает

### 1. Загрузка книги

```python
# api/books.py
await save_book_file(
    user_id=str(current_user.id),
    book_id=file_id,
    file_data=content,
    filename=filename
)
```

Файлы сохраняются с путями:
```
users/{user_id}/books/{book_id}/{filename}
```

Например:
```
users/123e4567-e89b-12d3-a456-426614174000/books/abc123/book.pdf
```

### 2. Обработка книги

Celery worker скачивает файл из MinIO во временную директорию:

```python
# workers/tasks.py
temp_file_path = download_book_from_minio(book.file_path)
# Обработка файла
# Удаление временного файла
```

### 3. Получение файла

Генерация presigned URL для скачивания (действителен 1 час):

```python
GET /api/books/{book_id}/download
```

Возвращает:
```json
{
  "download_url": "https://api.euroline.storage.1edu.kz/...",
  "filename": "book.pdf"
}
```

### 4. Удаление книги

Файл удаляется из MinIO при удалении записи книги:

```python
DELETE /api/books/{book_id}
```

## Структура хранения

```
librarityl/                           # Bucket
├── users/
│   ├── user-id-1/
│   │   └── books/
│   │       ├── book-id-1/
│   │       │   └── filename.pdf
│   │       ├── book-id-2/
│   │       │   └── filename.epub
│   │       └── ...
│   ├── user-id-2/
│   │   └── books/
│   │       └── ...
│   └── ...
```

## Миграция с локального хранения

Если у вас уже есть книги в локальной файловой системе (`backend/uploads/`):

### Скрипт миграции

```python
# scripts/migrate_to_minio.py
import asyncio
from pathlib import Path
from services.minio_service import minio_service
from models.book import Book
from sqlalchemy import select

async def migrate_books():
    # Получить все книги из БД
    books = await db.execute(select(Book))
    
    for book in books.scalars():
        # Проверить, что файл еще локальный
        if not book.file_path.startswith('users/'):
            # Прочитать локальный файл
            with open(book.file_path, 'rb') as f:
                file_data = f.read()
            
            # Загрузить в MinIO
            object_path = f"users/{book.owner_id}/books/{book.id}/{book.original_filename}"
            await minio_service.upload_file(file_data, object_path)
            
            # Обновить путь в БД
            book.file_path = object_path
            await db.commit()
            
            print(f"Migrated: {book.title}")

if __name__ == "__main__":
    asyncio.run(migrate_books())
```

## Переключение между хранилищами

### Использовать локальный MinIO (для разработки)

```bash
# docker-compose.yml
# Раскомментировать minio service

# .env
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=librarity-books
MINIO_USE_SSL=false
```

### Использовать внешний S3 (для продакшна)

```bash
# .env
MINIO_ENDPOINT=api.euroline.storage.1edu.kz
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=admin12345
MINIO_BUCKET_NAME=librarityl
MINIO_USE_SSL=true
```

## Мониторинг

### Проверить подключение к MinIO

```python
from services.minio_service import minio_service

# Список файлов
files = await minio_service.list_files(prefix="users/")

# Проверить существование файла
exists = await minio_service.file_exists("users/123/books/abc/file.pdf")

# Получить метаданные
metadata = await minio_service.get_file_metadata("users/123/books/abc/file.pdf")
```

### Логи

Все операции с MinIO логируются:

```json
{
  "event": "minio_file_uploaded",
  "object_name": "users/123/books/abc/file.pdf",
  "size": 1024567,
  "content_type": "application/pdf"
}
```

## Резервное копирование

### MinIO CLI

```bash
# Установить mc (MinIO Client)
brew install minio/stable/mc

# Настроить алиас
mc alias set euroline https://api.euroline.storage.1edu.kz admin admin12345

# Синхронизировать с локальной директорией
mc mirror euroline/librarityl /backup/librarity-books

# Копировать в другой бакет
mc cp --recursive euroline/librarityl euroline/librarityl-backup
```

## Troubleshooting

### Ошибка подключения

```
Failed to upload file to MinIO: Connection timeout
```

**Решение**: Проверить доступность endpoint:
```bash
curl https://api.euroline.storage.1edu.kz
```

### SSL ошибки

```
SSL: CERTIFICATE_VERIFY_FAILED
```

**Решение**: Установить `MINIO_USE_SSL=false` или добавить SSL сертификат

### Bucket не найден

```
Bucket does not exist
```

**Решение**: Бакет создается автоматически при старте. Проверить права доступа:
```python
minio_service._ensure_bucket_exists()
```

## Производительность

### Оптимизация загрузки

- Используйте multipart upload для файлов > 5MB
- Включите compression для текстовых файлов
- Настройте lifecycle policies для автоматической очистки

### Кэширование URL

Presigned URL кэшируются на 55 минут (действительны 1 час):

```python
# В будущем можно добавить Redis кэш
url = cache.get(f"book_url:{book_id}")
if not url:
    url = await get_book_file_url(book.file_path)
    cache.set(f"book_url:{book_id}", url, ttl=3300)  # 55 минут
```

## Security Best Practices

1. ✅ Используйте HTTPS в продакшне (`MINIO_USE_SSL=true`)
2. ✅ Храните credentials в .env файле (не в коде)
3. ✅ Используйте presigned URLs с ограниченным временем жизни
4. ✅ Настройте bucket policies для ограничения доступа
5. ✅ Регулярно ротируйте access keys

## Дополнительные возможности

### Версионирование файлов

```bash
mc version enable euroline/librarityl
```

### Lifecycle policies

Автоматическое удаление старых версий через 90 дней:

```json
{
  "Rules": [
    {
      "Expiration": {
        "Days": 90
      },
      "Status": "Enabled"
    }
  ]
}
```

### Репликация

Настройка репликации в другой регион для отказоустойчивости:

```bash
mc replicate add euroline/librarityl --remote-bucket backup-bucket
```

---

**Документация обновлена:** 2024-10-31
