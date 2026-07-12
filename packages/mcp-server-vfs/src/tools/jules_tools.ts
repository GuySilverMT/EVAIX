import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const createJulesSession = createTool({
  id: 'jules_create_session',
  description: 'Creates a new coding session with Google Jules. Use this to dispatch massive asynchronous coding tasks.',
  inputSchema: z.object({
    prompt: z.string().describe('The architecture prompt or task instruction for Jules'),
    sourceContext: z.string().describe('The GitHub repository string for source context'),
  }),
  execute: async (ctx) => {
    const { prompt, sourceContext } = ctx.context;
    const apiKey = process.env.JULES_API_KEY;

    if (!apiKey) {
      throw new Error('Missing JULES_API_KEY environment variable.');
    }

    const payload = {
      prompt,
      sourceContext: {
        source: sourceContext,
      },
      automationMode: 'AUTO_CREATE_PR',
    };

    const response = await fetch('https://jules.googleapis.com/v1alpha/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create Jules session: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  },
});

export const checkJulesStatus = createTool({
  id: 'jules_check_status',
  description: 'Checks the status of a Google Jules session by fetching its latest activities.',
  inputSchema: z.object({
    sessionId: z.string().describe('The ID of the Google Jules session'),
  }),
  execute: async (ctx) => {
    const { sessionId } = ctx.context;
    const apiKey = process.env.JULES_API_KEY;

    if (!apiKey) {
      throw new Error('Missing JULES_API_KEY environment variable.');
    }

    const response = await fetch(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}/activities`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to check Jules session status: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  },
});
