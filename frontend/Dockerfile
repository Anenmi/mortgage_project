FROM node:20-slim

# Создаем пользователя для безопасности
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Копируем package файлы
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем код приложения
COPY . .

# Меняем владельца файлов
RUN chown -R appuser:appuser /app

# Переключаемся на пользователя
USER appuser

EXPOSE 3000

# Устанавливаем переменные окружения
ENV CI=false
ENV NODE_ENV=development
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

CMD ["npm", "start"] 