import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { prisma } from '../db.js';

// 1. Configure Provider: Route AI SDK through the live LiteLLM Podman container
const liteLlmProvider = createOpenAI({
  baseURL: 'http://localhost:4001/v1',
  apiKey: process.env.LITELLM_MASTER_KEY || 'sk-litellm-key',
});

// 2. Define Mastra Tools (Wrapping your EVAIX database logic)
const listAvailableTools = createTool({
  id: 'list_available_tools',
  description: 'List all tools currently registered in the EVAIX system that can be assigned to new agent roles.',
  inputSchema: z.object({}),
  execute: async () => {
    const tools = await prisma.tool.findMany({
      select: { name: true, description: true },
    });
    return { tools };
  },
});

const upsertRoleTool = createTool({
  id: 'upsert_role',
  description: 'Create or update an AI Role Variant (Agent DNA) in the system.',
  inputSchema: z.object({
    id: z.string().optional().describe('Optional ID for updating an existing role.'),
    name: z.string().describe('Name of the role (e.g. "Security Auditor")'),
    description: z.string(),
    basePrompt: z.string().describe('The detailed Identity system prompt for the role.'),
    categoryName: z.string().default('Uncategorized'),
    tools: z.array(z.string()).describe('List of exact tool names this role can use.'),
    needsVision: z.boolean().default(false),
    needsCoding: z.boolean().default(false),
    needsReasoning: z.boolean().default(false),
  }),
  execute: async ({ id, name, description, basePrompt, categoryName, tools, needsVision, needsCoding, needsReasoning }) => {
    // Ensure category exists
    let category = await prisma.roleCategory.findUnique({
      where: { name: categoryName },
    });
    
    if (!category) {
      category = await prisma.roleCategory.create({
        data: { name: categoryName },
      });
    }

    const roleId = id || `role-${Date.now()}`;
    
    // Upsert the Agent DNA
    const role = await prisma.role.upsert({
      where: { id: roleId },
      update: {
        name,
        description,
        basePrompt,
        categoryId: category.id,
        metadata: {
          needsVision,
          needsCoding,
          needsReasoning,
        },
      },
      create: {
        id: roleId,
        name,
        description,
        basePrompt,
        categoryId: category.id,
        metadata: {
          needsVision,
          needsCoding,
          needsReasoning,
        },
      },
    });

    // Sync the Tools Module array
    if (tools && tools.length > 0) {
      await prisma.roleTool.deleteMany({ where: { roleId: role.id } });
      const foundTools = await prisma.tool.findMany({
        where: { name: { in: tools } },
        select: { id: true },
      });

      if (foundTools.length > 0) {
        await prisma.roleTool.createMany({
          data: foundTools.map((tool) => ({
            roleId: role.id,
            toolId: tool.id,
          })),
          skipDuplicates: true,
        });
      }
    }

    return { 
      success: true, 
      message: `Role Variant "${role.name}" evolved successfully with ID: ${role.id}` 
    };
  },
});

// 3. Initialize the Mastra Agent
export const roleArchitectAgent = new Agent({
  id: 'evaix-role-architect',
  name: 'EVAIX Role Architect',
  instructions: `
    You are the Role Architect, a core meta-agent within the EVAIX operating system.
    Your primary directive is to design, analyze, evolve, and configure other AI agent personas (Roles) using the Agent DNA framework.
    
    When given a system requirement:
    1. Determine the optimal Identity (Persona & Prompt).
    2. Determine the required Tool Module. ALWAYS use 'list_available_tools' first to see what tools are actually registered. DO NOT hallucinate tools.
    3. Use 'upsert_role' to commit the new Agent DNA to the database.
    
    Prioritize autonomous capability, deterministic outputs, and strict adherence to the EVAIX architecture.
  `,
  // Target a strong reasoning model handled by your LiteLLM router configuration
  model: liteLlmProvider('gpt-4o'), 
  tools: {
    listAvailableTools,
    upsertRoleTool
  },
});
