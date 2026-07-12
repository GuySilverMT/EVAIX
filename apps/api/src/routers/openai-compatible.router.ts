import { Router } from 'express';
import { mastra } from '../mastra/index.js';

export const openAiRouter = Router();

// 1. Expose Mastra Agents as "Models" to OpenWebUI
openAiRouter.get('/v1/models', (req, res) => {
  try {
    // We dynamically pull the agents registered in the mastra instance
    // Currently mastra.getAgents() or similar might exist, but we can hardcode for the architect first
    // Or we can parse the mastra index to get keys.
    // For now, we manually expose the architect and a generic assistant.
    const agents = ['role-architect', 'system-admin', 'default-assistant'];
    
    res.json({
      object: 'list',
      data: agents.map(id => ({
        id: id,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'evaix-mastra'
      }))
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
    
    // Find the requested agent or fallback to a default
    let agent = mastra.getAgent('roleArchitect'); // Fallback default
    
    // Convert model name to camelCase to match mastra agent keys if needed
    // e.g. "role-architect" -> "roleArchitect"
    const agentKey = model.replace(/-([a-z])/g, (g: string) => g[1].toUpperCase());
    
    try {
      const requestedAgent = mastra.getAgent(agentKey);
      if (requestedAgent) agent = requestedAgent;
    } catch (e) {
      console.warn(`Agent ${agentKey} not found in Mastra registry. Falling back to roleArchitect.`);
    }

    if (!stream) {
      // Non-streaming response
      const result = await agent.generate(messages);
      
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

    const result = await agent.stream(messages);
    
    // Mastra uses Vercel AI SDK under the hood which provides an async iterator over text deltas
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

    // Send the stop sequence
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
