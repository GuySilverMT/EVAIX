import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { pathToFileURL } from "node:url";
import { z } from "zod";

// ── Tool imports ──────────────────────────────────────────────────────────────
import { roleArchitectAgent } from "./services/MastraRoleArchitect.js";
import { searchMastraDocsTool } from "./mcp-mastra-docs.js";
import { fsTools } from "./tools/filesystem.js";
import { terminalTools } from "./tools/terminal.js";
import { typescriptInterpreterTool } from "./tools/typescriptInterpreter.js";
import { searchCodebaseTool } from "./tools/search.js";
import { fetchPageAsMarkdown } from "./tools/webScraper.js";
import { browserTools } from "./tools/browser.js";
import { themeEditorTool } from "./tools/themeEditor.js";
import { eventBus } from "./utils/events.js";
import { McpToolSyncService } from "./services/McpToolSyncService.js";
import {
  scheduleAgentJob,
  listScheduledJobs,
  deleteScheduledJob,
  reloadSchedulerDaemon,
} from "./tools/schedulerTools.js";

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

  // ── Tool registrations ──────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════
// AGENT TOOLS
// ═════════════════════════════════════════════════════════════════════════════

mcpServer.tool(
  "search_mastra_docs",
  "Query Mastra documentation for syntax, workflow configurations, and tool integrations.",
  { query: z.string().describe("The search query for Mastra documentation.") },
  async ({ query }) => {
    const result = await searchMastraDocsTool.execute({ query }, {} as any);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  },
);

