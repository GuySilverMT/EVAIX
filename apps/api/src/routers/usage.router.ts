import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc.js';
import { prisma } from '../db.js';

export const usageRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().optional().default(0),
    }).optional())
    .query(async ({ input }) => {
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;

        return prisma.modelUsage.findMany({
            include: {
                model: {
                    include: {
                        provider: true
                    }
                },
                role: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit,
            skip: offset
        });
    }),

  getStats: publicProcedure.query(async () => {
      const stats = await prisma.modelUsage.groupBy({
          by: ['modelId'],
          _sum: {
              cost: true,
              promptTokens: true,
              completionTokens: true
          },
          _count: {
              id: true
          }
      });
      return stats;
  })
});
