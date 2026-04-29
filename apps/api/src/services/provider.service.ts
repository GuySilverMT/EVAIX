import { EnvManager } from './EnvManager.js';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db.js';
import { ProviderFactory, LLMModel } from '../utils/ProviderFactory.js';
import { PricingRegistry } from './PricingRegistry.js';

export class ProviderService {
  async listProviders() {
    return prisma.providerConfig.findMany();
  }

  async getProvider(id: string) {
    return prisma.providerConfig.findUnique({
      where: { id }
    });
  }

  // [NEW] Manage Providers via UI
  async upsertProviderConfig(input: {
    id?: string,
    name?: string,
    type?: string,
    baseUrl?: string,
    apiKey?: string,
    apiKeyEnvVar?: string,
    pricingUrl?: string,
    isCreditCardLinked?: boolean,
    enforceFreeOnly?: boolean,
    monthlyBudget?: number,
    serviceCategories?: string[],
    billingRiskLevel?: any,
    promoMonthlyLimit?: number,
    currentScrapedSpend?: number,
    billingDashboardUrl?: string,
    lastScrapeTime?: Date,
    providerClass?: 'FOUNDATIONAL' | 'AGGREGATOR' | 'INFERENCE_ENGINE' | 'LOCAL',
    isEnabled?: boolean
  }) {
    if (input.id) {
      // PARTIAL UPDATE
      const existing = await prisma.providerConfig.findUnique({ where: { id: input.id } });
      if (!existing) throw new Error('Provider not found');

      const data: any = {
        updatedAt: new Date()
      };

      if (input.name !== undefined) data.name = input.name;
      if (input.type !== undefined) data.type = input.type;
      if (input.baseUrl !== undefined) data.baseUrl = input.baseUrl;
      if (input.apiKeyEnvVar !== undefined) data.apiKeyEnvVar = input.apiKeyEnvVar;
      if (input.pricingUrl !== undefined) data.pricingUrl = input.pricingUrl;
      if (input.isCreditCardLinked !== undefined) data.isCreditCardLinked = input.isCreditCardLinked;
      if (input.enforceFreeOnly !== undefined) data.enforceFreeOnly = input.enforceFreeOnly;
      if (input.monthlyBudget !== undefined) data.monthlyBudget = input.monthlyBudget;
      if (input.serviceCategories !== undefined) data.serviceCategories = input.serviceCategories;
      if (input.billingRiskLevel !== undefined) data.billingRiskLevel = input.billingRiskLevel;
      if (input.promoMonthlyLimit !== undefined) data.promoMonthlyLimit = input.promoMonthlyLimit;
      if (input.currentScrapedSpend !== undefined) data.currentScrapedSpend = input.currentScrapedSpend;
      if (input.billingDashboardUrl !== undefined) data.billingDashboardUrl = input.billingDashboardUrl;
      if (input.lastScrapeTime !== undefined) data.lastScrapeTime = input.lastScrapeTime;
      if (input.providerClass !== undefined) data.providerClass = input.providerClass;
      if (input.isEnabled !== undefined) data.isEnabled = input.isEnabled;

      // [NORMALIZATION] Handle common URL mistakes
      if (input.baseUrl) {
        let url = input.baseUrl.trim();
        if (url.endsWith('/')) url = url.slice(0, -1);

        // xAI needs /v1
        if (url.includes('api.x.ai') && !url.endsWith('/v1')) {
          url += '/v1';
        }
        // Groq needs /openai/v1 (usually)
        if (url.includes('api.groq.com/openai') && !url.endsWith('/v1')) {
          url += '/v1';
        }
        data.baseUrl = url;
      }

      // [SIDE-EFFECT] Update environment files if apiKey is provided
      if (input.apiKey) {
        const type = input.type || existing.type;
        const envKey = input.apiKeyEnvVar || `${(type || '').toUpperCase()}_API_KEY`;
        if (envKey) await EnvManager.updateEnvVariable(envKey, input.apiKey);
      }

      return prisma.providerConfig.update({
        where: { id: input.id },
        data
      });
    } else {
      // CREATE
      if (!input.name || !input.type || !input.baseUrl) {
        throw new Error('Name, type, and baseUrl are required for new providers');
      }

      const result = await prisma.providerConfig.create({
        data: {
          id: uuidv4(),
          name: input.name,
          type: input.type,
          baseUrl: input.baseUrl,
          apiKeyEnvVar: input.apiKeyEnvVar,
          pricingUrl: input.pricingUrl,
          isCreditCardLinked: input.isCreditCardLinked ?? false,
          enforceFreeOnly: input.enforceFreeOnly ?? false,
          monthlyBudget: input.monthlyBudget,
          serviceCategories: input.serviceCategories ?? [],
          billingRiskLevel: input.billingRiskLevel ?? 'ZERO_RISK',
          promoMonthlyLimit: input.promoMonthlyLimit,
          currentScrapedSpend: input.currentScrapedSpend,
          billingDashboardUrl: input.billingDashboardUrl,
          lastScrapeTime: input.lastScrapeTime,
          providerClass: input.providerClass || 'FOUNDATIONAL',
          isEnabled: input.isEnabled ?? true,
        } as any
      });

      // [SIDE-EFFECT] Update environment files if apiKey is provided
      if (input.apiKey) {
        let envKey = input.apiKeyEnvVar || `${(input.type || '').toUpperCase()}_API_KEY`;

        // Sanity Check: If the user accidentally pasted the KEY into the VAR name field
        // (common mistake: fields are next to each other), fallback to default.
        const isLikelyAKey = envKey.includes('.') || envKey.includes('-') || envKey.length > 50;
        if (isLikelyAKey || !envKey) {
          envKey = `${(input.type || 'UNKNOWN').toUpperCase()}_API_KEY`;
        }

        await EnvManager.updateEnvVariable(envKey, input.apiKey);
      }

      return result;
    }
  }

