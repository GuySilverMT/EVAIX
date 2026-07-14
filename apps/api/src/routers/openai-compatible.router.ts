import { Router } from 'express';
import { mastra } from '../mastra/index.js';
import { Agent } from '@mastra/core/agent';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

export const openAiRouter = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load all agents dynamically (with cache busting)
async function getAvailableAgents(): Promise<Map<string, Agent>> {
  const agentsMap = new Map<string, Agent>();

  // 1. Add static agents from mastra registry
  try {
    const mastraAgents = (mastra as any).agents || {};
    for (const [key, agent] of Object.entries(mastraAgents)) {
      if (agent instanceof Agent) {
        agentsMap.set(agent.id, agent);
      }
    }
  } catch (e) {
    console.error('[OpenAI Router] Error getting agents from mastra:', e);
  }

  // 2. Scan and dynamically import agents from src/mastra/agents/
  try {
    const agentsDir = path.join(__dirname, '../mastra/agents');
    const files = await fs.readdir(agentsDir);
    for (const file of files) {
      if ((file.endsWith('.ts') || file.endsWith('.js')) && !file.includes('.test.')) {
        const filePath = path.join(agentsDir, file);
        // Use pathToFileURL and query timestamp to bypass node's ESM import cache
        const fileUrl = pathToFileURL(filePath).href + '?update=' + Date.now();
        const module = await import(fileUrl);
        for (const value of Object.values(module)) {
          if (value instanceof Agent) {
            agentsMap.set(value.id, value);
          }
        }
      }
    }
  } catch (e) {
    console.error('[OpenAI Router] Error dynamically importing agents:', e);
  }

  // 3. Scan dynamic agents from data/agents/
  try {
    const dynamicAgentsDir = path.join(process.cwd(), 'apps/api/data/agents');
    const dynamicFiles = await fs.readdir(dynamicAgentsDir);
    for (const file of dynamicFiles) {
      if (file.endsWith('.md') || file.endsWith('.json')) {
        const id = file.replace('.md', '').replace('.json', '').toLowerCase().replace(/[^a-z0-9-_]/g, '_');
        // Add a stub agent so the router knows this ID exists for @ mentions
        agentsMap.set(id, new Agent({
          id,
          name: 'Dynamic Placeholder',
          instructions: '',
          model: 'xai/grok-3' as any
        }));
      }
    }
  } catch (e) {
    // Ignore error if directory doesn't exist yet
  }

  return agentsMap;
}

// Helper to fetch model list from LiteLLM
async function getLiteLlmModels(): Promise<string[]> {
  try {
    const response = await fetch('http://localhost:8080/v1/models', {
      headers: {
        Authorization: `Bearer ${process.env.LITELLM_MASTER_KEY || 'sk-litellm-key'}`
      }
    });
    if (response.ok) {
      const data = await response.json() as any;
      if (data && Array.isArray(data.data)) {
        return data.data.map((m: any) => m.id);
      }
    }
  } catch (error: any) {
    console.error('[OpenAI Router] Failed to fetch models from LiteLLM:', error.message);
  }
  // Fallbacks if LiteLLM is not accessible or empty
  return [
    'nvidia/meta/llama-3.3-70b-instruct',
    'groq/llama-3.3-70b-versatile',
    'openrouter/google/gemini-2.5-flash'
  ];
}

// Helper functions for provider formatting
function formatModelId(modelId: string): string {
  if (modelId.includes('/')) {
    return modelId;
  }
  // Determine provider based on name
  let provider = 'litellm';
  const lower = modelId.toLowerCase();
  if (lower.startsWith('gpt') || lower.startsWith('o1') || lower.startsWith('o3') || lower.startsWith('dall')) {
    provider = 'openai';
  } else if (lower.startsWith('claude')) {
    provider = 'anthropic';
  } else if (lower.startsWith('gemini')) {
    provider = 'google';
  } else if (lower.startsWith('command')) {
    provider = 'cohere';
  } else if (lower.startsWith('llama')) {
    provider = 'meta';
  }
  return `${provider}/${modelId}`;
}

function getOriginalModelId(modelId: string, litellmModels: string[]): string {
  if (litellmModels.includes(modelId)) {
    return modelId;
  }
  for (const rawModel of litellmModels) {
    if (formatModelId(rawModel) === modelId) {
      return rawModel;
    }
  }
  if (modelId.includes('/')) {
    const parts = modelId.split('/');
    const candidate = parts.slice(1).join('/');
    if (litellmModels.includes(candidate)) {
      return candidate;
    }
  }
  return modelId;
}

