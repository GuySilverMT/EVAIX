import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc.js';

export const llmRouter = createTRPCRouter({
  process: protectedProcedure
    .input(z.object({
      prompt: z.string(),
      modelId: z.string().optional()
    }))
    .mutation(async () => {
      return { text: "Stubbed LLM response" };
    }),

  getUsage: protectedProcedure
    .query(async () => {
      return { totalTokens: 0, cost: 0 };
    })
});
