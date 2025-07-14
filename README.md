# Mortgage Calculator Monorepo

Калькулятор ипотеки с визуализацией структуры выплат и аннуитетных платежей.

## Структура проекта

- `backend/` — Flask-приложение (API, бизнес-логика)
- `frontend/` — React/TypeScript-приложение (UI, графика, таблица)
- `docker-compose.yml` — конфигурация для контейнеризации
- `start-podman.sh` — скрипт для запуска с Podman
- `README-podman.md` — подробная инструкция по Podman
- `.gitignore` — общие правила для всего репозитория

## Быстрый старт

### Вариант 1: Podman (рекомендуется)

1. Установите [Podman Desktop](https://podman-desktop.io/)
2. Запустите проект:
```bash
./start-podman.sh up
```

### Вариант 2: Docker

```bash
docker-compose up --build
```

### Вариант 3: Локальный запуск

#### Backend (Flask)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # На Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

#### Frontend (React)
```bash
cd frontend
npm install
npm start
```

## Доступ к приложению

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## Управление проектом

### С Podman
```bash
./start-podman.sh up      # Запустить
./start-podman.sh down    # Остановить
./start-podman.sh logs    # Логи
./start-podman.sh status  # Статус
./start-podman.sh clean   # Очистка
```

### С Docker
```bash
docker-compose up -d      # Запустить
docker-compose down       # Остановить
docker-compose logs -f    # Логи
```

## Функциональность

- **Калькулятор ипотеки** с различными параметрами
- **Визуализация структуры выплат** по годам
- **График аннуитетных платежей** (по месяцам/годам)
- **Сравнение сценариев** с разными параметрами
- **Интерактивные графики** с Plotly
- **Адаптивный дизайн**

## Технологии

### Backend
- Python 3.12
- Flask
- Plotly
- Pandas
- NumPy

### Frontend
- React 18
- TypeScript
- Ant Design
- Plotly.js
- Axios

### Контейнеризация
- Podman (рекомендуется)
- Docker (альтернатива)

## Разработка

### Структура API

- `POST /api/calculate` — расчет ипотеки
- `POST /api/annuity_payments` — данные для графика аннуитетных платежей

### Переменные окружения

Backend:
- `PYTHONUNBUFFERED=1` — небуферизованный вывод
- `PYTHONDONTWRITEBYTECODE=1` — не создавать .pyc файлы

Frontend:
- `CI=false` — отключить CI проверки
- `CHOKIDAR_USEPOLLING=true` — polling для hot reload
- `WATCHPACK_POLLING=true` — polling для webpack

## Устранение неполадок

### Проблемы с Podman
См. подробную инструкцию в [README-podman.md](README-podman.md)

### Проблемы с сетью
```bash
# Проверить порты
netstat -tulpn | grep :3000
netstat -tulpn | grep :5000

# Перезапустить сервисы
./start-podman.sh down
./start-podman.sh up
```

### Проблемы с зависимостями
```bash
# Backend
cd backend
pip install --upgrade pip
pip install -r requirements.txt

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Лицензия

MIT License 