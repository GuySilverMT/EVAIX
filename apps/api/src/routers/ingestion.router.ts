import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc.js';

export const ingestionRouter = createTRPCRouter({
  ingest: protectedProcedure
    .input(z.object({
      providerId: z.string(),
      models: z.array(z.any())
    }))
    .mutation(async ({ input, ctx }) => {
      // Stub implementation
      console.log('Stubbed ingestion for', input.providerId);
      return { count: 0 };
    }),

  ingestPrompt: protectedProcedure
    .input(z.object({
      path: z.string(),
      content: z.string(),
      frontmatter: z.any()
    }))
    .mutation(async ({ input }) => {
      return { success: true };
    })
});
