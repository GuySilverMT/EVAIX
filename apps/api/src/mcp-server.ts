import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { Agent } from "@mastra/core/agent";
import { createOpenAI } from "@ai-sdk/openai";
import { webSearchTool, webScrapeTool } from "./mastra/tools/web.js";
import {
  readFileTool,
  writeFileTool,
  patchFileTool,
  listFilesTool,
  terminalExecuteTool,
  typescriptInterpreterTool,
} from "./mastra/tools/system.js";

// Track which tool names have already been registered so we never double-register
const registeredDynamicTools = new Set<string>();

// Resolve workspace root (searches upward for pnpm-workspace.yaml)
async function findWorkspaceRoot(): Promise<string> {
  let root = process.cwd();
  while (root !== "/" && !(await fs.stat(path.join(root, "pnpm-workspace.yaml")).catch(() => false))) {
    const parent = path.dirname(root);
    if (parent === root) break;
    root = parent;
  }
  return root;
}

export const AVAILABLE_MASTRA_TOOLS: Record<string, any> = {
  web_search: webSearchTool,
  web_scrape: webScrapeTool,
  read_file: readFileTool,
  write_file: writeFileTool,
  patch_file: patchFileTool,
  list_files: listFilesTool,
  terminal_execute: terminalExecuteTool,
  typescript_interpreter: typescriptInterpreterTool,
};

const liteLlmProvider = createOpenAI({
  baseURL: process.env.LITELLM_API_BASE || 'http://localhost:8080/v1',
  apiKey: process.env.LITELLM_MASTER_KEY || 'sk-litellm-key',
});

async function getDynamicModel(defaultFallback: string): Promise<string> {
  try {
    const filePath = '/home/guy/EVAIX/.last_active_model.json';
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    if (data && data.model && (Date.now() - data.timestamp < 300000)) {
      return data.model;
    }
  } catch (e) {
    // Ignore error
  }
  return defaultFallback;
}

// Registers a single agent file as an MCP tool on the given server.
// Safe to call at startup OR at hot-reload time — skips already-registered tools.
async function registerAgentTool(mcpServer: McpServer, filePath: string): Promise<string | null> {
  try {
    const file = path.basename(filePath);
    if (!file.endsWith('.md') && !file.endsWith('.json')) return null;

    const content = await fs.readFile(filePath, "utf-8");
    let name = "";
    let instructions = "";
    let model = process.env.DEFAULT_AGENT_MODEL || "gpt-4o";
    let toolsList: string[] = [];

    if (file.endsWith('.md')) {
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      let frontmatter: any = {};
      if (match) {
        try { frontmatter = yaml.load(match[1]); }
        catch (e) { console.error(`[MCP Server] YAML parse error in ${file}:`, e); }
      }
      name = frontmatter.name || file.replace(".md", "");
      instructions = frontmatter.instructions || content.replace(/^---\n[\s\S]*?\n---/, "").trim();
      model = frontmatter.model || model;
      if (Array.isArray(frontmatter.tools)) {
        toolsList = frontmatter.tools;
      }
    } else {
      try {
        const parsed = JSON.parse(content);
        name = parsed.name || file.replace(".json", "");
        instructions = parsed.instructions || "";
        model = parsed.model || model;
        if (Array.isArray(parsed.tools)) {
          toolsList = parsed.tools;
        }
      } catch (e) { console.error(`[MCP Server] JSON parse error in ${file}:`, e); }
    }

    if (!name) return null;

    const agentId = name.toLowerCase().replace(/[^a-z0-9-_]/g, "_");
    const toolName = `invoke_${agentId}`;

    // Skip if already registered (idempotent — safe to call on every file-change event)
    if (registeredDynamicTools.has(toolName)) {
      console.log(`[MCP Server] Tool '${toolName}' already registered, skipping.`);
      return null;
    }

    const capturedName = name;
    const capturedInstructions = instructions;
    const capturedModel = model;

    // Cast to any to bypass SDK overload mismatch between 1.22 and 1.29
    (mcpServer as any).tool(
      toolName,
      `Invoke the "${capturedName}" agent. ${capturedInstructions.slice(0, 120)}...`,
      { prompt: z.string().describe(`The task or question for the ${capturedName} agent.`) },
      async ({ prompt }: { prompt: string }) => {
        try {
          const toolsObject: Record<string, any> = {};
          if (toolsList && toolsList.length > 0) {
            for (const toolId of toolsList) {
              if (AVAILABLE_MASTRA_TOOLS[toolId]) {
                toolsObject[toolId] = AVAILABLE_MASTRA_TOOLS[toolId];
              }
            }
          } else {
            // Default to all tools if none specified in the role configuration
            Object.assign(toolsObject, AVAILABLE_MASTRA_TOOLS);
          }

          const resolvedModel = await getDynamicModel(capturedModel);
          const dynamicAgent = new Agent({
            id: agentId,
            name: capturedName,
            instructions: capturedInstructions,
            model: liteLlmProvider.chat(resolvedModel),
            tools: toolsObject
          });
          const response = await dynamicAgent.generate(prompt);
          return { content: [{ type: "text" as const, text: response.text }] };
        } catch (e: any) {
          return { content: [{ type: "text" as const, text: `Error executing ${capturedName}: ${e.message}` }] };
        }
      }
    );

    registeredDynamicTools.add(toolName);
    console.log(`[MCP Server] ✅ Registered dynamic tool: ${toolName}`);
    return toolName;
  } catch (err) {
    console.error(`[MCP Server] Failed to register agent from ${filePath}:`, err);
    return null;
  }
}

