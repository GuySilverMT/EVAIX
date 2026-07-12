import express from 'express';
import { roleArchitectAgent } from './services/MastraRoleArchitect.js';
import { searchMastraDocsTool } from './mcp-mastra-docs.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';

// Initialize the Express server
const app = express();
const port = 9099;

const mcpServer = new McpServer({
  name: 'evaix-mcp-server',
  version: '1.0.0',
});

// Register search_mastra_docs on the main EVAIX MCP server
mcpServer.tool('search_mastra_docs',
  'Query Mastra documentation for syntax, workflow configurations, and tool integrations.',
  { query: z.string().describe('The search query for Mastra documentation.') },
  async ({ query }) => {
     const result = await searchMastraDocsTool.execute({ query }, {} as any);
     return {
       content: [{ type: 'text', text: JSON.stringify(result) }]
     };
  }
);

// Register evaix-role-architect on the main EVAIX MCP server
mcpServer.tool('ask_evaix_role_architect',
  'Ask the EVAIX Role Architect to write or generate a new Mastra agent.',
  {
    prompt: z.string().describe('The task description for the architect.'),
    project_type: z.string().describe('The project type (e.g., "Frontend WebNode", "Backend MCP").')
  },
  async ({ prompt, project_type }) => {
    try {
      const fullPrompt = `Project Type: ${project_type}\n\nTask: ${prompt}`;
      const response = await roleArchitectAgent.generate(fullPrompt);
      return {
        content: [
          { type: 'text', text: response.text }
        ]
      };
    } catch (e: any) {
       return {
         content: [
           { type: 'text', text: `Error: ${e.message}` }
         ]
       }
    }
  }
);


const transports = new Map<string, SSEServerTransport>();

// Set up the SSE endpoint
app.get('/sse', async (req, res) => {
  console.log(`[MCP Server] New SSE connection established.`);
  const sessionId = Math.random().toString(36).substring(7);
  const transport = new SSEServerTransport(`/messages?sessionId=${sessionId}`, res);
  transports.set(sessionId, transport);

  res.on('close', () => {
    transports.delete(sessionId);
  });

  await mcpServer.server.connect(transport);
});

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(404).send('SSE session not found');
  }
});

app.listen(port, () => {
  console.log(`[MCP Server] Listening on http://localhost:${port}/sse`);
});
