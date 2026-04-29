import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { AgentService, startSessionSchema } from '../services/agent.service.js';

const agentService = new AgentService();

export const agentRouter = createTRPCRouter({
  /**
   * Start a new agent session with a given role and model configuration
   */
  startSession: publicProcedure
    .input(startSessionSchema)
    .mutation(async ({ input }) => {
      return await agentService.startSession(input);
    }),

  /**
   * Generate a SQL query from natural language
   */
  generateQuery: publicProcedure
    .input(
      z.object({
        userPrompt: z.string().min(1),
        targetTable: z.string().optional(),
        roleName: z.string().optional().default('sql-query-helper'),
      })
    )
    .mutation(async ({ input }) => {
      return await agentService.generateQuery(input);
    }),
});
