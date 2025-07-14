# Использование Podman вместо Docker

Этот проект настроен для работы с Podman Desktop. Podman - это альтернатива Docker, которая не требует демона и работает в пользовательском пространстве.

## Установка Podman Desktop

1. Скачайте и установите [Podman Desktop](https://podman-desktop.io/)
2. Запустите Podman Desktop
3. Убедитесь, что Podman Engine работает

## Команды для работы с проектом

### Запуск проекта
```bash
# Собрать и запустить все сервисы
podman-compose up --build

# Запустить в фоновом режиме
podman-compose up -d --build

# Только собрать образы
podman-compose build
```

### Остановка проекта
```bash
# Остановить все сервисы
podman-compose down

# Остановить и удалить volumes
podman-compose down -v
```

### Просмотр логов
```bash
# Логи всех сервисов
podman-compose logs

# Логи конкретного сервиса
podman-compose logs backend
podman-compose logs frontend

# Логи в реальном времени
podman-compose logs -f
```

### Управление контейнерами
```bash
# Список запущенных контейнеров
podman ps

# Войти в контейнер
podman exec -it mortgage-backend bash
podman exec -it mortgage-frontend bash

# Остановить контейнер
podman stop mortgage-backend
podman stop mortgage-frontend
```

## Отличия от Docker

### Основные команды
- `docker` → `podman`
- `docker-compose` → `podman-compose`

### Volumes
В docker-compose.yml добавлен флаг `:Z` для SELinux совместимости:
```yaml
volumes:
  - ./backend:/app:Z
```

### Сеть
Добавлена явная сеть для лучшей изоляции:
```yaml
networks:
  mortgage-network:
    driver: bridge
```

### Безопасность
- Контейнеры запускаются от непривилегированного пользователя
- Используются slim образы для уменьшения размера
- Добавлены переменные окружения для оптимизации

## Устранение неполадок

### SELinux ошибки
Если возникают проблемы с правами доступа:
```bash
# Временно отключить SELinux для volumes
podman-compose down
podman-compose up --build
```

### Проблемы с сетью
```bash
# Пересоздать сеть
podman network rm mortgage-network
podman-compose up --build
```

### Очистка
```bash
# Удалить все контейнеры и образы
podman-compose down --rmi all --volumes --remove-orphans
podman system prune -a
```

## Полезные команды Podman

```bash
# Информация о системе
podman info

# Список образов
podman images

# Список сетей
podman network ls

# Список volumes
podman volume ls

# Мониторинг ресурсов
podman stats
```

## Интеграция с IDE

Podman Desktop предоставляет GUI интерфейс для:
- Управления контейнерами
- Просмотра логов
- Мониторинга ресурсов
- Управления образами и volumes 