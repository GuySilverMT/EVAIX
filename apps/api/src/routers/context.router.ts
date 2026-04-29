import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { tokenService } from '../services/TokenService.js';

export const contextRouter = createTRPCRouter({
  getContext: publicProcedure
    .input(z.object({ roleId: z.string() }))
    .query(async ({ input }) => {
      const ctx = await tokenService.getContext(input.roleId);
      return ctx;
    }),

  setContext: publicProcedure
    .input(z.object({ roleId: z.string(), tone: z.string().optional(), style: z.string().optional(), memory: z.record(z.string()).optional() }))
    .mutation(async ({ input }) => {
      await tokenService.setContext(input.roleId, { tone: input.tone, style: input.style, memory: input.memory as any });
      return { success: true };
    }),

  setMemoryKey: publicProcedure
    .input(z.object({ roleId: z.string(), key: z.string(), value: z.string() }))
    .mutation(async ({ input }) => {
      await tokenService.setMemoryKey(input.roleId, input.key, input.value);
      return { success: true };
    }),

  removeMemoryKey: publicProcedure
    .input(z.object({ roleId: z.string(), key: z.string() }))
    .mutation(async ({ input }) => {
      await tokenService.removeMemoryKey(input.roleId, input.key);
      return { success: true };
    }),

  clearContext: publicProcedure
    .input(z.object({ roleId: z.string() }))
    .mutation(async ({ input }) => {
      await tokenService.clearContext(input.roleId);
      return { success: true };
    }),
});
