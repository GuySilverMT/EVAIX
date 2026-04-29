import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { RegistryClient } from '../services/mcp-registry-client.js';
import { SandboxTool } from '../types.js';
import { searchCodebaseTool } from '../tools/search.js';
import { IMcpOrchestrator } from '../interfaces/IMcpOrchestrator.js';
import { IRegistryClient } from '../interfaces/IRegistryClient.js';

interface ActiveServer {
  client: Client;
  transport: StdioClientTransport;
  lastUsed: number;
}

interface McpToolResult {
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
  error?: unknown;
}

export class McpOrchestrator implements IMcpOrchestrator {
  private activeServers = new Map<string, ActiveServer>();
  private CLEANUP_INTERVAL_MS = 60_000;
  private SHUTDOWN_TIMEOUT = 1000 * 60 * 5; // 5 minutes
  private registryClient: IRegistryClient;

  constructor(registryClient?: IRegistryClient) {
    this.registryClient = registryClient || new RegistryClient();

    // Start cleanup interval
    setInterval(() => { void this.cleanupIdleServers(); }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Prepares the environment by ensuring specific MCP servers are running.
   * @param serverNames List of server names (e.g., 'git', 'postgres') to start.
   */
  async prepareEnvironment(serverNames: string[]) {
    await Promise.all(serverNames.map(name => this.ensureServerRunning(name)));
  }

  /**
   * Returns a list of tools formatted for the AgentRuntime/CodeMode sandbox.
   * Each tool includes a 'handler' that proxies the call to the actual MCP server.
   */
  async getToolsForSandbox(): Promise<SandboxTool[]> {
    const promises = Array.from(this.activeServers.entries()).map(async ([serverName, server]) => {
      try {
        const { tools } = await server.client.listTools();
        return tools.map((tool) => this.formatToolForSandbox(serverName, server, tool));
      } catch (error) {
        console.warn(`[Orchestrator] Failed to fetch tools from ${serverName}:`, error);
        return [];
      }
    });

    const results = await Promise.all(promises);
    const mcpTools = results.flat();

    // Inject Internal Tools
    return [
      ...mcpTools, 
      searchCodebaseTool
    ];
  }

  /**
   * Hot-loads an MCP server and returns the new tools.
   */
  async attachToolToSession(serverName: string): Promise<SandboxTool[]> {
    console.log(`[Orchestrator] JIT-loading server: ${serverName}`);
    await this.ensureServerRunning(serverName);
    
    const server = this.activeServers.get(serverName);
    if (!server) throw new Error(`Failed to activate server: ${serverName}`);

    const { tools } = await server.client.listTools();
    return tools.map((tool) => this.formatToolForSandbox(serverName, server, tool));
  }


  private formatToolForSandbox(serverName: string, server: ActiveServer, tool: { name: string; description?: string; inputSchema: Record<string, unknown> }): SandboxTool {
    const safeName = `${serverName}_${tool.name}`.replace(/-/g, '_');

    return {
      name: safeName,
      description: `\n      [MCP Server: ${serverName}] ${tool.description}\n      @example\n      // Call the tool from code-mode:\n      await ${safeName}({ /* tool arguments here */ });\n      `,
      inputSchema: tool.inputSchema,
      handler: async (args: Record<string, unknown>) => {
        server.lastUsed = Date.now();

        try {
          const result = await server.client.callTool({
            name: tool.name,
            arguments: args,
          });

          // If the MCP protocol returned an application-level error, THROW so generated code's try/catch can handle it
          const mcpResult = result as unknown as McpToolResult;
          if (mcpResult && (mcpResult.isError || mcpResult.error)) {
            console.warn(`[MCP] Tool Logic Error from ${serverName}:${tool.name}:`, result);
            throw new Error(`MCP Tool Error: ${JSON.stringify(mcpResult.content ?? result)}`);
          }

          // Unwrap single text content for convenience
          if (mcpResult && mcpResult.content && Array.isArray(mcpResult.content) && mcpResult.content.length === 1 && mcpResult.content[0].type === 'text') {
            return mcpResult.content[0].text;
          }

          return mcpResult.content ?? result;

        } catch (error: unknown) {
          console.error(`[MCP] Protocol Error calling ${serverName}:${tool.name}:`, error);
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to execute ${safeName}: ${message}`);
        }
      }
    };
  }

  private async ensureServerRunning(serverName: string) {
    if (this.activeServers.has(serverName)) {
      this.activeServers.get(serverName)!.lastUsed = Date.now();
      return;
    }

    console.log(`[Orchestrator] Starting MCP Server: ${serverName}...`);

    try {
      // 1. Get Config
      const config = await this.registryClient.getServerConfig(serverName);

      // 2. Initialize Transport (Stdio)
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: { ...process.env, ...(config.env || {}) } as Record<string, string>,
      });

      // 3. Initialize Client
      const client = new Client(
        { name: "domoreai-orchestrator", version: "1.0.0" },
        { capabilities: {} }
      );

      // 4. Connect
      await client.connect(transport);
      
      this.activeServers.set(serverName, { 
        client, 
        transport, 
        lastUsed: Date.now() 
      });
      
      console.log(`[Orchestrator] Connected to ${serverName}`);

      // Document the server
      // We run this in background so it doesn't block startup
      void import('../services/ToolDocumenter.js').then(({ ToolDocumenter }) => {
        void ToolDocumenter.documentMcpServer(serverName, client).catch((err: unknown) => {
          console.error(`[Orchestrator] Failed to document ${serverName}:`, err);
        });
      });
    } catch (error) {
      console.error(`[Orchestrator] Failed to start server ${serverName}:`, error);
      throw error;
    }
  }

  private async cleanupIdleServers() {
    const now = Date.now();
    for (const [name, server] of this.activeServers.entries()) {
      if (now - server.lastUsed > this.SHUTDOWN_TIMEOUT) {
        console.log(`[Orchestrator] Shutting down idle server: ${name}`);
        try {
          await server.client.close();
        } catch (e) {
          console.error(`[Orchestrator] Error closing client ${name}:`, e);
        } finally {
          this.activeServers.delete(name);
        }
      }
    }
  }

  /**
   * Shuts down all active MCP servers.
   */
  async shutdownAll() {
    console.log(`[Orchestrator] Shutting down all MCP servers...`);
    const shutdownPromises = Array.from(this.activeServers.entries()).map(async ([name, server]) => {
      try {
        console.log(`[Orchestrator] Closing server: ${name}`);
        await server.client.close();
      } catch (e) {
        console.error(`[Orchestrator] Error closing client ${name}:`, e);
      }
    });

    await Promise.all(shutdownPromises);
    this.activeServers.clear();
  }
}

export const mcpOrchestrator = new McpOrchestrator();
