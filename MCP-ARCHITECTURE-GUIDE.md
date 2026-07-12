# EVAIX: MCP Tool Server Integration Guide

This document outlines the required architectural pattern for successfully connecting local Model Context Protocol (MCP) tool servers to an OpenWebUI Docker container.

> ⚠️ **CRITICAL FOR AI CODERS:** Do not use the legacy `SSEServerTransport` when integrating with OpenWebUI. OpenWebUI expects a stateless, unified Streamable HTTP endpoint. Using the old transport causes `HTTP 404` and `HTTP 400` errors that appear as connection failures.

---

## 1. The Backend: Stateless Streamable HTTP (`mcp-server.ts`)

OpenWebUI's "MCP Streamable HTTP" type expects **both** the SSE stream initialization (`GET`) and all tool execution messages (`POST`) to hit the **exact same route**. It also sends stateless POST requests without session IDs.

### ✅ Correct Pattern

```typescript
import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const app = express();
app.use(cors());
app.use(express.json());

const mcpServer = new McpServer({ name: 'my-server', version: '1.0.0' });

// Register tools like this:
mcpServer.tool(
  'my_tool_name',
  'Description of what this tool does.',
  { input_param: z.string().describe('What this param is for.') },
  async ({ input_param }) => {
    return { content: [{ type: 'text', text: `Result: ${input_param}` }] };
  }
);

// CRITICAL: sessionIdGenerator must be undefined (stateless mode)
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});

// Both GET and POST must go to the same route
app.use('/sse', async (req, res) => {
  await transport.handleRequest(req, res, req.body);
});

await mcpServer.server.connect(transport);

// CRITICAL: Bind to 0.0.0.0, NOT localhost — Docker cannot reach localhost
app.listen(9099, '0.0.0.0', () => {
  console.log('MCP Server ready at http://0.0.0.0:9099/sse');
});
```

### ❌ Wrong Pattern (Legacy SSEServerTransport — DO NOT USE)

```typescript
// This will cause HTTP 404 on POST /sse from OpenWebUI — never use this
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

app.get('/sse', async (req, res) => { /* GET only — POST will 404 */ });
app.post('/messages', async (req, res) => { /* Separate route — OpenWebUI won't find it */ });
```

---

## 2. Docker Networking (`docker-compose.db.yml`)

OpenWebUI runs inside a Podman/Docker container and **cannot** reach `localhost` on the host machine. You must bridge the container to the host via `extra_hosts`.

### Required Configuration

Add the following to the `openwebui` service in `docker-compose.db.yml`:

```yaml
services:
  openwebui:
    image: ghcr.io/open-webui/open-webui:main
    # ... other config ...
    extra_hosts:
      - "host.docker.internal:host-gateway"   # Fedora/Linux specific — maps host.docker.internal to the real host IP
```

> **Why `host-gateway`?** On Fedora Linux with Podman, Docker's automatic `host.docker.internal` DNS injection is absent. The `host-gateway` special value instructs Podman to resolve this to the container's default gateway, which is the host machine's IP.

---

## 3. Adding New Servers to `run-desktop.sh`

Every MCP server must be registered in `run-desktop.sh` so it starts automatically. The script manages the full desktop environment lifecycle.

### Startup Block Pattern

Find the section where `mcp-server.js` is launched and replicate the pattern for any new server:

```bash
# ---- Kill any stale process on the port first ----
echo "🔧 Starting MCP Tool Server..."
fuser -k 9099/tcp 2>/dev/null || true   # Prevent EADDRINUSE crashes on restart
sleep 0.5

# ---- Inject required env vars and launch in the background ----
LITELLM_API_BASE=http://localhost:8080/v1 \
  LITELLM_MASTER_KEY=sk-litellm-key \
  node apps/api/dist/src/mcp-server.js &
```

### Service Endpoints Printout

Update the console endpoint table near the bottom of `run-desktop.sh` so the URL is always visible on startup:

```bash
echo "  EVAIX MCP Tools  → http://localhost:9099/sse"
echo ""
echo "  📡 OpenWebUI MCP Server URL: http://host.docker.internal:9099/sse"
echo "     Admin Panel → Settings → Connections → MCP Servers → + → paste ↑"
```

---

## 4. OpenWebUI UI Configuration

Navigate to **Admin Panel → Settings → Connections → MCP Servers → `+` (Add)**

| Field       | Value                                           | Notes                                           |
|-------------|--------------------------------------------------|-------------------------------------------------|
| **Type**    | `MCP Streamable HTTP`                           | NOT "OpenAPI" — that is a different protocol   |
| **URL**     | `http://host.docker.internal:9099/sse`          | Paste the raw URL — no Markdown formatting      |
| **Auth**    | `None`                                          | Unless your Express app adds auth middleware    |

> **Tool Discovery is automatic.** You do NOT need to manually enter tool names like `ask_architect`. Once the connection succeeds, OpenWebUI queries the MCP server for its full tool list automatically via the MCP protocol handshake.

---

## 5. Debugging Checklist

If the connection fails, run through these checks in order:

### Step 1 — Is the server actually running and bound to `0.0.0.0`?
```bash
ss -tulpn | grep 9099
# Expected output: tcp LISTEN 0.0.0.0:9099
```

### Step 2 — Can the OpenWebUI container reach the host?
```bash
podman exec evaix_openwebui curl -m 3 -s -I http://host.docker.internal:9099/sse
# Expected: HTTP/1.1 200 OK with Content-Type: text/event-stream
```

### Step 3 — Does the server respond to a local curl?
```bash
# Run on host — should stream indefinitely (Ctrl+C to stop)
curl -v http://localhost:9099/sse
# Expected header: Content-Type: text/event-stream
```

### Step 4 — Check OpenWebUI container logs for the exact error
```bash
podman logs --tail 30 evaix_openwebui
# Look for: "HTTP Request: POST http://host.docker.internal:9099/sse"
# 404 → wrong transport (legacy SSE) or wrong URL
# 400 → session ID mismatch; ensure sessionIdGenerator: undefined
# Connection refused → server bound to localhost only, not 0.0.0.0
# Unknown host → extra_hosts not set in docker-compose.db.yml
```

---

## 6. Registering Additional Tools

To expose a new Mastra agent or function as an MCP tool, add it to `apps/api/src/mcp-server.ts` before `mcpServer.server.connect(transport)`:

```typescript
mcpServer.tool(
  'tool_name_snake_case',          // The identifier OpenWebUI will call
  'Plain English description.',    // Shown to the LLM for tool selection
  {
    param_one: z.string().describe('What this input is.'),
    param_two: z.number().optional().describe('Optional numeric setting.'),
  },
  async ({ param_one, param_two }) => {
    const result = await myAgent.generate(param_one);
    return {
      content: [{ type: 'text', text: result.text }]
    };
  }
);
```

Then **rebuild and restart**:
```bash
pnpm --filter api build
fuser -k 9099/tcp && node apps/api/dist/src/mcp-server.js &
```
