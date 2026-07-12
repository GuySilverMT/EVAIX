#!/bin/bash

# =============================================================================
# EVAIX DESKTOP LAUNCHER
# Boots all backend services then launches the Electron desktop app.
#
# Services started:
#   :8080  → LiteLLM Proxy (headless, no DB required)
#   :3000  → OpenWebUI
#   :7681  → ttyd Terminal
#   :8082  → FileBrowser
#   :9099  → EVAIX Mastra Tool Server (OpenAPI/HTTP)
#   :4111  → Mastra Agent Studio (local dev process)
#   Electron → EVAIX Desktop
# =============================================================================

# Change to workspace root regardless of where this script is called from
cd "$(dirname "$0")"

echo "================================================="
echo "🚀 EVAIX DESKTOP LAUNCHER"
echo "================================================="

# ---------------------------------------------------------------------------
# 1. Kill stale dev processes on known ports
# ---------------------------------------------------------------------------
echo ""
echo "🛑 Stopping stale dev servers..."
if [ -f "./stop-dev.sh" ]; then
  ./stop-dev.sh 2>/dev/null || true
else
  fuser -k -n tcp 4000 &>/dev/null || true
  fuser -k -n tcp 5173 &>/dev/null || true
fi

# Kill any old tool server process on 9099
fuser -k -n tcp 9099 &>/dev/null || true
# Kill any old Mastra Studio on 4111
fuser -k -n tcp 4111 &>/dev/null || true

# ---------------------------------------------------------------------------
# 2. Build the Mastra Tool Server (ensures dist/ is fresh before containers start)
# ---------------------------------------------------------------------------
echo ""
echo "🔨 Building EVAIX Mastra Tool Server..."
pnpm --filter @repo/mcp-server-vfs build 2>&1 | tail -5
echo "✅ Tool server built → packages/mcp-server-vfs/dist/"

# ---------------------------------------------------------------------------
# 3. Start the Mastra Tool Server on the HOST (before Podman, so it's ready
#    when OpenWebUI first boots and tries host.docker.internal:9099)
# ---------------------------------------------------------------------------
echo ""
echo "🧠 Starting EVAIX Mastra Tool Server (:9099)..."
# Ensure no stale binding
fuser -k 9099/tcp 2>/dev/null || true
sleep 1

LITELLM_API_BASE=http://localhost:8080/v1 \
LITELLM_MASTER_KEY=sk-litellm-key \
DEFAULT_AGENT_MODEL="${DEFAULT_AGENT_MODEL:-cerebras/gemma-4-31b}" \
CEREBRAS_API_KEY="${CEREBRAS_API_KEY}" \
NVIDIA_API_KEY="${NVIDIA_API_KEY}" \
GROQ_API_KEY="${GROQ_API_KEY}" \
JULES_API_KEY="${JULES_API_KEY}" \
  node packages/mcp-server-vfs/dist/mcp-server.js &
TOOLS_PID=$!
echo "   Tool server PID: ${TOOLS_PID}"

# ---------------------------------------------------------------------------
# 4. Start all backend containers via Podman
# ---------------------------------------------------------------------------
echo ""
echo "🐳 Starting Backend Services (Podman)..."
podman-compose -f docker-compose.db.yml up -d

# ---------------------------------------------------------------------------
# 5. Health checks — wait for each service (non-fatal, 30s timeout each)
# ---------------------------------------------------------------------------
wait_for() {
  local NAME="$1"
  local URL="$2"
  local PORT="$3"
  echo "⏳ Waiting for ${NAME} (${URL})..."
  for i in $(seq 1 30); do
    if curl -sf "${URL}" > /dev/null 2>&1; then
      echo "✅ ${NAME} is online!"
      return 0
    fi
    sleep 1
  done
  echo "⚠️  ${NAME} did not respond after 30s — continuing anyway"
}

echo ""
echo "--- Waiting for services ---"

# LiteLLM Proxy — headless, no DB login required
wait_for "LiteLLM Proxy (:8080)"    "http://localhost:8080/health"  8080

# OpenWebUI
wait_for "OpenWebUI (:3000)"        "http://localhost:3000"          3000

# EVAIX Mastra Tool Server
wait_for "EVAIX Tool Server (:9099)" "http://localhost:9099/openapi.json" 9099

# ttyd Terminal
wait_for "Terminal (:7681)"         "http://localhost:7681"          7681

# FileBrowser
wait_for "FileBrowser (:8082)"      "http://localhost:8082"          8082

# ---------------------------------------------------------------------------
# 6. Print connection summary
# ---------------------------------------------------------------------------
echo ""
echo "================================================="
echo "🌐 SERVICE ENDPOINTS"
echo "================================================="
echo "  LiteLLM Proxy   → http://localhost:8080/v1"
echo "  OpenWebUI        → http://localhost:3000"
echo "  EVAIX Tools      → http://localhost:9099"
echo "  Mastra Studio    → http://localhost:4111"
echo "  Terminal (ttyd)  → http://localhost:7681"
echo "  FileBrowser      → http://localhost:8082"
echo ""
echo "  📡 OpenWebUI Tool Server URL: http://localhost:9099"
echo "     Admin → Settings → Tools → Add Tool Server → paste ↑"
echo ""
echo "  🔗 OpenWebUI LiteLLM Connection:"
echo "     Admin → Settings → Connections → OpenAI → http://localhost:8080/v1"
echo "     Key: sk-litellm-key"
echo "================================================="

# ---------------------------------------------------------------------------
# 7. Build workspace packages
# ---------------------------------------------------------------------------
echo ""
echo "📦 Building workspace packages..."
pnpm build

# ---------------------------------------------------------------------------
# 8. Start Mastra Studio in background
# ---------------------------------------------------------------------------
echo ""
echo "🌌 Starting Mastra Agent Studio (:4111)..."
(cd apps/api && pnpm exec mastra dev --port 4111) &
MASTRA_PID=$!
echo "   Mastra Studio PID: ${MASTRA_PID}"

# ---------------------------------------------------------------------------
# 9. Launch EVAIX Desktop (blocks until window is closed)
# ---------------------------------------------------------------------------
echo ""
echo "🖥️  Starting EVAIX Desktop..."
pnpm run desktop

# ---------------------------------------------------------------------------
# Cleanup on exit
# ---------------------------------------------------------------------------
echo ""
echo "🛑 Desktop closed — stopping background services..."
kill $MASTRA_PID 2>/dev/null || true
kill $TOOLS_PID 2>/dev/null || true
fuser -k 9099/tcp 2>/dev/null || true
echo "✅ Done."
