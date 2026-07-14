import { Agent } from '@mastra/core/agent';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { AVAILABLE_MASTRA_TOOLS } from './mcp-server.js';
import fs from 'fs';
import path from 'path';

async function run() {
  const liteLlmProvider = createOpenAICompatible({
    name: 'litellm',
    baseURL: process.env.LITELLM_API_BASE || 'http://localhost:8080/v1',
    headers: {
      Authorization: `Bearer ${process.env.LITELLM_MASTER_KEY || 'sk-litellm-key'}`
    }
  });

  const content = fs.readFileSync('/home/guy/EVAIX/apps/api/data/agents/planning-agent.md', 'utf-8');
  const instructions = content.replace(/^---\n[\s\S]*?\n---/, "").trim();

  const agent = new Agent({
    id: "planning_agent",
    name: "Planning Agent",
    instructions: instructions,
    model: liteLlmProvider("openrouter/minimax/minimax-m2.5"),
    tools: {
      read_file: AVAILABLE_MASTRA_TOOLS.read_file,
      list_files: AVAILABLE_MASTRA_TOOLS.list_files,
      write_file: AVAILABLE_MASTRA_TOOLS.write_file,
      web_search: AVAILABLE_MASTRA_TOOLS.web_search,
    }
  });

  console.log("Running planning agent...");
  const res = await agent.generate("I'll start by surveying existing EVAIX UI registry docs, coding rules, and related memories—no coding, planning only. Look for component_registry.md and evaix-ui CSS/MUI tokens.", { maxSteps: 10 });
  console.log("Response text:", res.text);
  if ((res as any).toolCalls) {
      console.log("Tool calls:", JSON.stringify((res as any).toolCalls, null, 2));
  }
}
run().catch(console.error);
