/**
 * @file mcp-server.ts
 * @description EVAIX Mastra Tool Server — HTTP/OpenAPI edition.
 *
 * OpenWebUI's "External Tool Server" expects an HTTP server that serves:
 *   GET  /openapi.json   → OpenAPI 3.0 spec listing all tools
 *   POST /<tool-id>      → Execute the tool, return JSON result
 *
 * Each Mastra Agent is exposed as an HTTP endpoint that calls agent.generate().
 * OpenWebUI's base model will see these as callable tools in the (+) Tools panel.
 *
 * Dev:  npx tsx src/mcp-server.ts
 * Prod: node dist/mcp-server.js
 *
 * OpenWebUI → Admin → Settings → Tools → Add Tool Server:
 *   URL: http://localhost:9099
 *   (OpenWebUI will auto-fetch /openapi.json from that base URL)
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { Agent } from '@mastra/core/agent';
import { createOpenAI } from '@ai-sdk/openai';
import { julesOrchestrator } from './JulesOrchestrator.js';

// ─── Tool imports (from .domoreai signatures) ─────────────────────────────────
import {
  filesystemReadFile,
  filesystemWriteFile,
  filesystemListFiles,
  filesystemDeleteFile,
  filesystemCreateDirectory,
} from './tools/filesystem.js';

import {
  gitStatus,
  gitAdd,
  gitCommit,
  gitBranchList,
  gitDiff,
} from './tools/git.js';

import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import * as fs from 'fs/promises';
import * as nodePath from 'path';

// ─── Shared LiteLLM provider ──────────────────────────────────────────────────

const llm = createOpenAI({
  baseURL: process.env.LITELLM_API_BASE ?? 'http://localhost:8080/v1',
  apiKey: process.env.LITELLM_MASTER_KEY ?? 'sk-litellm-key',
});

const defaultModel = process.env.DEFAULT_AGENT_MODEL ?? 'xai/grok-3';

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

// ─── Write-agent tool ─────────────────────────────────────────────────────────

const writeAgentFileTool = createTool({
  id: 'write_agent_file',
  description: 'Creates a new Mastra agent TypeScript file in the EVAIX agents directory.',
  inputSchema: z.object({
    agentId: z.string(),
    agentName: z.string(),
    instructions: z.string(),
  }),
  execute: async (ctx) => {
    const { agentId, agentName, instructions } = ctx.context;
    const safeId = agentId.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const constName = safeId
      .split('-')
      .map((p: string, i: number) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)))
      .join('');
    const code = `import { Agent } from '@mastra/core/agent';
import { createOpenAI } from '@ai-sdk/openai';
const llm = createOpenAI({ baseURL: 'http://localhost:8080/v1', apiKey: process.env.LITELLM_MASTER_KEY || 'sk-litellm-key' });
export const ${constName} = new Agent({ name: '${agentName}', instructions: \`${instructions.replace(/`/g, '\\`')}\`, model: llm('${defaultModel}'), tools: {} });
`;
    const filepath = nodePath.join('/home/guy/EVAIX/apps/api/src/mastra/agents', `${safeId}.ts`);
    await fs.writeFile(filepath, code, 'utf-8');
    return { success: true, path: filepath };
  },
});

// ─── Agent definitions ────────────────────────────────────────────────────────

const architectAgent = new Agent({
  name: 'EVAIX Role Architect',
  instructions: `You are the Role Architect, a core meta-agent within the EVAIX desktop environment.
  Your primary directive is to design, analyze, and build other AI agent personas on demand.
  When a user requests a new agent: determine the optimal persona & prompt, then use write_agent_file.
  Always use kebab-case for agent IDs. Prioritize autonomy and deterministic coding.`,
  model: llm(defaultModel),
  tools: { filesystemReadFile, filesystemWriteFile, filesystemListFiles, writeAgentFileTool },
});

const codeReviewerAgent = new Agent({
  name: 'EVAIX Code Reviewer',
  instructions: `You are a senior TypeScript/React engineer in the EVAIX workspace.
  Review code for TypeScript correctness, React best practices, MUI sx-prop usage (no Tailwind),
  tRPC hook correctness, and Zustand store integration. Read files and git diffs before reviewing.`,
  model: llm('nvidia/meta/llama-3.3-70b-instruct'),
  tools: { filesystemReadFile, filesystemListFiles, gitStatus, gitDiff },
});

const schedulerAgent = new Agent({
  name: 'EVAIX Scheduler',
  instructions: `You are the EVAIX Scheduler Agent. You manage scheduler.json at /home/guy/EVAIX/scheduler.json.
  You can list, add, update, or remove scheduled tasks. Always validate cron expressions before writing.`,
  model: llm('groq/llama-3.3-70b-versatile'),
  tools: { filesystemReadFile, filesystemWriteFile },
});

const devopsAgent = new Agent({
  name: 'EVAIX DevOps',
  instructions: `You are the EVAIX DevOps Agent managing git workflows for /home/guy/EVAIX.
  You can check git status/diffs, stage and commit files, and browse/read/write the filesystem.
  Always summarize what you changed and why. Never force-push without explicit instruction.`,
  model: llm(defaultModel),
  tools: { gitStatus, gitAdd, gitCommit, gitBranchList, gitDiff, filesystemReadFile, filesystemWriteFile, filesystemListFiles, filesystemCreateDirectory, filesystemDeleteFile },
});

// ─── Tool registry ────────────────────────────────────────────────────────────
// Each entry maps to: GET /openapi.json (discovery) + POST /<toolId> (execution).

interface ToolDef {
  id: string;
  summary: string;
  description: string;
  paramDescription: string;
  agent: Agent;
}

const TOOLS: ToolDef[] = [
  {
    id: 'ask_architect',
    summary: 'Ask the EVAIX Role Architect',
    description: 'Delegates to the Role Architect agent. Designs and writes new Mastra AI agent TypeScript files on demand. Describe the agent you want to create.',
    paramDescription: 'What agent do you want to create? Describe its role, persona, and purpose.',
    agent: architectAgent,
  },
  {
    id: 'ask_code_reviewer',
    summary: 'Ask the EVAIX Code Reviewer',
    description: 'Delegates to the Code Reviewer agent. Reviews TypeScript/React code for correctness, MUI patterns, tRPC hooks, and Zustand integration. Provide a file path or paste code.',
    paramDescription: 'Code to review, file path to inspect, or git diff to analyze.',
    agent: codeReviewerAgent,
  },
  {
    id: 'ask_scheduler',
    summary: 'Ask the EVAIX Scheduler',
    description: 'Delegates to the Scheduler agent. Manages the autonomous JSON scheduling system. Can list, add, update, or remove scheduled tasks in scheduler.json.',
    paramDescription: 'Scheduling operation to perform (list tasks, add new task, update, or remove).',
    agent: schedulerAgent,
  },
  {
    id: 'ask_devops',
    summary: 'Ask the EVAIX DevOps Agent',
    description: 'Delegates to the DevOps agent. Handles git operations and multi-file filesystem mutations for the EVAIX monorepo. Describe the git or filesystem task.',
    paramDescription: 'Git or filesystem operation to automate (status, commit, read/write files, etc.).',
    agent: devopsAgent,
  },
  {
    id: 'ask_jules_orchestrator',
    summary: 'Ask the Jules Orchestrator Agent',
    description: 'Delegates to the Jules Orchestrator agent to dispatch coding tasks.',
    paramDescription: 'Describe the task for Jules to perform.',
    agent: julesOrchestrator,
  },
];

// ─── OpenAPI spec factory ─────────────────────────────────────────────────────

function buildOpenAPISpec(host: string) {
  const paths: Record<string, object> = {};

  for (const tool of TOOLS) {
    paths[`/${tool.id}`] = {
      post: {
        operationId: tool.id,
        summary: tool.summary,
        description: tool.description,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['prompt'],
                properties: {
                  prompt: {
                    type: 'string',
                    description: tool.paramDescription,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Agent response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    response: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'EVAIX Mastra Tool Server',
      version: '1.0.0',
      description: 'Exposes EVAIX Mastra Agents as callable tools for OpenWebUI.',
    },
    servers: [{ url: host }],
    paths,
  };
}

// ─── Express app ──────────────────────────────────────────────────────────────

const app = express();

app.use(cors());
app.use(express.json());

// OpenWebUI fetches this to discover available tools
app.get('/openapi.json', (req: Request, res: Response) => {
  const host = `${req.protocol}://${req.get('host')}`;
  res.json(buildOpenAPISpec(host));
});

// Root redirect for convenience
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/openapi.json');
});

// Register one POST handler per tool
for (const tool of TOOLS) {
  app.post(`/${tool.id}`, async (req: Request, res: Response) => {
    const { prompt } = req.body as { prompt?: string };

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Missing required field: prompt (string)' });
      return;
    }

    try {
      console.log(`[EVAIX Tools] ${tool.id} ← "${prompt.slice(0, 80)}..."`);
      const resolvedModel = await getDynamicModel(defaultModel);
      const agentToRun = (tool.agent as any).__fork();
      (agentToRun as any).__updateModel({ model: llm(resolvedModel) });
      const result = await agentToRun.generate([{ role: 'user', content: prompt }]);
      res.json({ response: result.text });
    } catch (err) {
      const message = (err as Error).message;
      console.error(`[EVAIX Tools] ${tool.id} error:`, message);
      res.status(500).json({ error: message });
    }
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.EVAIX_TOOLS_PORT ?? '9099', 10);
// Bind to 0.0.0.0 so Docker containers can reach this host process via
// host.docker.internal:9099 (Podman maps this to the host gateway).
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🧠 EVAIX Mastra Tool Server running on http://localhost:${PORT}`);
  console.log(`\nOpenWebUI → Admin → Settings → Tools → Add Tool Server:`);
  console.log(`  URL: http://localhost:${PORT}\n`);
  console.log('Available tools:');
  for (const t of TOOLS) {
    console.log(`  POST /${t.id}  — ${t.summary}`);
  }
  console.log(`\n  Spec: http://localhost:${PORT}/openapi.json\n`);
});
