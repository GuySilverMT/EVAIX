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

# 2. Start PostgreSQL and LiteLLM containers using Podman
echo "🐳 Checking database & router container status..."
CONTAINERS_STARTED=false

# Check if both exist
if podman inspect evaix_postgres_1 &>/dev/null && podman inspect evaix_litellm_1 &>/dev/null; then
  echo "  - Starting existing containers (evaix_postgres_1, evaix_litellm_1)..."
  podman start evaix_postgres_1 evaix_litellm_1
  CONTAINERS_STARTED=true
else
  echo "  - Containers not found. Bringing them up..."
  podman-compose -f docker-compose.db.yml up -d
  
  # Inject LiteLLM explicitly if it's missing from the docker-compose.db.yml
  if ! podman inspect evaix_litellm_1 &>/dev/null; then
    echo "  - Starting standalone LiteLLM container on port 4000..."
    podman run -d \
      --name evaix_litellm_1 \
      -p 4000:4000 \
      -e LITELLM_MASTER_KEY="sk-litellm-key" \
      ghcr.io/berriai/litellm:main-latest
  fi
  CONTAINERS_STARTED=true
fi

# 3. Wait for Services
if [ "$CONTAINERS_STARTED" = true ]; then
  echo "⏳ Waiting for PostgreSQL..."
  for i in {1..30}; do
    if podman exec evaix_postgres_1 pg_isready -U myuser -d mydb &>/dev/null; then
      echo "✅ PostgreSQL is ready!"
      break
    fi
    sleep 1
  done

  echo "⏳ Waiting for LiteLLM Proxy Router..."
  for i in {1..30}; do
    # LiteLLM health endpoint
    if curl -s http://localhost:4000/health > /dev/null; then
      echo "✅ LiteLLM Router is online!"
      break
    fi
    sleep 1
  done
fi

# 5. Build and launch the desktop application
echo "📦 Building packages..."
pnpm build

echo "🖥️ Starting EVAIX Desktop..."
pnpm run desktop