// Load all existing agent files from the agents directory at startup
async function loadDynamicAgentTools(mcpServer: McpServer) {
  try {
    const root = await findWorkspaceRoot();
    const agentsDir = path.join(root, "apps/api/data/agents");
    await fs.mkdir(agentsDir, { recursive: true });
    const files = await fs.readdir(agentsDir);
    for (const file of files) {
      await registerAgentTool(mcpServer, path.join(agentsDir, file));
    }
  } catch (err) {
    console.error("[MCP Server] Failed to load dynamic agent tools:", err);
  }
}

// ── Imports: only what the public MCP server needs ───────────────────────────
// System tools (fs, terminal, web, scheduler) are available to Mastra agents
// internally but are NOT exposed to OpenWebUI — that would dump everything on
// every LLM turn. Only agent-invocation tools are public here.
import { roleArchitectAgent } from "./services/MastraRoleArchitect.js";
import { eventBus } from "./utils/events.js";
import { McpToolSyncService } from "./services/McpToolSyncService.js";

// ── Express setup ─────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// ── MCP Server (factory — a fresh instance per request for stateless mode) ────
async function createMcpServer(): Promise<McpServer> {
  const mcpServer = new McpServer({
    name: "evaix-mcp-server",
    version: "3.0.0",
  });
  // Alias to bypass SDK 1.22/1.29 overload mismatch — runtime is correct
  const mcp = mcpServer as any;

  // ── Tool registrations ──────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════
// AGENT INVOCATION TOOLS — the only tools exposed to OpenWebUI
// ═════════════════════════════════════════════════════════════════════════════

mcp.tool(
  "ask_role_architect",
  "Ask the EVAIX Role Architect agent to design, scaffold, or modify an agent role. Describe the agent you want and it will generate the configuration.",
  { prompt: z.string().describe("What kind of agent role to create or what change to make.") },
  async ({ prompt }: { prompt: string }) => {
    try {
      const resolvedModel = await getDynamicModel(process.env.DEFAULT_AGENT_MODEL || 'xai/grok-3');
      console.log(`[MCP Server] Dynamically routing ask_role_architect execution to LLM model: ${resolvedModel}`);
      const agentToRun = (roleArchitectAgent as any).__fork();
      (agentToRun as any).__updateModel({ model: liteLlmProvider.chat(resolvedModel) });
      const response = await agentToRun.generate(prompt);
      return { content: [{ type: "text" as const, text: response.text }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
    }
  },
);
// ═════════════════════════════════════════════════════════════════════════════
// PRIMITIVE TOOLS — Exposed to OpenWebUI for direct utilization and Custom Models
// ═════════════════════════════════════════════════════════════════════════════

Object.values(AVAILABLE_MASTRA_TOOLS).forEach((t: any) => {
  mcp.tool(
    t.id,
    t.description,
    t.inputSchema,
    async (args: any) => {
      try {
        const result = await t.execute(args);
        return { content: [{ type: "text" as const, text: typeof result === 'string' ? result : JSON.stringify(result) }] };
      } catch (e: any) {
        return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
      }
    }
  );
});

  await loadDynamicAgentTools(mcpServer);

  return mcpServer;
}

async function generateAgentRegistry() {
  try {
    let root = process.cwd();
    while (root !== "/" && !(await fs.stat(path.join(root, "pnpm-workspace.yaml")).catch(() => false))) {
      const parent = path.dirname(root);
      if (parent === root) break;
      root = parent;
    }

    const agentsDir = path.join(root, "apps/api/data/agents");
    const files = await fs.readdir(agentsDir);

    const rows = [
      "# Agent Registry",
      "",
      "| ID | Version | Model | Tools | Last Updated |",
      "|---|---|---|---|---|"
    ];

    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const filePath = path.join(agentsDir, file);
      const content = await fs.readFile(filePath, "utf-8");
      const stat = await fs.stat(filePath);

      const match = content.match(/^---\n([\s\S]*?)\n---/);
      let frontmatter: any = {};
      if (match) {
        frontmatter = yaml.load(match[1]);
      }

      const id = frontmatter.name || file.replace(".md", "");
      const version = frontmatter.version || "-";
      const model = frontmatter.model || "-";
      const tools = frontmatter.tools || "-";
      const lastUpdated = stat.mtime.toISOString().split("T")[0];

      rows.push(`| ${id} | ${version} | ${model} | ${tools} | ${lastUpdated} |`);
    }

    const registryPath = path.join(root, "AGENT_REGISTRY.md");
    await fs.writeFile(registryPath, rows.join("\n"), "utf-8");
    console.log("[EventBus] Successfully updated AGENT_REGISTRY.md");
  } catch (err) {
    console.error("[EventBus] Failed to generate agent registry:", err);
  }
}

export async function startMcpServer(
  options: { host?: string; port?: number } = {},
) {
  const host = options.host ?? "0.0.0.0";
  const port = options.port ?? 9099;

  // Create ONE shared server + transport at startup.
  // OpenWebUI sends initialize and tools/list as separate stateless POSTs.
  // If we create a new McpServer per request, tools/list hits a cold instance
  // that was never connected and returns nothing — exactly the bug we were seeing.
  console.log("[MCP Server] Initializing shared server instance...");
  const sharedServer = await createMcpServer();
  const sharedTransport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless mode — no session cookies
  });
  await sharedServer.connect(sharedTransport);
  console.log("[MCP Server] Shared server connected and ready.");

  // ── File Watcher: hot-register new agent roles without restarting ─────────
  // When a new .md or .json file appears in data/agents/, we:
  //   1. Call registerAgentTool() on the SAME sharedServer OpenWebUI is connected to
  //   2. Send notifications/tools/list_changed — OpenWebUI re-fetches tools instantly
  // No disconnect/reconnect needed. Zero downtime.
  const agentsDir = path.join(await findWorkspaceRoot(), "apps/api/data/agents");
  const watcher = await fs.watch(agentsDir, { persistent: false });
  (async () => {
    for await (const event of watcher) {
      if (!event.filename) continue;
      const filePath = path.join(agentsDir, event.filename);
      // Small debounce: wait for the file to finish writing
      await new Promise(r => setTimeout(r, 300));
      console.log(`[FileWatcher] Detected: ${event.filename} (${event.eventType})`);
      try {
        const newTool = await registerAgentTool(sharedServer, filePath);
        if (newTool || event.eventType === 'rename') {
          // Notify all connected MCP clients to re-fetch the tools list
          await sharedServer.server.notification({ method: 'notifications/tools/list_changed' });
          console.log(`[FileWatcher] ✅ '${newTool || filePath}' is now live in OpenWebUI — no reconnect needed.`);
          
          // Also sync the Python bridge to ensure OpenWebUI native tools are up to date
          const { syncOpenWebUIBridge } = await import('./services/PythonBridgeGenerator.js');
          await syncOpenWebUIBridge();
        }
      } catch (err) {
        console.error(`[FileWatcher] Error registering tool from ${event.filename}:`, err);
      }
    }
  })().catch(err => console.error('[FileWatcher] Watcher crashed:', err));
  console.log(`[FileWatcher] Watching ${agentsDir} for new agent roles...`);

  // Also keep the eventBus handler for compatibility with McpToolSyncService
  eventBus.on('ROLE_CREATED', async ({ agent_id }: { agent_id: string }) => {
    console.log(`[EventBus] ROLE_CREATED for ${agent_id} — generating registry...`);
    try {
      await generateAgentRegistry();
    } catch (err) {
      console.error(`[EventBus] Registry generation failed:`, err);
    }
  });

  // All requests (initialize, tools/list, tool calls) hit the same shared transport
  app.all("/sse", async (req, res) => {
    try {
      await sharedTransport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("[MCP Server] Request handling error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  return new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const listener = app.listen(port, host, () => {
      console.log(`[MCP Server] ready at http://${host}:${port}/sse`);
      
      // Trigger initial Python Bridge sync
      import('./services/PythonBridgeGenerator.js').then(({ syncOpenWebUIBridge }) => {
        syncOpenWebUIBridge().catch(err => console.error('[MCP Server] Failed to trigger initial Python Bridge sync:', err));
      });
      
      resolve(listener);
    });
  });
}

// Start the server when this file is executed directly.
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  await startMcpServer();
}
