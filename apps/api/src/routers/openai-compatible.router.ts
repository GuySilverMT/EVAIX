import { Router } from 'express';
import { mastra } from '../mastra/index.js';
import { Agent } from '@mastra/core/agent';
import { createOpenAI } from '@ai-sdk/openai';
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

// 1. Expose Mastra Agents as "Models" to OpenWebUI
openAiRouter.get('/v1/models', async (req, res) => {
  try {
    const agentsMap = await getAvailableAgents();
    const litellmModels = await getLiteLlmModels();
    
    const responseModels: any[] = [];

    // 1. Expose raw agent/role IDs
    for (const agentId of agentsMap.keys()) {
      responseModels.push({
        id: agentId,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'evaix-mastra-role'
      });
    }

    // 2. Expose raw LiteLLM models
    for (const modelId of litellmModels) {
      responseModels.push({
        id: modelId,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'evaix-litellm'
      });
    }

    // 3. Expose combinations: role::model
    for (const agentId of agentsMap.keys()) {
      for (const modelId of litellmModels) {
        responseModels.push({
          id: `${agentId}::${modelId}`,
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: 'evaix-hybrid'
        });
      }
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

// 2. Intercept Chat Completions and route to Mastra
openAiRouter.post('/v1/chat/completions', async (req, res) => {
  try {
    const { model, messages, stream } = req.body;
    
    let targetAgentId = 'role-architect';
    let targetModelId = 'nvidia/meta/llama-3.3-70b-instruct'; // Default fallback model
    
    // Parse the model selection
    if (model.includes('::')) {
      const parts = model.split('::');
      targetAgentId = parts[0];
      targetModelId = parts.slice(1).join('::');
    } else {
      const agentsMap = await getAvailableAgents();
      if (agentsMap.has(model)) {
        targetAgentId = model;
        targetModelId = ''; // Use default configured model for the agent
      } else {
        targetAgentId = 'default-assistant';
        targetModelId = model;
      }
    }

    const agentsMap = await getAvailableAgents();
    let baseAgent = agentsMap.get(targetAgentId);
    
    if (!baseAgent) {
      const liteLlmProvider = createOpenAI({
        baseURL: 'http://localhost:8080/v1',
        apiKey: process.env.LITELLM_MASTER_KEY || 'sk-litellm-key',
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
      const liteLlmProvider = createOpenAI({
        baseURL: 'http://localhost:8080/v1',
        apiKey: process.env.LITELLM_MASTER_KEY || 'sk-litellm-key',
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
