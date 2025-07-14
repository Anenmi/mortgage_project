#!/bin/bash

# Скрипт для запуска проекта с Podman
# Использование: ./start-podman.sh [build|up|down|logs|clean]

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Проверка наличия podman
check_podman() {
    if ! command -v podman &> /dev/null; then
        error "Podman не установлен. Установите Podman Desktop: https://podman-desktop.io/"
        exit 1
    fi
    
    if ! command -v podman-compose &> /dev/null; then
        error "podman-compose не установлен. Установите: pip install podman-compose"
        exit 1
    fi
}

# Проверка статуса Podman Engine
check_podman_engine() {
    if ! podman info &> /dev/null; then
        error "Podman Engine не запущен. Запустите Podman Desktop"
        exit 1
    fi
}

# Функция сборки
build() {
    log "Сборка образов..."
    podman-compose build
    log "Сборка завершена"
}

# Функция запуска
up() {
    log "Запуск сервисов..."
    podman-compose up -d --build
    log "Сервисы запущены"
    log "Backend доступен по адресу: http://localhost:5000"
    log "Frontend доступен по адресу: http://localhost:3000"
}

# Функция остановки
down() {
    log "Остановка сервисов..."
    podman-compose down
    log "Сервисы остановлены"
}

# Функция просмотра логов
logs() {
    log "Просмотр логов..."
    podman-compose logs -f
}

# Функция очистки
clean() {
    warn "Очистка всех контейнеров, образов и volumes..."
    podman-compose down --rmi all --volumes --remove-orphans
    podman system prune -a -f
    log "Очистка завершена"
}

# Функция статуса
status() {
    log "Статус контейнеров:"
    podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    log "Статус сервисов:"
    if podman ps --format "{{.Names}}" | grep -q "mortgage-backend"; then
        echo -e "${GREEN}✓ Backend запущен${NC}"
    else
        echo -e "${RED}✗ Backend не запущен${NC}"
    fi
    
    if podman ps --format "{{.Names}}" | grep -q "mortgage-frontend"; then
        echo -e "${GREEN}✓ Frontend запущен${NC}"
    else
        echo -e "${RED}✗ Frontend не запущен${NC}"
    fi
}

# Функция помощи
help() {
    echo "Использование: $0 [команда]"
    echo ""
    echo "Команды:"
    echo "  build   - Собрать образы"
    echo "  up      - Запустить сервисы"
    echo "  down    - Остановить сервисы"
    echo "  logs    - Просмотр логов"
    echo "  status  - Статус сервисов"
    echo "  clean   - Очистить все контейнеры и образы"
    echo "  help    - Показать эту справку"
    echo ""
    echo "Примеры:"
    echo "  $0 up      # Запустить проект"
    echo "  $0 logs    # Просмотр логов"
    echo "  $0 down    # Остановить проект"
}

# Основная логика
main() {
    check_podman
    check_podman_engine
    
    case "${1:-help}" in
        build)
            build
            ;;
        up)
            up
            ;;
        down)
            down
            ;;
        logs)
            logs
            ;;
        status)
            status
            ;;
        clean)
            clean
            ;;
        help|--help|-h)
            help
            ;;
        *)
            error "Неизвестная команда: $1"
            help
            exit 1
            ;;
    esac
}

# Запуск основной функции
main "$@" 