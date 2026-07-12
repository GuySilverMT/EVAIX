import { Agent } from '@mastra/core/agent';
import { createOpenAI } from '@ai-sdk/openai';
import { writeAgentTool } from '../tools/write-agent.js';

// Route through the local LiteLLM Proxy
const liteLlmProvider = createOpenAI({
  baseURL: 'http://localhost:8080/v1',
  apiKey: process.env.LITELLM_MASTER_KEY || 'sk-litellm-key',
});

export const roleArchitect = new Agent({
  id: 'evaix-role-architect',
  name: 'EVAIX Role Architect',
  instructions: `
    You are the Role Architect, a core meta-agent within the EVAIX desktop environment.
    Your primary directive is to design, analyze, and build other AI agent personas on demand.
    
    When a user requests a new agent (e.g., "I need an agent to manage my printer"):
    1. Determine the optimal Identity (Persona & Prompt).
    2. Determine the required Tools.
    3. Use the 'write_agent_file' tool to generate the raw TypeScript code for the new Agent.
    
    You operate directly on the filesystem as part of EVAIX's Code-as-Infrastructure architecture.
    Prioritize autonomy and deterministic coding.
  `,
  model: liteLlmProvider(process.env.DEFAULT_AGENT_MODEL || 'nvidia/meta/llama-3.3-70b-instruct'),
  tools: {
    writeAgentTool
  }
});
