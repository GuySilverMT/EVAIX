# MCP Server Registration & Integration Procedure

This document outlines the standard procedure for installing, configuring, and verifying new Model Context Protocol (MCP) servers in the **DoMoreAI** architecture.

## 🏗️ Architecture Overview

When a new MCP server is added, it must pass through several layers to become available to an AI Agent:

1.  **Registry (`RegistryClient.ts`)**: Defines the server's executable command, arguments, and environment.
2.  **Orchestrator (`McpOrchestrator.ts`)**: Manages the runtime connection (Stdio/HTTP) to the server.
3.  **Documentation (`ToolDocumenter.ts`)**: Automatically inspects the running server and generates:
    *   Type Definitions (`.d.ts`)
    *   Rich Usage Examples with LLM-generated code (`_examples.md`).
    *   Saved to `.domoreai/tools/`.
4.  **Synchronization (`McpToolSyncService.ts`)**: Scans all tools and registers them in the **Postgres Database** (`Tool` table) with a TypeScript interface instruction.
5.  **Prompt Injection (`PromptFactory.ts`)**: Reads tools from the Database (and optionally file-based docs) and injects them into the AI System Prompt.

---

## 🚀 Step-by-Step Installation Procedure

### 1. Installation / Extraction
*   **Zip File**: Extract the server to `mcp/extracted/<ServerName>`.
*   **Dependencies**: Navigate to the folder and install dependencies:
    *   **Node.js**: `npm install` / `pnpm install` then `npm run build`.
    *   **Python**: `uv venv`, `source .venv/bin/activate`, `pip install .`.
    *   **Go**: `go build`.

### 2. Registration
Update `apps/api/src/services/mcp-registry-client.ts`:

1.  **Add Configuration**: Add an entry to the `getServerConfig` object.
    ```typescript
    'my-new-server': {
      command: '/absolute/path/to/executable', // use absolute paths!
      args: ['--arg1', 'value'],
      env: { 'API_KEY': '...' }
    }
    ```
    *Tip: For Node servers, point to `dist/index.js` or `build/index.js`.*
    *Tip: For Python, use the `.venv/bin/python` or executable.*

2.  **Add to List**: Add the server name and description to `listServers()`.
    ```typescript
    { name: 'my-new-server', description: 'Category: What it does' }
    ```

### 3. Verification & Sync
1.  **Restart the API Server**: The `McpToolSyncService` typically runs on startup or via a scheduled job/trigger.
2.  **Run Manual Sync (Optional)**: If available, run the sync script (e.g., `sync_mcp_tools.ts`).
3.  **Check Logs**: Look for:
    *   `[McpSync] ✅ Synced X tools from my-new-server`
    *   `[ToolDocumenter] Generated documentation for my-new-server`

### 4. Validation
*   **Database**: Check the `Tool` table in Postgres: `SELECT * FROM "Tool" WHERE "serverId" = 'my-new-server';`.
*   **Files**: Check `.domoreai/tools/` for `my-new-server.d.ts` and `my-new-server_examples.md`.
*   **AI Access**: Ask the agent: "What tools do you have for [Category]?"

---

## ⚠️ Common Pitfalls

### Port Conflicts
*   **Recommendation**: Use **Stdio** transport whenever possible. It uses process pipes and requires no ports.
*   **HTTP Mode**: If using HTTP (e.g., `context7`), ensure you explicitly set a port (e.g., `--port 3001`) to avoid conflict with the main Web App (Port 3000) or Vite (Port 5173).

### Redundancy
*   **Check Before Adding**: Check `MCP_SERVER_STATUS.md` and existing tools. Do not add a server that duplicates `read_file` (Filesystem) unless strictly necessary. If you do, rename the server or tools to avoid collision.

### "Zombie" Configs
*   **Cleanup**: If you delete a server folder, **remove** its entry from `RegistryClient.ts`. failing to do so will cause Sync errors (timeout/spawn failures).

---

## 📄 Documentation Files
*   **Status Tracker**: `/home/guy/mono/mcp/MCP_SERVER_STATUS.md`
*   **Registry Code**: `apps/api/src/services/mcp-registry-client.ts`
*   **Sync Service**: `apps/api/src/services/McpToolSyncService.ts`