// 1. Expose Mastra Agents as "Models" to OpenWebUI
openAiRouter.get('/v1/models', async (req, res) => {
  try {
    const litellmModels = await getLiteLlmModels();
    const agentsMap = await getAvailableAgents();
    
    const responseModels: any[] = litellmModels.map((modelId) => ({
      id: formatModelId(modelId),
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'evaix-litellm'
    }));

    // Add standalone Agent models for @ mentions
    for (const agentId of agentsMap.keys()) {
      responseModels.push({
        id: agentId,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'evaix-agent'
      });
    }

    res.json({
      object: 'list',
      data: responseModels
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Helper to write the last prompted model to a workspace file so external tools can dynamically run on the same LLM
async function saveLastActiveModel(modelName: string, agentsMap: Map<string, Agent>) {
  try {
    if (agentsMap.has(modelName) || modelName.includes('::')) return;
    const filePath = '/home/guy/EVAIX/.last_active_model.json';
    const data = JSON.stringify({ model: modelName, timestamp: Date.now() });
    await fs.writeFile(filePath, data, 'utf-8');
  } catch (err: any) {
    console.error('[OpenAI Router] Error saving last active model:', err.message);
  }
}

// Helper to retrieve the last active LLM for dynamic agent routing via @ mentions
async function getLastActiveModel(fallback: string): Promise<string> {
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
  return fallback;
}

// 2. Intercept Chat Completions and route to Mastra
openAiRouter.post('/v1/chat/completions', async (req, res) => {
  try {
    const { model, messages, stream } = req.body;
    
    let targetAgentId = 'role-architect';
    let targetModelId = 'nvidia/meta/llama-3.3-70b-instruct'; // Default fallback model
    
    const agentsMap = await getAvailableAgents();

    if (model) {
      void saveLastActiveModel(model, agentsMap);
    }
    const litellmModels = await getLiteLlmModels();
    const originalModel = getOriginalModelId(model, litellmModels);
    
    if (!model.includes('::') && !agentsMap.has(model)) {
      // Proxy straight to LiteLLM to preserve tools and native capabilities
      req.body.model = originalModel;
      const litellmResponse = await fetch('http://localhost:8080/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LITELLM_MASTER_KEY || 'sk-litellm-key'}`
        },
        body: JSON.stringify(req.body)
      });
      
      res.status(litellmResponse.status);
      litellmResponse.headers.forEach((val, key) => res.setHeader(key, val));
      if (litellmResponse.body) {
        // Node.js fetch body is a Web ReadableStream
        const reader = litellmResponse.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } else {
        res.end();
      }
      return;
    }

    // Parse the model selection for Mastra agents
    if (model.includes('::')) {
      const parts = model.split('::');
      targetAgentId = parts[0];
      const rawModelId = parts.slice(1).join('::');
      targetModelId = getOriginalModelId(rawModelId, litellmModels);
    } else if (agentsMap.has(model)) {
      targetAgentId = model;
      targetModelId = await getLastActiveModel(''); // Inherit last active chat model
    }

    let baseAgent = agentsMap.get(targetAgentId);
    
    if (baseAgent?.name === 'Dynamic Placeholder') {
      try {
        const fs = require('node:fs/promises');
        const path = require('node:path');
        const yaml = require('js-yaml');
        const agentsDir = path.join(process.cwd(), 'apps/api/data/agents');
        const files = await fs.readdir(agentsDir);
        const file = files.find(f => f.replace('.md', '').replace('.json', '').toLowerCase().replace(/[^a-z0-9-_]/g, '_') === targetAgentId);
        
        if (file) {
          const content = await fs.readFile(path.join(agentsDir, file), "utf-8");
          let instructions = '';
          let name = targetAgentId;
          
          if (file.endsWith('.md')) {
            const match = content.match(/^---\n([\s\S]*?)\n---/);
            if (match) {
              const frontmatter = yaml.load(match[1]) as any;
              name = frontmatter.name || name;
              instructions = frontmatter.instructions || content.replace(/^---\n[\s\S]*?\n---/, "").trim();
            }
          } else {
            const parsed = JSON.parse(content);
            name = parsed.name || name;
            instructions = parsed.instructions || '';
          }

          const liteLlmProvider = createOpenAICompatible({
            name: 'litellm',
            baseURL: 'http://localhost:8080/v1',
            headers: {
              Authorization: `Bearer ${process.env.LITELLM_MASTER_KEY || 'sk-litellm-key'}`
            }
          });

          baseAgent = new Agent({
            id: targetAgentId,
            name,
            instructions,
            model: liteLlmProvider(targetModelId || 'nvidia/meta/llama-3.3-70b-instruct')
          });
          targetModelId = ''; // Handled in constructor
        }
      } catch (e) {
        console.error('Failed to load dynamic agent placeholder', e);
      }
    }

    if (!baseAgent || baseAgent.name === 'Dynamic Placeholder') {
      const liteLlmProvider = createOpenAICompatible({
        name: 'litellm',
        baseURL: 'http://localhost:8080/v1',
        headers: {
          Authorization: `Bearer ${process.env.LITELLM_MASTER_KEY || 'sk-litellm-key'}`
        }
      });
      baseAgent = new Agent({
        id: targetAgentId,
        name: `${targetAgentId.charAt(0).toUpperCase() + targetAgentId.slice(1)} Assistant`,
        instructions: 'You are a helpful assistant.',
        model: liteLlmProvider(targetModelId || 'nvidia/meta/llama-3.3-70b-instruct')
      });
      targetModelId = ''; // Already configured in agent constructor
    }

    let agentToRun = baseAgent;

    // If targetModelId is specified, override the agent's model dynamically using Mastra's internal fork mechanism
    if (targetModelId) {
      const liteLlmProvider = createOpenAICompatible({
        name: 'litellm',
        baseURL: 'http://localhost:8080/v1',
        headers: {
          Authorization: `Bearer ${process.env.LITELLM_MASTER_KEY || 'sk-litellm-key'}`
        }
      });
      
      agentToRun = (baseAgent as any).__fork();
      (agentToRun as any).__updateModel({ model: liteLlmProvider(targetModelId) });
    }

    if (!stream) {
      const result = await agentToRun.generate(messages);
      
      res.json({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: result.text
            },
            finish_reason: 'stop'
          }
        ]
      });
      return;
    }

    // Streaming Response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const result = await agentToRun.stream(messages);
    
    for await (const chunk of result.textStream) {
      const payload = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [
          {
            index: 0,
            delta: { content: chunk },
            finish_reason: null
          }
        ]
      };
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }

    res.write(`data: ${JSON.stringify({
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
    })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error: any) {
    console.error('Mastra Execution Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.end();
    }
  }
});
