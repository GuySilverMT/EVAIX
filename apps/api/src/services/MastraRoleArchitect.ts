import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { promises as fsPromises } from 'fs';
import path from 'path';

// Helper to resolve workspace root
async function findWorkspaceRoot(): Promise<string> {
  let root = process.cwd();
  while (root !== "/" && !(await fsPromises.stat(path.join(root, "pnpm-workspace.yaml")).catch(() => false))) {
    const parent = path.dirname(root);
    if (parent === root) break;
    root = parent;
  }
  return root;
}

// 1. Configure Provider: Route AI SDK through the live LiteLLM Podman container
const liteLlmProvider = createOpenAI({
  baseURL: process.env.LITELLM_API_BASE || 'http://localhost:8080/v1',
  apiKey: process.env.LITELLM_MASTER_KEY || 'sk-litellm-key',
});

// 2. Define Mastra Tools
import { searchMastraDocsTool } from '../mcp-mastra-docs.js';

const filesystemWriteFile = createTool({
  id: 'filesystem_write_file',
  description: 'Write role configuration (.md or .json) to the EVAIX agents directory.',
  inputSchema: z.object({
    path: z.string().describe('The name of the file to write (must end in .md or .json), e.g. "my-agent.md"'),
    content: z.string().describe('The configuration content (Markdown frontmatter or JSON).'),
  }),
  execute: async ({ path: filePath, content }) => {
    try {
      const fileName = path.basename(filePath);
      if (!fileName.endsWith('.md') && !fileName.endsWith('.json')) {
        return { success: false, error: 'Access denied: Role Architect can only write files with .md or .json extensions.' };
      }
      const root = await findWorkspaceRoot();
      const targetDir = path.join(root, 'apps/api/data/agents');
      const fullPath = path.join(targetDir, fileName);

      await fsPromises.mkdir(targetDir, { recursive: true });
      await fsPromises.writeFile(fullPath, content, 'utf-8');
      return { success: true, message: `Successfully wrote configuration to ${path.join('apps/api/data/agents', fileName)}` };
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
You are the EVAIX Role Architect — a meta-agent whose job is to design and register new AI agent roles.

## YOUR PRIMARY OUTPUT: .md configuration files

Every agent role you create MUST be written as a Markdown file to the agents directory using
the filesystem_write_file tool. This is not optional. The file is the source of truth.

### File format (REQUIRED — do NOT include a 'model' field in frontmatter):
\`\`\`
---
name: <human-readable agent name, e.g. "Data Analyst">
tools:
  - <tool_name_1>
  - <tool_name_2>
---
<Full system prompt / instructions for the agent. Be detailed and specific.>
\`\`\`

### Available Tools:
You can specify a subset of these tools in the frontmatter "tools" section to limit access for the role:
- \`web_search\`: Search the web for a query and return top results.
- \`web_scrape\`: Scrape page URL and convert it to clean Markdown.
- \`read_file\`: Read workspace files.
- \`write_file\`: Write to a new workspace file.
- \`patch_file\`: Find and replace content inside workspace files.
- \`list_files\`: List workspace directory files.
- \`terminal_execute\`: Run terminal commands in root folder.
- \`typescript_interpreter\`: Run sandboxed TypeScript logic with structural shims.

If you do not specify the 'tools' field, the agent will have access to all tools by default.
Do NOT include any model designation in the frontmatter. All agent roles in EVAIX are model-agnostic.

### File naming:
- Use kebab-case: \`data-analyst.md\`, \`code-reviewer.md\`
- The tool name in OpenWebUI will be: invoke_<name-from-frontmatter-lowercased>

## WORKFLOW — always follow this order:
1. Think through the agent's purpose, capabilities, and personality
2. Use search_mastra_docs if you need to reference Mastra-specific syntax
3. Draft the .md content (frontmatter name + detailed instructions, NO model field)
4. CALL filesystem_write_file to write it to data/agents/<filename>.md
5. Confirm success and tell the user their new tool name (e.g. "invoke_data-analyst")

## IMPORTANT:
- The FileWatcher will detect your new file within 300ms and hot-register it as a live MCP tool in OpenWebUI — no server restart needed
- You do NOT need to write TypeScript — the .md config is sufficient for the dynamic agent system
- Only write to the data/agents/ directory
  `,
  // Use .chat() to ensure compatibility with LiteLLM/standard Chat Completions endpoints
  model: liteLlmProvider.chat(process.env.DEFAULT_AGENT_MODEL || 'xai/grok-3'),
  tools: {
    filesystemWriteFile,
    searchMastraDocsTool,
  },
});

