import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc.js';
import { prisma } from '../db.js';

/**
 * PROVIDER MODEL ROUTER
 *
 * Manages per-provider model overrides — the authoritative source for aggregators
 * (OpenRouter, NVIDIA, etc.) that expose models with different API strings,
 * pricing, and context windows than global defaults.
 *
 * The `fetchFromProvider` mutation drives the SuperAiButton on the model grid:
 * it hits the provider's /models endpoint, parses the response, and upserts rows.
 */
export const providerModelRouter = createTRPCRouter({

  // ── List all models for a single provider ──────────────────────────────────
  list: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .query(async ({ input }) => {
      return prisma.providerModel.findMany({
        where: { providerId: input.providerId },
        orderBy: { displayName: 'asc' },
      });
    }),

  // ── Upsert a single model override ────────────────────────────────────────
  upsert: protectedProcedure
    .input(z.object({
      id: z.string().optional(),
      providerId: z.string(),
      apiString: z.string().min(1),
      displayName: z.string().min(1),
      contextWindowOverride: z.number().int().positive().optional().nullable(),
      inputCostPer1kOverride: z.number().nonnegative().optional().nullable(),
      outputCostPer1kOverride: z.number().nonnegative().optional().nullable(),
      isFreeTier: z.boolean().default(false),
      capabilityOverrides: z.record(z.unknown()).optional(),
      isEnabled: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const { id, providerId, apiString, ...data } = input;

      return prisma.providerModel.upsert({
        where: id
          ? { id }
          : { providerId_apiString: { providerId, apiString } },
        create: {
          providerId,
          apiString,
          displayName: data.displayName,
          contextWindowOverride: data.contextWindowOverride ?? null,
          inputCostPer1kOverride: data.inputCostPer1kOverride ?? null,
          outputCostPer1kOverride: data.outputCostPer1kOverride ?? null,
          isFreeTier: data.isFreeTier,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          capabilityOverrides: (data.capabilityOverrides ?? {}) as any,
          isEnabled: data.isEnabled,
        },
        update: {
          displayName: data.displayName,
          contextWindowOverride: data.contextWindowOverride ?? null,
          inputCostPer1kOverride: data.inputCostPer1kOverride ?? null,
          outputCostPer1kOverride: data.outputCostPer1kOverride ?? null,
          isFreeTier: data.isFreeTier,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          capabilityOverrides: (data.capabilityOverrides ?? {}) as any,
          isEnabled: data.isEnabled,
          updatedAt: new Date(),
        },
      });
    }),

  // ── Delete a single model override ────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.providerModel.delete({ where: { id: input.id } });
    }),

  // ── Delete ALL models for a provider (bulk reset) ─────────────────────────
  deleteAll: protectedProcedure
    .input(z.object({ providerId: z.string() }))
    .mutation(async ({ input }) => {
      const { count } = await prisma.providerModel.deleteMany({
        where: { providerId: input.providerId },
      });
      return { deleted: count };
    }),

  // ── SuperAiButton: Fetch & auto-populate from provider's /models API ───────
  //
  // This is the "AI magic" action. It:
  //   1. Looks up the provider's baseUrl and apiKeyEnvVar
  //   2. Hits /models (OpenAI-compatible) or a known alternative
  //   3. Parses the response and bulk-upserts into ProviderModel
  //
  // Supports OpenRouter model list format as reference. Falls back to OpenAI format.
  fetchFromProvider: protectedProcedure
    .input(z.object({
      providerId: z.string(),
      // Optional override URL if the provider uses a non-standard endpoint
      modelsEndpointOverride: z.string().url().optional(),
    }))
    .mutation(async ({ input }) => {
      const provider = await prisma.providerConfig.findUniqueOrThrow({
        where: { id: input.providerId },
      });

      if (!provider.baseUrl) {
        throw new Error(`Provider "${provider.name}" has no baseUrl configured.`);
      }

      const apiKey = provider.apiKeyEnvVar ? process.env[provider.apiKeyEnvVar] : undefined;
      const modelsUrl = input.modelsEndpointOverride
        ?? `${provider.baseUrl.replace(/\/$/, '')}/models`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      let rawData: unknown;
      try {
        const res = await fetch(modelsUrl, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        rawData = await res.json();
      } catch (err) {
        throw new Error(`Failed to fetch models from ${modelsUrl}: ${(err as Error).message}`);
      }

      // Normalise: handle { data: [...] } (OpenAI/OpenRouter) or top-level array
      const modelList: unknown[] = Array.isArray(rawData)
        ? rawData
        : Array.isArray((rawData as any)?.data)
          ? (rawData as any).data
          : [];

      if (modelList.length === 0) {
        throw new Error('Provider returned an empty model list.');
      }

      // Parse each model — OpenRouter has rich pricing; OpenAI is minimal
      const upserts = modelList.map((m: any) => {
        const apiString: string = m.id ?? m.model_id ?? String(m);
        const displayName: string = m.name ?? m.display_name ?? apiString;

        // OpenRouter: { pricing: { prompt: "0.000001", completion: "0.000003" } }
        const promptPrice = m.pricing?.prompt ? parseFloat(m.pricing.prompt) * 1000 : null;
        const completionPrice = m.pricing?.completion ? parseFloat(m.pricing.completion) * 1000 : null;

        // Context window: OpenRouter uses context_length, OpenAI uses context_window
        const contextWindow: number | null =
          m.context_length ?? m.context_window ?? null;

        const isFreeTier =
          m.pricing?.prompt === '0' ||
          m.pricing?.prompt === 0 ||
          promptPrice === 0;

        return prisma.providerModel.upsert({
          where: { providerId_apiString: { providerId: input.providerId, apiString } },
          create: {
            providerId: input.providerId,
            apiString,
            displayName,
            contextWindowOverride: contextWindow,
            inputCostPer1kOverride: isFinite(promptPrice ?? NaN) ? promptPrice : null,
            outputCostPer1kOverride: isFinite(completionPrice ?? NaN) ? completionPrice : null,
            isFreeTier,
            capabilityOverrides: {
              supportsTools: m.supported_parameters?.includes('tools') ?? null,
              supportsVision: m.architecture?.modality?.includes('image') ?? null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
            lastFetchedAt: new Date(),
          },
          update: {
            displayName,
            contextWindowOverride: contextWindow,
            inputCostPer1kOverride: isFinite(promptPrice ?? NaN) ? promptPrice : null,
            outputCostPer1kOverride: isFinite(completionPrice ?? NaN) ? completionPrice : null,
            isFreeTier,
            capabilityOverrides: {
              supportsTools: m.supported_parameters?.includes('tools') ?? null,
              supportsVision: m.architecture?.modality?.includes('image') ?? null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
            lastFetchedAt: new Date(),
            updatedAt: new Date(),
          },
        });
      });

      const results = await Promise.allSettled(upserts);
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return {
        fetched: modelList.length,
        upserted: succeeded,
        failed,
        providerName: provider.name,
      };
    }),
});
