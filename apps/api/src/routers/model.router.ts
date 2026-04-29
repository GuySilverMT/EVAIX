import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc.js';
import { prisma } from '../db.js';

export const modelRouter = createTRPCRouter({

  // Real model counts + capability breakdown for a single provider
  listByProvider: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .query(async ({ input }) => {
      // Robust Lookup: Find the config to get the human-readable 'type' (e.g. 'xai')
      const config = await prisma.providerConfig.findUnique({ where: { id: input.providerId } });
      const searchIds = [input.providerId];
      if (config?.type) searchIds.push(config.type);

      const models = await prisma.model.findMany({
        where: {
          providerId: { in: searchIds },
          isActive: true
        },
        include: { capabilities: true },
        orderBy: { name: 'asc' },
      });


      const counts = { llm: 0, embedding: 0, image: 0, audio: 0, vision: 0, other: 0, total: models.length };
      for (const m of models) {
        const caps = m.capabilities;
        if (caps?.hasEmbedding) counts.embedding++;
        else if (caps?.hasImageGen) counts.image++;
        else if (caps?.hasTTS) counts.audio++;
        else if (caps?.hasVision && !caps?.hasReasoning) counts.vision++;
        else if (caps?.hasReasoning || caps?.supportsFunctionCalling !== false) counts.llm++;
        else counts.other++;
      }

      return { models, counts };
    }),

  // Real $ spend per provider from ModelUsage table
  getProviderSpend: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .query(async ({ input }) => {
      const result = await prisma.modelUsage.aggregate({
        where: { model: { providerId: input.providerId } },
        _sum: { cost: true, promptTokens: true, completionTokens: true },
        _count: { id: true },
      });
      return {
        totalCost: result._sum.cost ?? 0,
        totalPromptTokens: result._sum.promptTokens ?? 0,
        totalCompletionTokens: result._sum.completionTokens ?? 0,
        totalRequests: result._count.id,
      };
    }),


  list: publicProcedure.query(async () => {
    return prisma.model.findMany({
      where: { isActive: true },
      include: {
        provider: true,
        capabilities: true,
        chatModel: true,
        embeddingModel: true,
        visionModel: true,
        audioModel: true,
        imageModel: true,
        complianceModel: true,
        rewardModel: true
      },
      orderBy: { lastSeenAt: 'desc' }
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.model.findUnique({
        where: { id: input.id },
        include: {
          provider: true,
          capabilities: true,
          chatModel: true,
          embeddingModel: true,
          visionModel: true,
          audioModel: true,
          imageModel: true,
          complianceModel: true,
          rewardModel: true
        }
      });
    }),

  sync: protectedProcedure.mutation(async () => {
    const { ProviderManager } = await import('../services/ProviderManager.js');
    const { RegistrySyncService } = await import('../services/RegistrySyncService.js');

    await ProviderManager.initialize();

    await RegistrySyncService.syncModels(ProviderManager.getProviders(), ProviderManager.getProviderMetadata());
    return { success: true };
  }),

  runDoctor: protectedProcedure
    .input(z.object({ force: z.boolean().optional() }).optional())
    .mutation(async () => {
      const { Surveyor } = await import('../services/Surveyor.js');
      await Surveyor.surveyAll();
      return { success: true };
    })
});
