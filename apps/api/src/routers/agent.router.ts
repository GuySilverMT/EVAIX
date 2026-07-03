import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { AgentService, startSessionSchema } from '../services/agent.service.js';
import { AgentRuntime } from '../services/AgentRuntime.js';

const agentService = new AgentService();
const runtime = new AgentRuntime();

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

  /**
   * Primary route for evolving Agent DNA. 
   * The frontend hits this mutation with a natural language request.
   */
  invokeRoleArchitect: publicProcedure
    .input(z.object({
      intent: z.string().min(1, "Intent cannot be empty")
    }))
    .mutation(async ({ input }) => {
      console.log(`[tRPC] Received Role Architect request: ${input.intent}`);
      
      // Route the string directly into Mastra
      const result = await runtime.executeRoleArchitect(input.intent);
      
      return {
        success: result.success,
        response: result.text,
        toolResults: result.toolResults
      };
    }),
});
