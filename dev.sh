#!/bin/bash
# Development helper script for ChoreBot
# Automatically detects platform and uses appropriate Docker Compose configuration

set -e

# Detect platform
PLATFORM=$(uname -s)
COMPOSE_FILES="-f docker-compose.yml"

if [[ "$PLATFORM" == "Linux" ]]; then
    echo "🐧 Detected Linux - using host networking"
    COMPOSE_FILES="-f docker-compose.yml -f docker-compose.linux.yml"
else
    echo "🍎 Detected $PLATFORM - using port mapping"
fi

# Parse command
CMD=${1:-up}
shift || true

case "$CMD" in
    up)
        echo "🚀 Starting ChoreBot development environment..."
        docker compose $COMPOSE_FILES up -d "$@"
        echo "✅ Services started!"
        echo "📱 Home Assistant: http://localhost:8123"
        echo "📋 View logs: ./dev.sh logs"
        ;;
    down)
        echo "🛑 Stopping ChoreBot development environment..."
        docker compose $COMPOSE_FILES down "$@"
        echo "✅ Services stopped!"
        ;;
    logs)
        docker compose logs -f "$@"
        ;;
    restart)
        echo "🔄 Restarting services..."
        docker compose restart "$@"
        ;;
    rebuild)
        echo "🔨 Rebuilding containers..."
        docker compose $COMPOSE_FILES up -d --build "$@"
        echo "✅ Rebuild complete!"
        ;;
    exec)
        docker compose exec "$@"
        ;;
    shell)
        echo "🐚 Opening shell in Home Assistant container..."
        docker compose exec homeassistant bash
        ;;
    ps)
        docker compose ps "$@"
        ;;
    *)
        echo "ChoreBot Development Helper"
        echo ""
        echo "Usage: ./dev.sh [command]"
        echo ""
        echo "Commands:"
        echo "  up          Start services (default)"
        echo "  down        Stop services"
        echo "  logs        View logs (add service name for specific logs)"
        echo "  restart     Restart services"
        echo "  rebuild     Rebuild and restart containers"
        echo "  shell       Open shell in HA container"
        echo "  ps          Show running containers"
        echo "  exec        Execute command in container"
        echo ""
        echo "Examples:"
        echo "  ./dev.sh up"
        echo "  ./dev.sh logs homeassistant"
        echo "  ./dev.sh restart homeassistant"
        echo "  ./dev.sh shell"
        ;;
esac
