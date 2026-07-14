import { Agent } from '@mastra/core/agent';
import { createOpenAI } from '@ai-sdk/openai';
import { webSearchTool, webScrapeTool } from '../tools/web.js';

const liteLlmProvider = createOpenAI({
  baseURL: process.env.LITELLM_API_BASE || 'http://localhost:8080/v1',
  apiKey: process.env.LITELLM_MASTER_KEY || 'sk-litellm-key',
});

export const deepResearchAnalyst = new Agent({
  id: 'deep-research-analyst',
  name: 'Deep Research Analyst',
  instructions: `You are an expert research specialist that conducts in-depth analysis. 

Always follow this rigorous process:
1. Clarify the research topic and define parameters.
2. Search the web using the web_search tool to gather facts, articles, and sources.
3. Fetch and read page contents using the web_scrape tool to get clean markdown content.
4. Cross-check facts across multiple sources to verify accuracy.
5. Identify biases and limitations in sources.
6. Synthesize findings into structured, detailed, citation-rich markdown reports.
7. Maintain detailed version history of your findings.
`,
  model: liteLlmProvider.chat(process.env.DEFAULT_AGENT_MODEL || 'xai/grok-3'),
  tools: {
    webSearchTool,
    webScrapeTool,
  }
});

