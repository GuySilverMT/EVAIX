import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc.js';
import os from 'os';
import path from 'path';

export const workspaceRouter = createTRPCRouter({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.workspace.findMany({
        orderBy: { updatedAt: 'desc' },
      });
    }),

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
        
        const projectName = 'Default Workspace';
        const projectType = 'CODE'; // Default

        let rootPath = process.cwd();
        if (projectType === 'CODE') {
            // Find monorepo root by going up from apps/api if process.cwd() is apps/api
            const cwd = process.cwd();
            const evaixRoot = cwd.endsWith('apps/api') ? path.resolve(cwd, '../..') : cwd;
            rootPath = path.join(evaixRoot, 'apps', projectName);
        } else if (['WRITE', 'RESEARCH', 'DEPLOY'].includes(projectType)) {
            rootPath = path.join(os.homedir(), 'Documents', 'EVAIXProjects', projectName);
        }

        // Create default if missing (should be handled by seed, but safe fallback)
        return ctx.prisma.workspace.create({
            data: {
                name: projectName,
                projectType: projectType,
                rootPath: rootPath,
            }
        });
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      projectType: z.enum(['CODE', 'WRITE', 'RESEARCH', 'DEPLOY']).default('CODE'),
      defaultModelId: z.string().optional(),
      targetPlatform: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
        let rootPath = process.cwd();

        if (input.projectType === 'CODE') {
            const cwd = process.cwd();
            const evaixRoot = cwd.endsWith('apps/api') ? path.resolve(cwd, '../..') : cwd;
            rootPath = path.join(evaixRoot, 'apps', input.name);
        } else if (['WRITE', 'RESEARCH', 'DEPLOY'].includes(input.projectType)) {
            rootPath = path.join(os.homedir(), 'Documents', 'EVAIXProjects', input.name);
        }

        return ctx.prisma.workspace.create({
            data: {
                name: input.name,
                projectType: input.projectType,
                rootPath: rootPath,
                defaultModelId: input.defaultModelId,
                targetPlatform: input.targetPlatform,
            }
        });
    })
});
