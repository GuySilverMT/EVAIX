import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { promises as fsPromises } from 'fs';
import path from 'path';

// 1. Configure Provider: Route AI SDK through the live LiteLLM Podman container
const liteLlmProvider = createOpenAI({
  baseURL: 'http://localhost:8080/v1',
  apiKey: process.env.LITELLM_MASTER_KEY || 'sk-litellm-key',
});

// 2. Define Mastra Tools

// We must provide search_mastra_docs. For now, it will act as a client to our MCP server
// or invoke the tool directly. Since it's a tool the agent must use, we'll define a proxy
// tool here that uses the same logic, or we import it. I'll define it here to call the MCP.
// Actually, I can just define the tool logic here or import it from the new mcp-mastra-docs.ts.
// I'll import it from mcp-mastra-docs.ts.
import { searchMastraDocsTool } from '../mcp-mastra-docs.js';

const filesystemWriteFile = createTool({
  id: 'filesystem_write_file',
  description: 'Write content to a file on the filesystem. ONLY permitted to write to EVAIX agents directory (packages/evaix-mastra/src/agents/).',
  inputSchema: z.object({
    path: z.string().describe('The path to the file to write, e.g. packages/evaix-mastra/src/agents/my-agent.ts'),
    content: z.string().describe('The TypeScript content to write to the file.'),
  }),
  execute: async ({ path: filePath, content }) => {
    // Restrict its write access specifically to the EVAIX agents directory
    
    try {
      const targetDir = path.resolve(process.cwd(), 'packages/evaix-mastra/src/agents');
      const fullPath = path.resolve(process.cwd(), filePath);

      // Restrict its write access specifically to the EVAIX agents directory
      if (!fullPath.startsWith(targetDir)) {
        return { success: false, error: 'Access denied: Role Architect can only write to packages/evaix-mastra/src/agents/' };
      }
      await fsPromises.mkdir(path.dirname(fullPath), { recursive: true });
      await fsPromises.writeFile(fullPath, content, 'utf-8');
      return { success: true, message: `Successfully wrote to ${filePath}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

// 3. Initialize the Mastra Agent
export const roleArchitectAgent = new Agent({
  id: 'evaix-role-architect',
  name: 'EVAIX Role Architect',
  instructions: `
    You are the Role Architect, a core meta-agent within the EVAIX operating system.
    You are an expert in Mastra framework architecture.
    Your sole purpose is to write other Mastra agents for the EVAIX core ecosystem. You do NOT review code.
    Your job is to design isolated, single-purpose agents and ensure smooth prompt handoffs between roles.
    
    IMPORTANT RULES:
    1. You MUST always use the search_mastra_docs tool to verify syntax, workflow configurations, and tool integrations before writing code. Do not guess or hallucinate Mastra syntax.
    2. You will be provided a project_type (e.g., "Frontend WebNode", "Backend MCP"). You must apply the specific project rules to the generated code.
    3. You ONLY have write access to the EVAIX agents directory (packages/evaix-mastra/src/agents/).
    
    Prioritize clean, production-ready TypeScript code.
  `,
  model: liteLlmProvider('gpt-4o'), 
  tools: {
    filesystemWriteFile,
    searchMastraDocsTool // Imported from mcp-mastra-docs.js
  },
});
