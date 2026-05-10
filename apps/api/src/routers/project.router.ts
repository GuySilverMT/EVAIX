import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { prisma } from '../db.js';

export const projectRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({
      name: z.string(),
      description: z.string(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
      jobs: z.array(z.any()).optional()
    }))
    .mutation(async ({ input }) => {
      console.log('Stubbed project creation', input);
      return { id: 'stub-project-id', ...input };
    }),

  list: publicProcedure.query(async () => {
    return [];
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return null;
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
    }))
    .mutation(({ input }) => {
      return { status: 'ok', message: 'Project update placeholder' };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      return { status: 'ok', message: 'Project delete placeholder' };
    }),

  getConstitution: publicProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ input }) => {
      const workspace = await prisma.workspace.findUnique({
        where: { id: input.workspaceId },
        select: { codeRules: true, glossary: true },
      });
      const glossary = (workspace?.glossary as Record<string, string>) || {};
      return {
        codeRules: workspace?.codeRules || '',
        glossary,
      };
    }),

  updateConstitution: publicProcedure
    .input(z.object({
      workspaceId: z.string(),
      codeRules: z.string().optional(),
      glossary: z.record(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { workspaceId, codeRules, glossary } = input;
      const updated = await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          ...(codeRules !== undefined && { codeRules }),
          ...(glossary !== undefined && { glossary }),
          updatedAt: new Date(),
        },
      });
      return {
        success: true,
        codeRules: updated.codeRules,
        glossary: updated.glossary as Record<string, string>,
      };
    }),
});