  async addProvider(input: { name: string, providerType: string, baseUrl: string, apiKey?: string }) {
    return this.upsertProviderConfig({
      name: input.name,
      type: input.providerType,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
    });
  }

  async deleteProvider(id: string) {
    return prisma.providerConfig.delete({
      where: { id }
    });
  }

  async listAllAvailableModels() {
    const models = await prisma.model.findMany({
      where: { isActive: true },
      include: {
        provider: true,
        capabilities: true
      },
      orderBy: { lastSeenAt: 'desc' }
    });

    // Background Sync: Controlled by index.ts now to prevent duplication
    /*
    const lastSeen = models[0]?.lastSeenAt;
    const isStale = !lastSeen || (Date.now() - lastSeen.getTime() > 10 * 60 * 1000); // 10 mins

    if (isStale) {
      console.log("[ProviderService] 🕒 Registry is stale. Triggering background sync...");
      // We don't await this to keep the response fast
      void this.syncAll().catch(err => console.error("[ProviderService] Background sync failed:", err));
    }
    */

    return models.map((model) => {
      const capabilities: string[] = ['chat']; // Base capability
      if (model.capabilities?.hasVision) capabilities.push('vision');
      if (model.capabilities?.hasReasoning) capabilities.push('reasoning');
      if (model.capabilities?.hasTTS) capabilities.push('tts');

      return {
        id: model.id, // CUID
        name: model.name, // Display Name
        providerId: model.providerId,
        providerLabel: model.provider.name,
        contextWindow: model.capabilities?.contextWindow || 0,
        // Frontend expects these flattened or in specs
        specs: {
          contextWindow: model.capabilities?.contextWindow || 0,
          maxOutput: model.capabilities?.maxOutput || 0,
          hasVision: !!model.capabilities?.hasVision,
          hasReasoning: !!model.capabilities?.hasReasoning,
          hasEmbedding: !!(model.capabilities as any)?.hasEmbedding || !!(model.capabilities?.specs as any)?.embedding,
          hasImageGen: !!(model.capabilities as any)?.hasImageGen,
          hasOCR: !!(model.capabilities as any)?.hasOCR,
          // @ts-ignore - Dynamic specs
          uncensored: !!model.capabilities?.specs?.uncensored,
          // @ts-ignore - Dynamic specs
          coding: !!model.capabilities?.specs?.coding
        },
        primaryTask: (model.capabilities as any)?.primaryTask || 'chat',
        isMultimodal: !!model.capabilities?.isMultimodal,
        capabilities
      };
    });
  }

  // [UPDATED] Ingest Logic - "Fail-Open" & Populate Capabilities
  async fetchAndNormalizeModels(providerId: string) {
    const { RegistrySyncService } = await import('./RegistrySyncService.js');
    console.log(`[ProviderService] Triggering UNIFIED sync for provider: ${providerId}`);

    // 1. Run the core registry sync
    await RegistrySyncService.syncSingleProvider(providerId);

    // Return real count from DB
    const count = await prisma.model.count({ where: { providerId, isActive: true } });
    return { count };
  }


  async syncAll() {
    const providers = await this.listProviders();
    const results = [];
    for (const p of providers) {
      if (!p.isEnabled) continue;
      try {
        const res = await this.fetchAndNormalizeModels(p.id);
        results.push({ id: p.id, ...res });
      } catch (e) {
        console.error(`[ProviderService] Individual sync failed for ${p.name}:`, e);
      }
    }

    // Also trigger Surveyor to identify capabilities
    try {
      const { Surveyor } = await import('./Surveyor.js');
      await Surveyor.surveyAll();
    } catch (e) {
      console.error("[ProviderService] Surveyor failed after sync:", e);
    }

    return results;
  }
}
