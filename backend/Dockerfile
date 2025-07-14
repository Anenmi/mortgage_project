FROM python:3.12-slim

# Создаем пользователя для безопасности
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Копируем requirements и устанавливаем зависимости
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Копируем код приложения
COPY . .

# Меняем владельца файлов
RUN chown -R appuser:appuser /app

# Переключаемся на пользователя
USER appuser

EXPOSE 5000

# Устанавливаем переменные окружения
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

CMD ["python", "app.py"]