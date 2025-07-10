# Mortgage Calculator Monorepo

## Структура проекта

- `backend/` — Flask-приложение (API, бизнес-логика)
- `frontend/` — React/TypeScript-приложение (UI, графика, таблица)
- `.gitignore` — общие правила для всего репозитория
- `README.md` — эта инструкция

## Запуск backend (Flask)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

## Запуск frontend (React)

```bash
cd frontend
npm install
npm start
```

Фронтенд будет доступен на http://localhost:3000, бэкенд — на http://localhost:5000

## Docker (опционально)

Можно использовать docker-compose для одновременного запуска обоих сервисов. 