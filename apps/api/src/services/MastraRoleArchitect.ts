import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';
import { promises as fsPromises } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── Path Resolution ──────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findWorkspaceRoot(): string {
  let current = __dirname;
  while (current !== '/' && current !== path.parse(current).root) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    current = path.dirname(current);
  }
  return path.join(__dirname, '../../../../');
}

const WORKSPACE_ROOT = findWorkspaceRoot();
const AGENTS_DIR = path.join(WORKSPACE_ROOT, 'apps/api/data/agents');

// ─── LiteLLM Provider (model-agnostic routing) ───────────────────────────────
// All agents in EVAIX are model-agnostic. The Role Architect uses grok-4-5
// as a capable default but honours the DEFAULT_AGENT_MODEL env override.
const liteLlmProvider = createOpenAICompatible({
  name: 'litellm',
  baseURL: process.env.LITELLM_API_BASE || 'http://localhost:8080/v1',
  headers: {
    Authorization: `Bearer ${process.env.LITELLM_MASTER_KEY || 'sk-litellm-key'}`
  }
});

const ARCHITECT_MODEL =
  process.env.ROLE_ARCHITECT_MODEL ||
  process.env.DEFAULT_AGENT_MODEL ||
  'xai/grok-4.5-latest';

// ─── Tool: filesystem_list ────────────────────────────────────────────────────
const filesystemList = createTool({
  id: 'filesystem_list',
  description:
    'List existing agent role files in apps/api/data/agents/ to avoid duplicates and understand what already exists.',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      await fsPromises.mkdir(AGENTS_DIR, { recursive: true });
      const files = await fsPromises.readdir(AGENTS_DIR, { withFileTypes: true });
      const entries = files.map(f => ({
        name: f.name,
        isDir: f.isDirectory(),
        sizePath: path.join('apps/api/data/agents', f.name),
      }));
      return { success: true, agents: entries, agentsDir: 'apps/api/data/agents' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

// ─── Tool: filesystem_read ────────────────────────────────────────────────────
const filesystemRead = createTool({
  id: 'filesystem_read',
  description:
    'Read the content of an existing agent role file from apps/api/data/agents/ to inspect or extend it.',
  inputSchema: z.object({
    filename: z
      .string()
      .describe('The filename inside data/agents/ to read, e.g. "deep-research.md"'),
  }),
  execute: async ({ filename }) => {
    try {
      const safeName = path.basename(filename); // strip any path traversal
      const fullPath = path.join(AGENTS_DIR, safeName);
      if (!existsSync(fullPath)) {
        return { success: false, error: `File '${safeName}' does not exist in agents directory.` };
      }
      const content = await fsPromises.readFile(fullPath, 'utf-8');
      return { success: true, filename: safeName, content };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

// ─── Tool: filesystem_write ───────────────────────────────────────────────────
// Strictly sandboxed to apps/api/data/agents/ only.
// The FileWatcher detects new files within ~300 ms and hot-registers them
// as live MCP tools in OpenWebUI — no server restart required.
const filesystemWrite = createTool({
  id: 'filesystem_write',
  description:
    'Write a new or overwrite an existing agent role .md file into apps/api/data/agents/. ' +
    'The FileWatcher auto-registers the file as a live MCP tool in OpenWebUI within ~300 ms. ' +
    'Only .md files are permitted.',
  inputSchema: z.object({
    filename: z
      .string()
      .describe(
        'Filename for the agent role, e.g. "data-analyst.md". Must end in .md. Use kebab-case.',
      ),
    content: z
      .string()
      .describe(
        'Full Markdown content including YAML frontmatter (name, tools list) and the system prompt body.',
      ),
  }),
  execute: async ({ filename, content }) => {
    try {
      const safeName = path.basename(filename);
      if (!safeName.endsWith('.md')) {
        return {
          success: false,
          error: 'Access denied: Role Architect may only write .md files to the agents directory.',
        };
      }
      await fsPromises.mkdir(AGENTS_DIR, { recursive: true });
      const fullPath = path.join(AGENTS_DIR, safeName);
      await fsPromises.writeFile(fullPath, content, 'utf-8');
      return {
        success: true,
        message: `✅ Agent role written to apps/api/data/agents/${safeName}. The FileWatcher will auto-register it in OpenWebUI within ~300 ms.`,
        agentFile: `apps/api/data/agents/${safeName}`,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

// ─── Tool: postgres_semantic_search ──────────────────────────────────────────
// RAG against the vector store (agent_dna table) for Mastra docs and codebase
// context. Falls back gracefully if the DB is unavailable.
import { vectorMemoryTool } from '../tools/vectorMemoryTool.js';

const postgresSemanticSearch = createTool({
  id: 'postgres_semantic_search',
  description:
    'Perform a semantic similarity search against the EVAIX knowledge base (Mastra docs, ' +
    'codebase index, agent DNA) stored in the Postgres pgvector store. Use this to look up ' +
    'Mastra tool syntax, existing agent patterns, or workflow configurations before drafting ' +
    'a new role.',
  inputSchema: z.object({
    query: z
      .string()
      .describe('The natural-language search query, e.g. "Mastra tool inputSchema zod pattern"'),
    agentId: z
      .string()
      .optional()
      .describe(
        'Optional: narrow results to a specific agent or knowledge namespace (e.g. "mastra-docs").',
      ),
    limit: z
      .number()
      .min(1)
      .max(20)
      .default(5)
      .describe('Maximum number of results to return (default 5).'),
    threshold: z
      .number()
      .min(0)
      .max(1)
      .default(0.5)
      .describe('Minimum similarity score (0–1). Lower = broader matches.'),
  }),
  execute: async ({ query, agentId, limit, threshold }) => {
    try {
      const result = await vectorMemoryTool.searchMemories({
        query,
        agentId,
        limit,
        threshold,
      });
      if (!result.success) {
        return { success: false, error: result.error };
      }
      const snippets = result.results.map(r => r.content).join('\n\n---\n\n');
      return {
        success: true,
        resultCount: result.count,
        results: snippets || 'No relevant context found.',
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

// ─── Mastra Docs RAG Tool (retained from previous implementation) ─────────────
import { searchMastraDocsTool } from '../mcp-mastra-docs.js';

// ─── Role Architect Agent ─────────────────────────────────────────────────────
export const roleArchitectAgent = new Agent({
  id: 'evaix-role-architect',
  name: 'EVAIX Role Architect',
  instructions: `
You are the EVAIX Role Architect — a meta-agent whose sole purpose is to design,
draft, and persist new AI agent roles for the EVAIX platform.

═══════════════════════════════════════════════════════════════
## CORE OUTPUT CONTRACT
═══════════════════════════════════════════════════════════════

Every agent role you create MUST be written as a Markdown file via the
filesystem_write tool. The file is the single source of truth that drives
registration in OpenWebUI. Do NOT describe the file without writing it.

### Required file format

\`\`\`markdown
---
name: <Human-Readable Agent Name>
tools:
  - read_file
  - write_file
  - list_files
  - terminal_execute
  - web_search
  - web_scrape
  - patch_file
  - typescript_interpreter
---
<Detailed system prompt — personality, capabilities, constraints, and workflow.>
\`\`\`

### Rules

- **DO NOT** include a \`model:\` field. All agents in EVAIX are model-agnostic.
- **DO NOT** include absolute paths in instructions. Agents operate relative to the workspace root.
- Only list tools the role actually needs (subset from the Available Tools list below).
- Use **kebab-case** filenames: \`data-analyst.md\`, \`legal-reviewer.md\`.

═══════════════════════════════════════════════════════════════
## AVAILABLE TOOLS FOR ROLES
═══════════════════════════════════════════════════════════════

These are the tool IDs you may reference in the \`tools:\` frontmatter array:

| Tool ID                  | Description                                      |
|--------------------------|--------------------------------------------------|
| \`read_file\`              | Read workspace files                             |
| \`write_file\`             | Create new workspace files                       |
| \`patch_file\`             | Find-and-replace in existing workspace files     |
| \`list_files\`             | List files/directories in the workspace          |
| \`terminal_execute\`       | Run bash commands in the workspace root          |
| \`web_search\`             | Search the web and return results                |
| \`web_scrape\`             | Scrape a URL and return clean Markdown           |
| \`typescript_interpreter\` | Execute sandboxed TypeScript logic               |

═══════════════════════════════════════════════════════════════
## YOUR TOOLS (as Role Architect)
═══════════════════════════════════════════════════════════════

You have access to these tools to do your job:

- **filesystem_list**: Check what agent roles already exist to avoid duplicates.
- **filesystem_read**: Inspect existing role files for patterns and inspiration.
- **filesystem_write**: Persist the new role. This is the critical final step.
- **postgres_semantic_search**: Query the EVAIX knowledge base and Mastra docs index
  for syntax examples, tool schemas, and existing agent patterns before drafting.
- **search_mastra_docs**: Dedicated Mastra documentation RAG — use this to verify
  exact Mastra tool/workflow/agent API syntax.

═══════════════════════════════════════════════════════════════
## MANDATORY WORKFLOW — follow this order every time
═══════════════════════════════════════════════════════════════

1. **Discover** — Call filesystem_list to see what roles already exist.
2. **Research** — Call postgres_semantic_search and/or search_mastra_docs to
   gather relevant patterns, especially if the role uses complex tooling.
3. **Draft** — Compose the .md file content (frontmatter + system prompt).
4. **Write** — Call filesystem_write with the filename and content.
5. **Confirm** — Tell the user the new tool name that will appear in OpenWebUI
   (format: \`invoke_<name_lowercased_underscored>\`) and confirm the FileWatcher
   will auto-register it within ~300 ms.

═══════════════════════════════════════════════════════════════
## IMPORTANT CONSTRAINTS
═══════════════════════════════════════════════════════════════

- You may ONLY write files to apps/api/data/agents/ via filesystem_write.
- Do NOT write TypeScript, Python, or any code outside a role .md file.
- Do NOT hallucinate tool IDs — only use the exact IDs listed above.
- The FileWatcher hot-registers your file; no server restart is needed.
`,
  model: liteLlmProvider(ARCHITECT_MODEL),
  tools: {
    filesystemList,
    filesystemRead,
    filesystemWrite,
    postgresSemanticSearch,
    searchMastraDocsTool,
  },
});
