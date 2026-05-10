import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JsonRpcStrategy, CodeModeStrategy } from '../../src/services/tooling/ExecutionStrategies.js';
import { McpOrchestrator } from '../../src/orchestrator/McpOrchestrator.js';
import { IRegistryClient } from '../../src/interfaces/IRegistryClient.js';
import { CodeModeUtcpClient } from "@utcp/code-mode";
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock CodeModeUtcpClient
const mockClient = {
  callTool: vi.fn(),
  callToolChain: vi.fn(),
} as unknown as CodeModeUtcpClient;

// Mock IRegistryClient
const mockRegistry: IRegistryClient = {
  listServers: vi.fn(),
  getServerConfig: vi.fn(),
};

describe('Tooling and MCP Integration', () => {
  
  describe('DETERMINISTIC OUTPUT PARSING', () => {
    const jsonStrategy = new JsonRpcStrategy(mockClient);
    const codeStrategy = new CodeModeStrategy(mockClient);

    it('should extract JSON perfectly from conversational text (Test A)', async () => {
      const sloppyInput = `Certainly! I will call the webScraper tool for you.
\`\`\`json
{
  "tool": "webScraper",
  "args": { "url": "https://example.com" }
}
\`\`\`
I hope this helps!`;

      vi.spyOn(mockClient, 'callTool' as any).mockResolvedValue('Scraped content');

      const result = await jsonStrategy.execute(sloppyInput, {} as any);
      
      expect(mockClient.callTool).toHaveBeenCalledWith('webScraper', { url: "https://example.com" }, expect.anything());
      expect(result.output).toBe('Scraped content');
    });

    it('should extract JSON from raw text without backticks using brace matching', async () => {
      const rawInput = `I will call the tool now: { "tool": "webScraper", "args": { "url": "https://example.com" } } please wait.`;
      
      vi.spyOn(mockClient, 'callTool' as any).mockResolvedValue('Scraped content');

      const result = await jsonStrategy.execute(rawInput, {} as any);
      
      expect(mockClient.callTool).toHaveBeenCalledWith('webScraper', { url: "https://example.com" }, expect.anything());
      expect(result.output).toBe('Scraped content');
    });

    it('should correctly identify and extract typescript strategy (Test B)', async () => {
      const tsInput = `Here is the typescript code:
\`\`\`typescript
const result = await system.webScraper({ url: "https://example.com" });
console.log(result);
\`\`\``;

      vi.spyOn(mockClient, 'callToolChain' as any).mockResolvedValue({ result: 'Success', logs: ['Log 1'] });

      const result = await codeStrategy.execute(tsInput, {} as any);
      
      expect(mockClient.callToolChain).toHaveBeenCalledWith(
        'const result = await system.webScraper({ url: "https://example.com" });\nconsole.log(result);',
        expect.anything()
      );
      expect(result.output).toBe('Success');
    });
  });

  describe('NATIVE TOOL EXECUTION ISOLATION', () => {
    const jsonStrategy = new JsonRpcStrategy(mockClient);

    it('should execute a parsed tool call object directly', async () => {
      // Mocked parsed tool call object in a string as if it was extracted or passed directly
      const toolCall = JSON.stringify({ tool: "webScraper", args: { url: "https://example.com" } });
      
      vi.spyOn(mockClient, 'callTool' as any).mockResolvedValue('Mocked Result');

      const result = await jsonStrategy.execute(toolCall, {} as any);
      
      expect(mockClient.callTool).toHaveBeenCalledWith('webScraper', { url: "https://example.com" }, expect.anything());
      expect(result.output).toBe('Mocked Result');
    });
  });

  describe('MCP SERVER LIFECYCLE (No-AI)', () => {
    let orchestrator: McpOrchestrator;
    const dummyServerPath = path.join(__dirname, 'dummy-mcp-server.js');

    beforeEach(async () => {
      // Create a dummy MCP server script
      const serverCode = `
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server({ name: "dummy-server", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{ name: "echo", description: "Echoes input", inputSchema: { type: "object", properties: { message: { type: "string" } } } }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "echo") {
    return { content: [{ type: "text", text: \`Echo: \${request.params.arguments.message}\` }] };
  }
  return { content: [{ type: "text", text: "Tool not found" }], isError: true };
});

const transport = new StdioServerTransport();
await server.connect(transport);
`;
      await fs.writeFile(dummyServerPath, serverCode);
      
      orchestrator = new McpOrchestrator(mockRegistry);
    });

    afterEach(async () => {
      // Attempt to shut down servers if the method exists
      if ((orchestrator as any).shutdownAll) {
        await (orchestrator as any).shutdownAll();
      }
      await fs.unlink(dummyServerPath).catch(() => {});
    });

    it('should register and connect to the dummy MCP server (Test A)', async () => {
      vi.spyOn(mockRegistry, 'getServerConfig').mockResolvedValue({
        command: 'node',
        args: [dummyServerPath],
        env: {}
      });

      await orchestrator.prepareEnvironment(['dummy']);
      
      // We check if it's "connected" by seeing if we can list tools
      const tools = await orchestrator.getToolsForSandbox();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.some(t => t.name.startsWith('dummy_'))).toBe(true);
    });

    it('should return the expected JSON schema from list_tools (Test B)', async () => {
      vi.spyOn(mockRegistry, 'getServerConfig').mockResolvedValue({
        command: 'node',
        args: [dummyServerPath],
        env: {}
      });

      await orchestrator.prepareEnvironment(['dummy']);
      const tools = await orchestrator.getToolsForSandbox();
      
      const echoTool = tools.find(t => t.name === 'dummy_echo');
      expect(echoTool).toBeDefined();
      expect(echoTool?.inputSchema).toMatchObject({
        type: "object",
        properties: { message: { type: "string" } }
      });
    });

    it('should return correct results from call_tool (Test C)', async () => {
       vi.spyOn(mockRegistry, 'getServerConfig').mockResolvedValue({
        command: 'node',
        args: [dummyServerPath],
        env: {}
      });

      await orchestrator.prepareEnvironment(['dummy']);
      const tools = await orchestrator.getToolsForSandbox();
      const echoTool = tools.find(t => t.name === 'dummy_echo');
      expect(echoTool).toBeDefined();
      
      const result = await echoTool!.handler!({ message: 'Hello' });
      expect(result).toBe('Echo: Hello');
    });

    it('should terminate the child process cleanly (Test D)', async () => {
      vi.spyOn(mockRegistry, 'getServerConfig').mockResolvedValue({
        command: 'node',
        args: [dummyServerPath],
        env: {}
      });

      await orchestrator.prepareEnvironment(['dummy']);
      
      await orchestrator.shutdownAll();
      
      // After shutdown, the active servers should be empty
      const tools = await orchestrator.getToolsForSandbox();
      // Should only contain searchCodebaseTool which is injected internally
      expect(tools.filter(t => t.name.startsWith('dummy_')).length).toBe(0);
    });
  });
});
