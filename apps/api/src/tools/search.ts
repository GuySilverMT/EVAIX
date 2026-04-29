import { SandboxTool } from '../types.js';

export const searchCodebaseTool: SandboxTool = {
  name: 'search_codebase',
  description: 'Semantic search over the codebase using vector embeddings. Use this to find relevant code snippets or documentation.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
      limit: { type: 'number', description: 'Max results to return (default 5)' }
    },
    required: ['query']
  },
  handler: async (args: { query: string; limit?: number }) => {
    // Import dynamically to avoid circular dependencies or aggressive startup loading
    const { vectorStore, createEmbedding } = await import('../services/vector.service.js');
    const queryEmbedding = await createEmbedding(args.query);
    const results = await vectorStore.search(queryEmbedding, args.limit || 5);
    
    return results.map((r) => {
      const meta = r.metadata as { filePath: string; chunk: string };
      return `File: ${meta.filePath}\nSimilarity: ${(r.similarity ?? 0).toFixed(4)}\nContent:\n${meta.chunk}\n---`;
    }).join('\n');
  }
};