mcpServer.tool(
  "ask_evaix_role_architect",
  "Ask the EVAIX Role Architect Mastra agent to design or generate a new Mastra agent, workflow, or tool.",
  {
    prompt: z.string().describe("The task description for the architect."),
    project_type: z
      .string()
      .describe(
        'The project type (e.g., "Frontend WebNode", "Backend MCP Server", "Mastra Agent").',
      ),
  },
  async ({ prompt, project_type }) => {
    try {
      const response = await roleArchitectAgent.generate(
        `Project Type: ${project_type}\n\nTask: ${prompt}`,
      );
      return { content: [{ type: "text", text: response.text }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// FILESYSTEM TOOLS
// ═════════════════════════════════════════════════════════════════════════════

mcpServer.tool(
  "fs_read_file",
  "Read the full contents of a file. Path is relative to the EVAIX repo root. Use fs_list_files first to confirm the path exists.",
  {
    path: z
      .string()
      .describe('Relative file path, e.g. "apps/api/src/mcp-server.ts"'),
  },
  async ({ path }) => {
    try {
      const content = await fsTools.readFile({ path });
      return { content: [{ type: "text", text: content }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  },
);

mcpServer.tool(
  "fs_list_files",
  "List files and directories in a directory. Path is relative to the EVAIX repo root.",
  {
    path: z
      .string()
      .describe('Relative directory path, e.g. "apps/api/src/tools"'),
  },
  async ({ path }) => {
    try {
      const entries = await fsTools.listFiles({ path });
      const text = entries
        .map((e) => `${e.isDir ? "[DIR] " : "[FILE]"} ${e.name}`)
        .join("\n");
      return { content: [{ type: "text", text: text || "(empty directory)" }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  },
);

mcpServer.tool(
  "fs_write_file",
  "Create a NEW file. FAILS if the file already exists — use fs_patch_file to modify existing files. Creates parent directories automatically.",
  {
    path: z.string().describe("Relative path for the new file."),
    content: z.string().describe("The full content to write."),
  },
  async ({ path, content }) => {
    try {
      await fsTools.writeFile({ path, content });
      return { content: [{ type: "text", text: `✅ File created: ${path}` }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  },
);

mcpServer.tool(
  "fs_patch_file",
  "Surgically replace a specific block of text in an EXISTING file. Find the exact text to replace using fs_read_file first. The search_string must be unique within the file.",
  {
    path: z.string().describe("Relative path to the file to patch."),
    search_string: z
      .string()
      .describe(
        "The exact text block to find and replace. Must be unique in the file.",
      ),
    replace_string: z.string().describe("The replacement text."),
  },
  async ({ path, search_string, replace_string }) => {
    try {
      await fsTools.patchFile({ path, search_string, replace_string });
      return {
        content: [{ type: "text", text: `✅ Patch applied to: ${path}` }],
      };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  },
);

mcpServer.tool(
  "fs_context_fetch",
  "Tail the last N lines of a file or card log. Useful for reading long logs without loading the entire file.",
  {
    file_path: z.string().describe("Relative path to the file to tail."),
    lines: z
      .number()
      .optional()
      .describe("Number of lines to return from the end (default: 100)."),
  },
  async ({ file_path, lines = 100 }) => {
    try {
      const content = await fsTools.readFile({ path: file_path });
      const all = content.split("\n");
      return {
        content: [{ type: "text", text: all.slice(-lines).join("\n") }],
      };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// TERMINAL & CODE EXECUTION
// ═════════════════════════════════════════════════════════════════════════════

mcpServer.tool(
  "terminal_execute",
  terminalTools.execute.description,
  {
    command: z
      .string()
      .describe("The bash command to execute. Runs in the EVAIX repo root."),
    cwd: z
      .string()
      .optional()
      .describe("Optional working directory relative to the repo root."),
  },
  async ({ command, cwd }) => {
    const result = await terminalTools.execute.handler({ command, cwd });
    const parts: string[] = [`Status: ${result.status}`];
    if (result.stdout) parts.push(`Stdout:\n${result.stdout}`);
    if (result.stderr) parts.push(`Stderr:\n${result.stderr}`);
    return { content: [{ type: "text", text: parts.join("\n\n") }] };
  },
);

mcpServer.tool(
  "git_execute",
  "Run git commands in the EVAIX repository. Use this for git status, log, diff, commit, branch, stash, etc. The CWD is automatically set to the repo root.",
  {
    subcommand: z
      .string()
      .describe(
        'The git subcommand and args, e.g. "status", "log --oneline -10", "diff HEAD~1", "add -A && git commit -m \'message\'"',
      ),
  },
  async ({ subcommand }) => {
    const result = await terminalTools.execute.handler({
      command: `git ${subcommand}`,
      cwd: process.cwd(),
    });
    const parts: string[] = [
      `git ${subcommand}\n---`,
      `Status: ${result.status}`,
    ];
    if (result.stdout) parts.push(result.stdout);
    if (result.stderr) parts.push(`Stderr: ${result.stderr}`);
    return { content: [{ type: "text", text: parts.join("\n") }] };
  },
);

mcpServer.tool(
  "typescript_interpreter",
  `⚡ NEBULA CODE MODE: Execute raw TypeScript code inside the EVAIX runtime via tsx.

RULES:
1. Code MUST end with console.log() — this is how you see output.
2. Globals available: nebula (UI tree), ast (JSX parsing), tree (read-only state), patch (file patcher).
3. All installed packages from the monorepo are importable.
4. Default timeout is 30s. Max is 60s.`,
  {
    code: z
      .string()
      .describe(
        "TypeScript code to execute. Must end with console.log() to produce visible output.",
      ),
    timeout: z
      .number()
      .optional()
      .describe("Timeout in ms (default: 30000, max: 60000)."),
  },
  async ({ code, timeout }) => {
    const result = await typescriptInterpreterTool.handler({ code, timeout });
    const arr = Array.isArray(result) ? result : [result];
    const text = arr.map((r: any) => r?.text ?? JSON.stringify(r)).join("\n");
    return { content: [{ type: "text", text }] };
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// SEARCH TOOLS
// ═════════════════════════════════════════════════════════════════════════════

mcpServer.tool(
  "search_codebase",
  "Semantic vector search over the EVAIX codebase. Use this to find relevant code without knowing the exact file path.",
  {
    query: z
      .string()
      .describe(
        'Natural language query, e.g. "how does the scheduler store cron jobs"',
      ),
    limit: z.number().optional().describe("Max results (default: 5)"),
  },
  async ({ query, limit }) => {
    try {
      const result = await searchCodebaseTool.handler({ query, limit });
      const text = Array.isArray(result) ? result.join("\n") : String(result);
      return { content: [{ type: "text", text }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  },
);

mcpServer.tool(
  "grep_codebase",
  "Search for an exact string or pattern across the entire EVAIX codebase using grep. Faster than semantic search for known terms.",
  {
    pattern: z
      .string()
      .describe("The exact string or regex pattern to search for."),
    path: z
      .string()
      .optional()
      .describe(
        "Limit search to this relative path/directory (default: entire repo).",
      ),
    case_insensitive: z
      .boolean()
      .optional()
      .describe("Case-insensitive search (default: false)."),
  },
  async ({ pattern, path, case_insensitive }) => {
    const flags = case_insensitive ? "-ri" : "-r";
    const target = path || ".";
    const result = await terminalTools.execute.handler({
      command: `grep ${flags} --include="*.ts" --include="*.tsx" --include="*.js" -n "${pattern}" ${target} | head -50`,
      cwd: process.cwd(),
    });
    const text = result.stdout || result.stderr || "(no matches)";
    return { content: [{ type: "text", text }] };
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// WEB TOOLS
// ═════════════════════════════════════════════════════════════════════════════

mcpServer.tool(
  "web_scrape",
  "Fetch a public URL using a full Chromium browser and return the content as clean Markdown. Best for JS-rendered pages, documentation, and articles. Strips ads, nav, and boilerplate.",
  {
    url: z.string().url().describe("The fully qualified URL to fetch."),
    timeoutMs: z
      .number()
      .optional()
      .describe("Request timeout in ms (default: 30000)."),
  },
  async ({ url, timeoutMs }) => {
    try {
      const result = await fetchPageAsMarkdown({ url, timeoutMs });
      if (!result.success)
        return {
          content: [
            {
              type: "text",
              text: `Error scraping ${url}: ${(result as any).error}`,
            },
          ],
        };
      return {
        content: [
          {
            type: "text",
            text: `# ${result.title}\nURL: ${result.url}\n\n${result.markdown}`,
          },
        ],
      };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  },
);

mcpServer.tool(
  "web_fetch",
  "Fetch a URL using simple HTTP (no JavaScript rendering). Faster than web_scrape but may miss dynamically rendered content. Returns plain text.",
  {
    url: z.string().url().describe("The URL to fetch."),
  },
  async ({ url }) => {
    try {
      const result = await browserTools.fetchPage({ url });
      return {
        content: [
          { type: "text", text: `# ${result.title}\n\n${result.content}` },
        ],
      };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// UI TOOLS
// ═════════════════════════════════════════════════════════════════════════════

mcpServer.tool(
  "ui_update_theme",
  "Update a single CSS-level design token in the EVAIX UI theme.json file. Changes take effect immediately in the live UI (hot-reload). Use this to change colors, fonts, spacing, etc.",
  {
    key: z
      .string()
      .describe(
        'The theme variable key to update, e.g. "color-primary" or "font-family-body".',
      ),
    value: z
      .string()
      .describe('The new value to set, e.g. "#FF0000" or "Inter, sans-serif".'),
  },
  async ({ key, value }) => {
    try {
      const result = await themeEditorTool.handler({ key, value });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// SCHEDULER TOOLS
// ═════════════════════════════════════════════════════════════════════════════

mcpServer.tool(
  "scheduler_list_jobs",
  "Return all scheduled calendar events and automation jobs from the EVAIX scheduler.json file.",
  {},
  async () => {
    try {
      const result = await listScheduledJobs.execute();
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  },
);

mcpServer.tool(
  "scheduler_add_job",
  "Add a new calendar event or cron automation job to the EVAIX scheduler. Supports both plain calendar blocks and agent automation via cron expressions.",
  {
    id: z.string().describe("Unique job ID (use a UUID or slug)."),
    title: z.string().describe("Display title shown on the calendar."),
    start: z
      .string()
      .describe('ISO 8601 start datetime, e.g. "2026-07-15T09:00:00Z".'),
    end: z.string().describe("ISO 8601 end datetime."),
    cron: z
      .string()
      .optional()
      .describe(
        'Cron expression for repeating automations, e.g. "0 8 * * 5" (every Friday at 8am).',
      ),
    agent: z
      .string()
      .optional()
      .describe(
        "Agent name to execute when cron fires (required when cron is set).",
      ),
    action: z.string().optional().describe("Action the agent should take."),
    prompt: z.string().optional().describe("Prompt to send to the agent."),
  },
  async ({ id, title, start, end, cron, agent, action, prompt }) => {
    try {
      const job: any = { id, title, start, end };
      if (cron) job.cron = cron;
      if (agent || action)
        job.automationPayload = {
          agent: agent || "",
          action: action || "",
          prompt,
        };
      const result = await scheduleAgentJob.execute(job);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  },
);

mcpServer.tool(
  "scheduler_delete_job",
  "Remove a scheduled event or automation from the EVAIX calendar by its job ID.",
  { id: z.string().describe("The job ID to delete.") },
  async ({ id }) => {
    try {
      const result = await deleteScheduledJob.execute({ id });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  },
);

mcpServer.tool(
  "scheduler_reload",
  "Force the EVAIX cron daemon to reload from scheduler.json. Use this after manually editing the scheduler file.",
  {},
  async () => {
    try {
      const result = await reloadSchedulerDaemon.execute();
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// GOOGLE JULES TOOLS (conditional — only registered if API key is present)
// ═════════════════════════════════════════════════════════════════════════════

if (process.env.JULES_API_KEY || process.env.GOOGLE_JULES_API_KEY) {
  const { julesTools } = await import("./tools/jules_tools.js");
  const julesMap: Record<string, string> = {
    jules_create_session:
      "Dispatch a massive async coding task to Google Jules AI. Jules will create a GitHub PR with its changes.",
    jules_check_status:
      "Check the status and activity log of a running Google Jules coding session.",
    jules_approve_plan:
      "Approve the coding plan generated by a Google Jules session so it can proceed.",
    jules_send_feedback:
      "Send follow-up instructions or corrections to a running Google Jules session.",
  };

  for (const tool of julesTools) {
    const schema = tool.inputSchema as any;
    const props = schema?.properties || {};
    const zodShape: Record<string, z.ZodTypeAny> = {};
    for (const [k, v] of Object.entries(props as Record<string, any>)) {
      zodShape[k] =
        v.type === "boolean"
          ? z
              .boolean()
              .optional()
              .describe(v.description || "")
          : z
              .string()
              .optional()
              .describe(v.description || "");
    }

    mcpServer.tool(
      tool.name,
      julesMap[tool.name] || tool.description,
      zodShape,
      async (args) => {
        try {
          const result = await tool.handler(args as any);
          return {
            content: [
              {
                type: "text",
                text:
                  typeof result === "string"
                    ? result
                    : JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (e: any) {
          return { content: [{ type: "text", text: `Error: ${e.message}` }] };
        }
      },
    );
  }
  console.log(
    "[MCP Server] ✅ Google Jules tools registered (JULES_API_KEY found).",
  );
} else {
  console.log(
    "[MCP Server] ⏭️  Google Jules tools skipped (no JULES_API_KEY env var).",
  );
}

  return mcpServer;
}

export async function startMcpServer(
  options: { host?: string; port?: number } = {},
) {
  const host = options.host ?? "0.0.0.0";
  const port = options.port ?? 9099;

  // Stateless Streamable HTTP endpoint.
  // OpenWebUI requires a single, stateless endpoint where BOTH the stream
  // initialization (GET) and tool-execution messages (POST) hit the SAME route.
  // sessionIdGenerator: undefined forces the stateless mode OpenWebUI expects.
  app.all("/sse", async (req, res) => {
    try {
      const server = await createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      const handleRoleCreated = async ({ agent_id }: { agent_id: string }) => {
        console.log(`[EventBus] New role detected: ${agent_id}. Syncing...`);
        try {
          await McpToolSyncService.syncAllTools();
          await server.server.sendNotification({ method: 'notifications/tools/list_changed' });
        } catch (err) {
          console.error(`[EventBus] Error syncing tools for new role ${agent_id}:`, err);
        }
      };

      eventBus.on('ROLE_CREATED', handleRoleCreated);

      res.on("close", () => {
        eventBus.off('ROLE_CREATED', handleRoleCreated);
        transport.close();
        void server.close();
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
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
      resolve(listener);
    });
  });
}

// Start the server when this file is executed directly.
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  await startMcpServer();
}
