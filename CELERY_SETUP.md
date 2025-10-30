# Настройка Celery на VPS DigitalOcean

## Метод 1: Systemd Service (Рекомендуется)

### 1. Создайте необходимые директории для логов

```bash
sudo mkdir -p /var/log/celery
sudo mkdir -p /var/run/celery
sudo chown -R www-data:www-data /var/log/celery
sudo chown -R www-data:www-data /var/run/celery
```

### 2. Скопируйте service файл в systemd

```bash
sudo cp /var/www/librarity/backend/celery.service /etc/systemd/system/celery.service
```

### 3. Обновите пути в service файле (если нужно)

Отредактируйте `/etc/systemd/system/celery.service` и измените:
- `User` и `Group` (обычно `www-data` или ваш пользователь)
- `WorkingDirectory` на путь к вашему проекту
- `Environment="PATH=..."` на путь к вашему virtualenv

```bash
sudo nano /etc/systemd/system/celery.service
```

### 4. Перезагрузите systemd и запустите Celery

```bash
# Перезагрузить конфигурацию systemd
sudo systemctl daemon-reload

# Включить автозапуск при загрузке системы
sudo systemctl enable celery

# Запустить Celery
sudo systemctl start celery

# Проверить статус
sudo systemctl status celery
```

### 5. Управление Celery

```bash
# Запустить
sudo systemctl start celery

# Остановить
sudo systemctl stop celery

# Перезапустить
sudo systemctl restart celery

# Проверить статус
sudo systemctl status celery

# Посмотреть логи
sudo journalctl -u celery -f

# Или
tail -f /var/log/celery/worker.log
```

---

## Метод 2: Supervisor (Альтернатива)

### 1. Установите Supervisor

```bash
sudo apt update
sudo apt install supervisor
```

### 2. Создайте конфигурацию Supervisor

```bash
sudo nano /etc/supervisor/conf.d/celery.conf
```

Добавьте:

```ini
[program:celery]
command=/var/www/librarity/backend/venv/bin/celery -A workers.celery_app worker --loglevel=info --pool=solo --concurrency=1
directory=/var/www/librarity/backend
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/celery/worker.log
stderr_logfile=/var/log/celery/worker_error.log
stopwaitsecs=600
killasgroup=true
priority=999
```

### 3. Создайте директорию для логов

```bash
sudo mkdir -p /var/log/celery
sudo chown -R www-data:www-data /var/log/celery
```

### 4. Обновите и запустите Supervisor

```bash
# Перечитать конфигурацию
sudo supervisorctl reread

# Обновить программы
sudo supervisorctl update

# Запустить Celery
sudo supervisorctl start celery

# Проверить статус
sudo supervisorctl status celery
```

### 5. Управление через Supervisor

```bash
# Запустить
sudo supervisorctl start celery

# Остановить
sudo supervisorctl stop celery

# Перезапустить
sudo supervisorctl restart celery

# Статус
sudo supervisorctl status celery

# Посмотреть логи
sudo tail -f /var/log/celery/worker.log
```

---

## Метод 3: Screen/Tmux (Для тестирования)

### С использованием screen:

```bash
# Установить screen (если нужно)
sudo apt install screen

# Создать новую сессию
screen -S celery

# Активировать virtualenv и запустить Celery
cd /var/www/librarity/backend
source venv/bin/activate
celery -A workers.celery_app worker --loglevel=info --pool=solo --concurrency=1

# Отсоединиться: Ctrl+A, затем D

# Вернуться к сессии
screen -r celery

# Список всех сессий
screen -ls

# Завершить сессию
screen -X -S celery quit
```

### С использованием tmux:

```bash
# Установить tmux (если нужно)
sudo apt install tmux

# Создать новую сессию
tmux new -s celery

# Активировать virtualenv и запустить Celery
cd /var/www/librarity/backend
source venv/bin/activate
celery -A workers.celery_app worker --loglevel=info --pool=solo --concurrency=1

# Отсоединиться: Ctrl+B, затем D

# Вернуться к сессии
tmux attach -t celery

# Список всех сессий
tmux ls

# Завершить сессию
tmux kill-session -t celery
```

---

## Метод 4: Nohup (Простой способ)

```bash
cd /var/www/librarity/backend
source venv/bin/activate

# Запустить в фоне с логированием
nohup celery -A workers.celery_app worker --loglevel=info --pool=solo --concurrency=1 > /var/log/celery/worker.log 2>&1 &

# Сохранить PID
echo $! > /var/run/celery.pid

# Остановить позже
kill $(cat /var/run/celery.pid)
```

---

## Рекомендации

1. **Для продакшена используйте Systemd** - это самый надежный способ
2. **Supervisor** - хорошая альтернатива с удобным веб-интерфейсом
3. **Screen/Tmux** - только для разработки и тестирования
4. **Nohup** - простой, но менее управляемый способ

## Проверка работы Celery

После запуска проверьте, что Celery работает:

```bash
# Проверить процесс
ps aux | grep celery

# Проверить логи
tail -f /var/log/celery/worker.log

# Или через journalctl (для systemd)
sudo journalctl -u celery -f
```

## Настройка Redis (если еще не настроен)

Celery требует Redis или RabbitMQ:

```bash
# Установить Redis
sudo apt install redis-server

# Включить автозапуск
sudo systemctl enable redis-server

# Запустить
sudo systemctl start redis-server

# Проверить статус
sudo systemctl status redis-server
```

## Переменные окружения

Убедитесь, что в `/var/www/librarity/backend/.env` указаны правильные настройки:

```env
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

## Мониторинг Celery

Для мониторинга можно использовать Flower:

```bash
# Установить Flower
pip install flower

# Запустить (в отдельной сессии или как service)
celery -A workers.celery_app flower --port=5555
```

Затем откройте в браузере: `http://your-vps-ip:5555`
