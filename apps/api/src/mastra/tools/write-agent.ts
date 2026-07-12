import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

export const writeAgentTool = createTool({
  id: 'write_agent_file',
  description: 'Creates a new Mastra agent by writing a TypeScript file to the agents directory and registering it.',
  inputSchema: z.object({
    agentId: z.string().describe('The ID of the agent (e.g. "printer-manager")'),
    agentName: z.string().describe('The display name of the agent'),
    instructions: z.string().describe('The system prompt and instructions for the agent'),
    tools: z.array(z.string()).describe('List of tool IDs the agent should have access to')
  }),
  execute: async ({ agentId, agentName, instructions, tools }) => {
    // Basic kebab-case id conversion just in case
    const safeId = agentId.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const className = safeId.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('') + 'Agent';
    const constName = safeId.split('-').map((p, i) => i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)).join('');
    
    // Generate the TS Code
    const tsCode = `import { Agent } from '@mastra/core/agent';
import { createOpenAI } from '@ai-sdk/openai';

const liteLlmProvider = createOpenAI({
  baseURL: 'http://localhost:8080/v1',
  apiKey: process.env.LITELLM_MASTER_KEY || 'sk-litellm-key',
});

export const ${constName} = new Agent({
  id: '${safeId}',
  name: '${agentName}',
  instructions: \`${instructions.replace(/`/g, '\\`')}\`,
  model: liteLlmProvider('gpt-4o'),
  // Add tools here once imported
  tools: {}
});
`;

    const filepath = path.join(process.cwd(), 'src/mastra/agents', `${safeId}.ts`);
    await fs.writeFile(filepath, tsCode);

    // Note: To fully hot-reload, mastra.config.ts / index.ts would need to be updated.
    // For now, we will return instructions to the user/system that the file was written.
    return {
      success: true,
      path: filepath,
      message: `Agent ${agentName} successfully written to ${filepath}. You must import it into src/mastra/index.ts to activate it.`
    };
  }
});
