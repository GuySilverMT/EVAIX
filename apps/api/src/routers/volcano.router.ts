import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc.js';

export const volcanoRouter = createTRPCRouter({
  dispatch: protectedProcedure
    .input(z.object({ vfsToken: z.string(), command: z.string() }))
    .mutation(async ({ input }) => {
      // Mock dispatch logic
      console.log(`[Volcano] Dispatching command: ${input.command}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return { 
        status: 'DISPATCHED', 
        command: input.command, 
        message: `Crew dispatched to ${input.command} successfully.` 
      };
    }),
});
