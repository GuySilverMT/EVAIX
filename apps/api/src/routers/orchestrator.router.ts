import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc.js';
import { AgentService } from '../services/agent.service.js';

const agentService = new AgentService();


export const orchestratorRouter = createTRPCRouter({
  getConfig: protectedProcedure.query(async () => {
    return {
      autoHealing: true,
      loadBalancing: true,
      costCap: 100,
      excludeProviders: []
    };
  }),

  updateConfig: protectedProcedure
    .input(z.object({
      autoHealing: z.boolean().optional(),
      loadBalancing: z.boolean().optional(),
      costCap: z.number().optional(),
      excludeProviders: z.array(z.string()).optional()
    }))
    .mutation(async ({ input }) => {
      return { success: true };
    }),

  listModels: protectedProcedure
    .input(z.object({
      capability: z.string().optional(),
      minContext: z.number().optional()
    }))
    .query(async () => {
      // Stubbed return to avoid Prisma dependency issues for now
      return [];
    }),

  getActiveRegistryData: publicProcedure.query(async ({ ctx }) => {
    // Return list of models with capabilities and provider metadata
    const models = await ctx.prisma.model.findMany({
      where: { isActive: true },
      include: {
        capabilities: true,
        provider: {
          select: {
            name: true,
            type: true
          }
        }
      }
    });

    // Normalize for UI
    const normalized = models.map(m => {
      const caps = m.capabilities || {} as any;
      return {
        ...m,
        providerLabel: m.provider?.name,
        specs: {
          ...caps,
          hasCoding: caps.specs?.coding || false,
          isLibrarian: caps.specs?.isLibrarian || false,
          isMedical: caps.specs?.medical || false,
          isWeather: caps.specs?.weather || false,
          isScience: caps.specs?.science || false,
          hasAudioOutput: caps.hasAudioOutput || false
        }
      };
    });

    return {
      rows: normalized,
      models: normalized
    };
  }),

  // Tool Example Management
  getToolExamples: publicProcedure
    .input(z.object({ toolName: z.string() }))
    .query(async ({ input, ctx }) => {
      const tool = await ctx.prisma.tool.findUnique({
        where: { name: input.toolName }
      });
      return { content: tool?.instruction || '' };
    }),

  getBulkToolDocs: publicProcedure
    .input(z.object({ toolNames: z.array(z.string()) }))
    .query(async ({ input }) => {
      const { loadToolDocs } = await import('../services/tools/ToolDocumentationLoader.js');
      return loadToolDocs(input.toolNames);
    }),

  updateToolExamples: protectedProcedure
    .input(z.object({ toolName: z.string(), content: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.tool.update({
        where: { name: input.toolName },
        data: { instruction: input.content }
      });
    }),

  dispatch: protectedProcedure
    .input(z.object({
      prompt: z.string(),
      contextId: z.string().optional(),
      roleId: z.string().optional(),
      flags: z.object({
        limitContext: z.boolean().optional(),
        injectState: z.boolean().optional()
      }).optional()
    }))
    .mutation(async ({ input }) => {
      console.log('[Orchestrator] Dispatch received:', input);
      
      // Call the AgentService to start an execution session
      // This will resolve the model, tools, and run the agent loop
      const result = await agentService.startSession({
        roleId: input.roleId || 'default',
        userGoal: input.prompt,
        cardId: input.contextId || 'default',
        modelConfig: {
          temperature: 0.7,
          maxTokens: 1024,
        },
      });

      return result;
    })
});
