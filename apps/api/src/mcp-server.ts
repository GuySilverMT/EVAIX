import express from 'express';
import cors from 'cors';
import { roleArchitectAgent } from './services/MastraRoleArchitect.js';
import { searchMastraDocsTool } from './mcp-mastra-docs.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

// Initialize the Express server
const app = express();
const port = 9099;

app.use(cors());
app.use(express.json());

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

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});

// The single endpoint handles both GET (SSE stream) and POST (messages)
app.use('/sse', async (req, res) => {
  await transport.handleRequest(req, res, req.body);
});

await mcpServer.server.connect(transport);

app.listen(9099, '0.0.0.0', () => console.log('MCP Server ready at http://0.0.0.0:9099/sse'));
