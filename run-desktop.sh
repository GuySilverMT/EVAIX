#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Change directory to the script's directory (workspace root)
cd "$(dirname "$0")"

echo "================================================="
echo "🚀 EVAIX DESKTOP LAUNCHER"
echo "================================================="

# 1. Stop any stale development processes on ports 4000 and 5173
echo "🛑 Checking for and stopping stale dev servers..."
if [ -f "./stop-dev.sh" ]; then
  ./stop-dev.sh
else
  echo "⚠️ stop-dev.sh not found, checking ports manually..."
  fuser -k -n tcp 4000 &>/dev/null || true
  fuser -k -n tcp 5173 &>/dev/null || true
fi

# 2. Start PostgreSQL and Redis containers using Podman
echo "🐳 Checking database & cache container status..."
CONTAINERS_STARTED=false

# Try to start existing containers directly (much faster than docker-compose/podman-compose up)
if podman inspect evaix_postgres_1 &>/dev/null && podman inspect evaix_redis_1 &>/dev/null; then
  echo "  - Starting existing containers (evaix_postgres_1, evaix_redis_1)..."
  podman start evaix_postgres_1 evaix_redis_1
  CONTAINERS_STARTED=true
else
  echo "  - Containers not found. Bringing them up via podman-compose..."
  podman-compose -f docker-compose.db.yml up -d
  CONTAINERS_STARTED=true
fi

# 3. Wait for PostgreSQL to be ready to accept connections
if [ "$CONTAINERS_STARTED" = true ]; then
  echo "⏳ Waiting for PostgreSQL to be ready..."
  for i in {1..30}; do
    # Try using pg_isready inside the container
    if podman exec evaix_postgres_1 pg_isready -U myuser -d mydb &>/dev/null; then
      echo "✅ PostgreSQL is ready!"
      break
    fi
    if [ $i -eq 30 ]; then
      echo "⚠️ PostgreSQL startup check timed out. Attempting to proceed anyway..."
    fi
    sleep 1
  done

  # 4. Wait for Redis to be ready
  echo "⏳ Waiting for Redis to be ready..."
  for i in {1..30}; do
    if podman exec evaix_redis_1 redis-cli ping 2>/dev/null | grep -q "PONG"; then
      echo "✅ Redis is ready!"
      break
    fi
    if [ $i -eq 30 ]; then
      echo "⚠️ Redis startup check timed out. Attempting to proceed anyway..."
    fi
    sleep 1
  done
fi

# 5. Build and launch the desktop application
echo "📦 Building packages..."
pnpm build

echo "🖥️ Starting EVAIX Desktop..."
pnpm run desktop
