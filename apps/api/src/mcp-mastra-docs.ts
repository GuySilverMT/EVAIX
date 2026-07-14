import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { vectorMemoryTool } from './tools/vectorMemoryTool.js';
import { createEmbedding } from './services/vector.service.js';

// 1. Create the Mastra Docs RAG Tool

import * as fsPromises from 'fs/promises';
import path from 'path';

export const ingestMastraDocsTool = createTool({
  id: 'ingest_mastra_docs',
  description: 'Ingest Mastra documentation from a local folder into the Postgres embedding system.',
  inputSchema: z.object({
    docsDir: z.string().default('./docs/mastra').describe('The local directory containing Mastra documentation.'),
  }),
  execute: async ({ docsDir }) => {
    try {
      const fullDir = path.resolve(process.cwd(), docsDir);

      const files = await fsPromises.readdir(fullDir, { recursive: true, withFileTypes: true });
      const mdFiles = files.filter(f => f.isFile() && f.name.endsWith('.md'));

      let ingestedCount = 0;
      for (const file of mdFiles) {
        const filePath = path.join(file.parentPath || file.path, file.name);
        const content = await fsPromises.readFile(filePath, 'utf-8');

        // Chunking strategy could be more advanced, but we ingest the whole file for now
        // or split by headers. We'll use a basic chunking.
        const chunks = content.match(/.{1,1000}(?:\s|$)/g) || [content];

        for (const chunk of chunks) {
          const emb = await createEmbedding(chunk);
          // Store it in the vector memory with a specific agentId indicating it's mastra-docs
          await vectorMemoryTool.storeMemory({
            agentId: 'mastra-docs',
            content: chunk,
            embedding: emb
          });
        }
        ingestedCount++;
      }

      return { success: true, message: `Successfully ingested ${ingestedCount} documents into the knowledge base.` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
});

export const searchMastraDocsTool = createTool({
  id: 'search_mastra_docs',
  description: 'Query Mastra documentation for syntax, workflow configurations, and tool integrations.',
  inputSchema: z.object({
    query: z.string().describe('The search query for Mastra documentation.'),
  }),
  execute: async ({ query }) => {
    try {
      // Ingests/searches Mastra documentation into our existing Postgres embedding system
      // We use the existing vectorMemoryTool as the interface to the DB.
      // We assume documents were tagged with agentId 'mastra-docs' or we just search all.
      const searchResult = await vectorMemoryTool.searchMemories({
        query,
        limit: 5,
        threshold: 0.5,
      });

      if (!searchResult.success) {
         return { success: false, error: searchResult.error };
      }

      const resultsText = searchResult.results.map(r => r.content).join('\n\n');
      return {
        success: true,
        results: resultsText || 'No relevant Mastra documentation found.'
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
});

// 2. Create the MCP Server specifically for Mastra Docs (though it's also integrated into mcp-server.ts usually,
// the instructions say "Build a dedicated Mastra Documentation RAG MCP server"). We export it here.
export const mcpMastraDocsServer = new McpServer({
  name: 'mcp-mastra-docs',
  version: '1.0.0',
});

// Register the tool on the dedicated server
mcpMastraDocsServer.tool('ingest_mastra_docs',
  'Ingest Mastra documentation into the RAG system.',
  { docsDir: z.string().optional().describe('The local directory containing Mastra documentation.') },
  async ({ docsDir }) => {
     const result = await ingestMastraDocsTool.execute({ docsDir: docsDir || './docs/mastra' }, {} as any);
     return {
       content: [{ type: 'text', text: JSON.stringify(result) }]
     };
  }
);

mcpMastraDocsServer.tool('search_mastra_docs',
  'Query Mastra documentation for syntax, workflow configurations, and tool integrations.',
  { query: z.string().describe('The search query for Mastra documentation.') },
  async ({ query }) => {
     const result = await searchMastraDocsTool.execute({ query }, {} as any);
     return {
       content: [{ type: 'text', text: JSON.stringify(result) }]
     };
  }
);
