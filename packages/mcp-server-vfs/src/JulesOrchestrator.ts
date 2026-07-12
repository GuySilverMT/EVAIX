import { Agent } from '@mastra/core/agent';
import { createOpenAI } from '@ai-sdk/openai';
import { createJulesSession, checkJulesStatus } from './tools/jules_tools.js';
import { gitStatus, gitAdd, gitCommit, gitBranchList, gitDiff } from './tools/git.js';

const llm = createOpenAI({
  baseURL: process.env.LITELLM_API_BASE ?? 'http://localhost:8080/v1',
  apiKey: process.env.LITELLM_MASTER_KEY ?? 'sk-litellm-key',
});

const defaultModel = process.env.DEFAULT_AGENT_MODEL ?? 'cerebras/gemma-4-31b';

export const julesOrchestrator: Agent = new Agent({
  name: 'jules-orchestrator',
  instructions: `You are the Jules Orchestrator. Your job is to dispatch asynchronous coding tasks to Google's Jules agent. When given a directive, formulate a precise prompt for Jules. Dispatch the task using createJulesSession. You are responsible for monitoring the task and notifying the user when the PR is ready for local review.`,
  model: llm(defaultModel),
  tools: {
    createJulesSession,
    checkJulesStatus,
    gitStatus,
    gitAdd,
    gitCommit,
    gitBranchList,
    gitDiff,
  },
});
