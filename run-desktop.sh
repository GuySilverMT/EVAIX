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

# 2. Start all backend containers
echo "🐳 Starting Backend Services via Podman..."
podman-compose -f docker-compose.db.yml up -d

# 3. Wait for Services
if true; then
  echo "⏳ Waiting for LiteLLM Database (litellm-db)..."
  for i in {1..30}; do
    if podman exec evaix_litellm_db pg_isready -U litellm -d litellm &>/dev/null; then
      echo "✅ LiteLLM Database is ready!"
      break
    fi
    sleep 1
  done

  echo "⏳ Waiting for LiteLLM Proxy Router..."
  for i in {1..30}; do
    # LiteLLM health endpoint
    if curl -s http://localhost:8080/health > /dev/null; then
      echo "✅ LiteLLM Router is online!"
      break
    fi
    sleep 1
  done

  echo "⏳ Waiting for Open WebUI..."
  for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
      echo "✅ Open WebUI is online!"
      break
    fi
    sleep 1
  done

  echo "⏳ Waiting for Terminal (ttyd)..."
  for i in {1..30}; do
    if curl -s http://localhost:7681 > /dev/null 2>&1; then
      echo "✅ Terminal is online!"
      break
    fi
    sleep 1
  done

  echo "⏳ Waiting for File Browser..."
  for i in {1..30}; do
    if curl -s http://localhost:8082 > /dev/null 2>&1; then
      echo "✅ File Browser is online!"
      break
    fi
    sleep 1
  done
fi

# 5. Build and launch the desktop application
echo "📦 Building packages..."
pnpm build

echo "🌌 Starting Mastra Studio..."
(cd apps/api && pnpm exec mastra dev --port 4111) &

echo "🖥️ Starting EVAIX Desktop..."
pnpm run desktop
