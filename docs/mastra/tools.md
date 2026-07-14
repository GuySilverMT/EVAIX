# Mastra Tools

Mastra tools are functional extensions that agents can call programmatically to perform actions, query external APIs, or manage data.

## Creating a Tool
Import `createTool` from `@mastra/core/tools` and define the ID, description, inputSchema, and execute function:

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const webSearchTool = createTool({
  id: 'web_search',
  description: 'Search the web for a query and return results.',
  inputSchema: z.object({
    query: z.string().describe('The search query')
  }),
  execute: async ({ query }) => {
    // Implement search logic here
    return { results: [] };
  }
});
```

## Schema Enforcement
Always define type-safe inputs using `zod` schemas under `inputSchema`.
