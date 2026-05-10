import { createTRPCRouter, protectedProcedure } from '../trpc.js';
import { z } from 'zod';

export const apiExplorerRouter = createTRPCRouter({
  create: protectedProcedure.mutation(async () => {
    return { success: true };
  }),
  executeQuery: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const result = await ctx.prisma.$queryRawUnsafe(input.query);
        // Serialize BigInts if any (Prisma returns BigInt for count etc)
        return JSON.parse(JSON.stringify(result, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
      } catch (error: any) {
        throw new Error(`Query failed: ${error.message}`);
      }
    })
});
