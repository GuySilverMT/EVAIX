// --- providers.router.ts ---
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { ProviderService } from '../services/provider.service.js';
import { ProviderFactory } from '../utils/ProviderFactory.js';
import { prisma } from '../db.js';

const providerService = new ProviderService();

// ── In-process observable event log ──────────────────────────────────────────
// Shared with systemHealth.getLogs for the navbar ticker (V1 ring buffer).
export const providerEventLog: Array<{ ts: string; msg: string }> = [];
export function logProviderEvent(message: string) {
  providerEventLog.push({ ts: new Date().toISOString(), msg: message });
  if (providerEventLog.length > 200) providerEventLog.shift();
}

export const providerRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    return providerService.listProviders();
  }),

  // [UPDATED] After saving, logs an event so the Datacenter workflow can reflect
  // the updated provider via systemHealth.getLogs. ProviderModel rows become
  // available immediately via the providerModel router.
  upsert: publicProcedure
    .input(z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      providerType: z.string().optional(),
      baseUrl: z.string().optional(),
      apiKey: z.string().optional(),
      apiKeyEnvVar: z.string().optional(),
      pricingUrl: z.string().optional(),
      isCreditCardLinked: z.boolean().optional(),
      enforceFreeOnly: z.boolean().optional(),
      monthlyBudget: z.number().optional(),
      serviceCategories: z.array(z.string()).optional(),
      billingRiskLevel: z.enum(['ZERO_RISK', 'PROMO_BURN', 'CC_ON_FILE']).optional(),
      promoMonthlyLimit: z.number().optional(),
      currentScrapedSpend: z.number().optional(),
      billingDashboardUrl: z.string().optional(),
      lastScrapeTime: z.date().optional(),
      providerClass: z.enum(['FOUNDATIONAL', 'AGGREGATOR', 'INFERENCE_ENGINE', 'LOCAL']).optional(),
      isEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await providerService.upsertProviderConfig({
        id: input.id,
        name: input.name,
        type: input.providerType,
        baseUrl: input.baseUrl,
        apiKey: input.apiKey,
        apiKeyEnvVar: input.apiKeyEnvVar,
        pricingUrl: input.pricingUrl,
        isCreditCardLinked: input.isCreditCardLinked,
        enforceFreeOnly: input.enforceFreeOnly,
        monthlyBudget: input.monthlyBudget,
        serviceCategories: input.serviceCategories,
        billingRiskLevel: input.billingRiskLevel,
        promoMonthlyLimit: input.promoMonthlyLimit,
        currentScrapedSpend: input.currentScrapedSpend,
        billingDashboardUrl: input.billingDashboardUrl,
        lastScrapeTime: input.lastScrapeTime,
        providerClass: input.providerClass,
        isEnabled: input.isEnabled,
      });

      // [BACKEND SIDE-EFFECT — Phase 5]
      // Log the upsert so the navbar ticker and Datacenter workflow reflect changes.
      const providerName = input.name ?? (result as any)?.name;
      if (providerName) {
        logProviderEvent(`[ProviderSaved] "${providerName}" config updated — ProviderModel table ready`);
      }

      return result;
    }),

  // [NEW] Soft enable/disable a provider without deleting it (toggle switch on Provider Card)
  setEnabled: publicProcedure
    .input(z.object({
      id: z.string(),
      isEnabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const updated = await prisma.providerConfig.update({
        where: { id: input.id },
        data: { isEnabled: input.isEnabled },
      });
      logProviderEvent(`[ProviderToggle] "${updated.name}" → ${input.isEnabled ? 'ENABLED' : 'DISABLED'}`);
      return updated;
    }),

  // [NEW] Trigger the Surveyor for a specific provider
  scout: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .mutation(async ({ input }) => {
      const syncResult = await providerService.fetchAndNormalizeModels(input.providerId);
      const { Surveyor } = await import('../services/Surveyor.js');
      const surveyResult = await Surveyor.surveyAll();
      const provider = await providerService.getProvider(input.providerId);
      return { ...syncResult, ...surveyResult, provider };
    }),

  // [NEW] Scrape billing balance
  scrapeBalance: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .mutation(async ({ input }) => {
      const { BillingScraper } = await import('../services/billingScraper.js');
      const scraper = new BillingScraper();
      return scraper.scrapeAndSyncBalance(input.providerId);
    }),

  // [NEW] Save billing session cookies
  saveBillingSession: publicProcedure
    .input(z.object({
      providerId: z.string(),
      dashboardUrl: z.string(),
      cookies: z.array(z.object({
        name: z.string(),
        value: z.string(),
        domain: z.string(),
        path: z.string(),
        secure: z.boolean().optional(),
        httpOnly: z.boolean().optional(),
        expires: z.number().optional(),
        sameSite: z.enum(["Strict", "Lax", "None"]).optional()
      }))
    }))
    .mutation(async ({ input }) => {
      const { providerId, dashboardUrl, cookies } = input;
      const fs = await import('fs');
      const path = await import('path');

      const userDataDir = path.resolve(process.cwd(), '.userData', providerId);
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }
      fs.writeFileSync(path.join(userDataDir, 'cookies.json'), JSON.stringify(cookies, null, 2));

      await prisma.providerConfig.update({
        where: { id: providerId },
        data: {
          billingDashboardUrl: dashboardUrl,
          sessionValid: true,
          billingRiskLevel: 'PROMO_BURN',
        }
      });

      return { success: true };
    }),

  listAllAvailableModels: publicProcedure.query(async () => {
    return providerService.listAllAvailableModels();
  }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return providerService.deleteProvider(input.id);
    }),

  fetchAndNormalizeModels: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .mutation(async ({ input }) => {
      const syncResult = await providerService.fetchAndNormalizeModels(input.providerId);
      const provider = await providerService.getProvider(input.providerId);
      return { ...syncResult, provider };
    }),

  validateKey: publicProcedure
    .input(z.object({
      providerType: z.string(),
      baseUrl: z.string(),
      apiKey: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const providerInstance = ProviderFactory.createProvider(input.providerType, {
          apiKey: input.apiKey,
          baseURL: input.baseUrl,
        });

        const models = await providerInstance.getModels();
        return { success: true, models };
      } catch (error) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Invalid API Key or URL'}`,
        });
      }
    }),

  // Legacy/Debug endpoints
  getRawData: publicProcedure.query(async () => { return []; }),
  deleteRawData: publicProcedure.input(z.object({ id: z.string() })).mutation(async () => { return null; }),
  createRawData: publicProcedure.input(z.any()).mutation(async () => { return null; }),
});
