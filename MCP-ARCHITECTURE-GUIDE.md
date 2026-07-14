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

---

## 7. The OpenWebUI Python Bridge (Native Integration)

Due to OpenWebUI's aggressive caching and its "One Tool Dump" behavior with standard MCP servers, EVAIX implements a **Python Bridge** to achieve seamless, granular tool execution.

### How It Works
Instead of relying strictly on OpenWebUI's MCP client, EVAIX dynamically generates native OpenWebUI Python tools and injects them directly into OpenWebUI's backend SQLite database (`webui.db`).

1. **The Endpoint:** The Express API (`apps/api/src/routers/openwebui-bridge.router.ts`) listens on `/api/v1/bridge/invoke`. This endpoint securely handles the execution of any Mastra primitive tool or dynamically created agent role.
2. **The Generator:** When the API starts or when the FileWatcher (`apps/api/src/services/FileWatcherService.ts`) detects a change in the `data/agents/` folder, it triggers `apps/api/src/services/PythonBridgeGenerator.ts`.
3. **The Injection:** The generator translates the TypeScript schemas into OpenWebUI-compatible JSON `specs`, wraps them in a Python HTTP proxy script, and executes a SQLite transaction directly against the mounted Docker volume to update OpenWebUI's database instantly.

### Files Involved
- `apps/api/src/routers/openwebui-bridge.router.ts` (API execution endpoint)
- `apps/api/src/services/PythonBridgeGenerator.ts` (Code generator and DB injector)
- `apps/api/src/mcp-server.ts` (Contains the FileWatcher that triggers the sync)

---

## 8. Granular Tool Grouping & Database Sync

We have fully implemented granular, individual tool mapping. Instead of grouping all tools into a single `evaix_bridge` integration block, they are now registered as separate tools in the `tool` table in SQLite.

### How It Works:
1. **Dynamic Splitting:** The `PythonBridgeGenerator.ts` processes each tool from `AVAILABLE_MASTRA_TOOLS` and each agent from `data/agents/` separately. It compiles an individual Python script string and a separate Zod-to-JSON `spec` signature for each.
2. **Atomic Injections & Pruning:** During database sync, the generator:
   - Deletes any old tools starting with `evaix_` (including the legacy `evaix_bridge`) that are no longer present in the active tools/agents registry.
   - Inserts or updates the individual rows (e.g., `evaix_tool_web_search`, `evaix_agent_planning_coordinator`).
3. **OpenWebUI Display:** OpenWebUI parses each row separately. When you open the `+ Tools` menu inside OpenWebUI, you will see each tool (like `EVAIX Tool: Web Search`, `EVAIX Tool: Terminal Execute`) and agent (like `EVAIX Agent: Planning Coordinator`) listed as independent, toggleable options.

---

## 9. Path Resolution & Stateless HTTP Transport Updates (Recent Refactor)

To ensure high reliability, eliminate path-nesting hallucinations, and avoid connection handshake errors in OpenWebUI, the following improvements have been made:

### 1. Deterministic Path Resolution
We replaced all usages of `process.cwd()` in paths that require directory indexing or VFS storage. Paths are now resolved relative to the active file's physical disk location:
- **How it works:** We import `fileURLToPath` from `'url'` / `'node:url'` and retrieve `__dirname` using `path.dirname(fileURLToPath(import.meta.url))`.
- **Workspace/Monorepo Root:** We dynamically walk up the directory tree starting from `__dirname` to find the directory containing `pnpm-workspace.yaml`.
- **Services Updated:**
  - `vector.service.ts`
  - `PythonBridgeGenerator.ts`
  - `FileWatcherService.ts`
  - `IntentRegistryManager.ts`
  - `MastraRoleArchitect.ts`
  - `mcp-server.ts`

### 2. Stateless Streamable HTTP Transport
OpenWebUI executes MCP handshakes and tools/list requests across stateless, independent POST sessions.
- **Implementation:** The legacy `SSEServerTransport` is completely replaced by `StreamableHTTPServerTransport` imported from `@modelcontextprotocol/sdk/server/streamableHttp.js`.
- **Configuration:** It is initialized with `{ sessionIdGenerator: undefined }` to run in strict stateless mode.
- **Routing:** Both the stream initialization and tool execution requests are bound to the exact same `/sse` endpoint:
  ```typescript
  app.all("/sse", async (req, res) => {
    await sharedTransport.handleRequest(req, res, req.body);
  });
  ```
- **Port Binding:** The Express server is bound to `0.0.0.0` so that the Podman container loopback connects flawlessly without connection-refused errors.

---

## 10. Agent Execution & Model Forwarding

To ensure reliability during complex agentic workflows and to maintain model consistency across the stack, we enforce strict execution and routing rules:

### 1. Mastra `maxSteps` Call Limits
Mastra agents require an explicit `maxSteps` parameter during execution. If omitted or set too low (e.g., single-turn default), agents utilizing tools may silently fail or return empty strings when the workflow demands multi-step reasoning or tool callbacks.
- **Implementation:** The agent execution loop is standardized with a minimum of `{ maxSteps: 10 }`. This guarantees the agent has sufficient internal loops to query a tool, evaluate the result, and formulate a final answer without abrupt termination.

### 2. Model Context Forwarding (Python Bridge)
To prevent the backend from defaulting to an incorrect fallback model (which can cause deserialization errors like the `xai/grok-4.5` enum crash), the Python Bridge dynamically forwards the active UI model to the backend.
- **Implementation:** When OpenWebUI executes a tool or agent via the Python Bridge, the bridge extracts the active model string from OpenWebUI's internal payload.
- **Execution:** This model string is passed in the JSON payload to the `/api/v1/bridge/invoke` endpoint. The Express router then explicitly overrides the execution context, ensuring the Mastra Agent executes its sub-prompts using the exact same LLM selected by the user in the ModelBar.


