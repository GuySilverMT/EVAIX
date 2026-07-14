import { Router } from 'express';
import { Agent } from '@mastra/core/agent';
import { createOpenAI } from '@ai-sdk/openai';
import { AVAILABLE_MASTRA_TOOLS } from '../mcp-server.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';

export const bridgeRouter = Router();

// Endpoint for OpenWebUI Python bridge to invoke primitive tools or dynamic agents
bridgeRouter.post('/v1/bridge/invoke', async (req, res) => {
  try {
    const { action_type, id, prompt, args } = req.body;

    if (!action_type || !id) {
      res.status(400).json({ error: 'Missing action_type or id' });
      return;
    }

    if (action_type === 'tool') {
      const tool = AVAILABLE_MASTRA_TOOLS[id];
      if (!tool) {
        res.status(404).json({ error: `Tool ${id} not found` });
        return;
      }
      
      try {
        const result = await tool.execute(args || {});
        res.json({ result: typeof result === 'string' ? result : JSON.stringify(result) });
      } catch (err: any) {
        res.status(500).json({ error: `Tool execution failed: ${err.message}` });
      }
      return;
    }

    if (action_type === 'agent') {
      try {
        const agentsDir = path.join(process.cwd(), 'apps/api/data/agents');
        const files = await fs.readdir(agentsDir);
        
        // Find the matching agent file
        const file = files.find(f => f.replace('.md', '').replace('.json', '').toLowerCase().replace(/[^a-z0-9-_]/g, '_') === id);
        
        if (!file) {
          res.status(404).json({ error: `Agent ${id} not found` });
          return;
        }

        const content = await fs.readFile(path.join(agentsDir, file), "utf-8");
        let instructions = '';
        let name = id;
        let toolsList: string[] = [];
        
        if (file.endsWith('.md')) {
          const match = content.match(/^---\n([\s\S]*?)\n---/);
          if (match) {
            const frontmatter = yaml.load(match[1]) as any;
            name = frontmatter.name || name;
            instructions = frontmatter.instructions || content.replace(/^---\n[\s\S]*?\n---/, "").trim();
            if (Array.isArray(frontmatter.tools)) {
              toolsList = frontmatter.tools;
            }
          }
        } else {
          const parsed = JSON.parse(content);
          name = parsed.name || name;
          instructions = parsed.instructions || '';
          if (Array.isArray(parsed.tools)) {
            toolsList = parsed.tools;
          }
        }

        const toolsObject: Record<string, any> = {};
        if (toolsList && toolsList.length > 0) {
          for (const toolId of toolsList) {
            if (AVAILABLE_MASTRA_TOOLS[toolId]) {
              toolsObject[toolId] = AVAILABLE_MASTRA_TOOLS[toolId];
            }
          }
        } else {
          Object.assign(toolsObject, AVAILABLE_MASTRA_TOOLS);
        }

        // Determine active model to use
        let modelToUse = 'xai/grok-3';
        try {
          const filePath = '/home/guy/EVAIX/.last_active_model.json';
          const cacheContent = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(cacheContent);
          if (data && data.model && (Date.now() - data.timestamp < 300000)) {
            modelToUse = data.model;
          }
        } catch (e) {
          // Ignore
        }

        const liteLlmProvider = createOpenAI({
          baseURL: 'http://localhost:8080/v1',
          apiKey: process.env.LITELLM_MASTER_KEY || 'sk-litellm-key',
        });

        const agent = new Agent({
          id,
          name,
          instructions,
          model: liteLlmProvider(modelToUse),
          tools: toolsObject
        });

        const response = await agent.generate(prompt || '');
        res.json({ result: response.text });

      } catch (err: any) {
        res.status(500).json({ error: `Agent execution failed: ${err.message}` });
      }
      return;
    }

    res.status(400).json({ error: 'Invalid action_type. Must be tool or agent.' });
  } catch (error: any) {
    console.error('Error in bridge router:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
