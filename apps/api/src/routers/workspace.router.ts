import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc.js';

export const workspaceRouter = createTRPCRouter({
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.workspace.findUnique({
        where: { id: input.id },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      systemPrompt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.workspace.update({
        where: { id: input.id },
        data: {
          systemPrompt: input.systemPrompt,
        },
      });
    }),
    
  // Helper to get the "current" workspace (usually there's only one active or we pick the first one for now)
  // In a real multi-workspace app, we'd pass the ID from the frontend context.
  getCurrent: protectedProcedure
    .query(async ({ ctx }) => {
        // For now, return the first workspace found, or create a default one if none exist
        const first = await ctx.prisma.workspace.findFirst();
        if (first) return first;
        
        // Create default if missing (should be handled by seed, but safe fallback)
        return ctx.prisma.workspace.create({
            data: {
                name: 'Default Workspace',
                rootPath: process.cwd(),
            }
        });
    })
});
