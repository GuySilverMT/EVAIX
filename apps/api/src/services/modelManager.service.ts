import { PrismaClient, Prisma } from '@prisma/client';
import { DEFAULT_MODEL_TEMP, DEFAULT_MAX_TOKENS, DEFAULT_MODEL_TAKE_LIMIT } from '../config/constants.js';
import { isModelBlacklisted, blacklistModel } from '../rateLimiter.js';
import { CreditGuard } from './CreditGuard.js';
import { ProviderManager } from './ProviderManager.js';
import { PricingRegistry } from './PricingRegistry.js';
import { prisma } from '../db.js';

/**
 * Multi-Armed Bandit Router (Arbitrage Engine)
 */
export interface RoleRequirement {
  requiresVision?: boolean;
  requiresTools?: boolean;
  requiresJson?: boolean;
  minContext?: number;
}

export interface SelectionResult {
  providerId: string;
  modelName: string;
}





// Define a basic interface for the expected data structure.
interface RawProviderOutput {
  modelId: string;
  roleId: string;
  userId: string;
  providerId: string;
  underlyingProvider?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
  cost?: number;
  [key: string]: unknown;
}

// Define interface for ModelSelectionResult
export interface ModelSelectionResult {
  modelId: string;
  providerId: string;
  model: unknown; // Using unknown as it could be a Prisma model or a mocked object
  temperature: number;
  maxTokens: number;
}

// This would be your singleton Prisma client, passed in or imported


/**
 * Logs model usage to the DB, computing real USD cost via PricingRegistry.
 * Cost precedence: explicit `cost` arg > PricingRegistry lookup > 0.
 */
export async function logUsage(data: RawProviderOutput) {
  const {
    modelId,
    roleId,
    providerId,
    underlyingProvider,
    usage,
    cost: explicitCost,
    ...metadata
  } = data;

  const promptTokens = usage?.prompt_tokens || 0;
  const completionTokens = usage?.completion_tokens || 0;

  // Compute real cost if not explicitly provided by the caller
  let resolvedCost = explicitCost ?? 0;
  if (resolvedCost === 0 && (promptTokens > 0 || completionTokens > 0)) {
    try {
      resolvedCost = await PricingRegistry.computeCost(modelId, promptTokens, completionTokens);
      if (resolvedCost > 0) {
        console.log(`[PricingRegistry] Cost for ${modelId}: $${resolvedCost.toFixed(6)} (${promptTokens}p + ${completionTokens}c tokens)`);
      }
    } catch (e) {
      console.warn('[logUsage] PricingRegistry lookup failed — recording $0 cost', e);
    }
  }

  try {
    const newLog = await prisma.modelUsage.create({
      data: {
        modelId,
        roleId,
        providerId,
        underlyingProvider: underlyingProvider || (providerId === 'openrouter' && modelId.includes('/') ? modelId.split('/')[0] : providerId),
        promptTokens,
        completionTokens,
        cost: resolvedCost,
        metadata: { ...metadata } as Prisma.InputJsonValue,
      } as Prisma.ModelUsageUncheckedCreateInput,
    });
    console.log(`[logUsage] Recorded: ${modelId} $${resolvedCost.toFixed(6)} — log id ${newLog.id}`);
    return newLog;
  } catch (error) {
    console.error('[logUsage] Failed to write usage log:', error);
  }
}

/**
 * Selects a model from the model_registry based on Role criteria.
 */
export async function selectModelFromRegistry(roleId: string, failedModels: string[] = [], failedProviders: string[] = []) {
  try {
    const role = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      console.warn(`Role ${roleId} not found`);
      return null;
    }

    const metadata = (role.metadata as Prisma.JsonObject) || {};
    const _capabilities = (metadata.capabilities as string[]) || [];

    const whereClause: Prisma.ModelWhereInput = {
      isActive: true,
      provider: {
        isEnabled: true
      },
      NOT: [
        ...(failedModels.length > 0 ? [{ id: { in: failedModels } }] : []), // modelId -> id
        ...(failedProviders.length > 0 ? [{ providerId: { in: failedProviders } }] : []),
        { name: { contains: 'embed', mode: 'insensitive' } } // name checked only
      ]
    };

    // Note: capabilityTags not in schema, ignoring filter or need logic update
    // if (capabilities.length > 0) ...

    const candidates = await prisma.model.findMany({
      where: whereClause,
      include: {
        provider: true
      },
      orderBy: [
        { lastSeenAt: 'desc' },
      ],
      take: DEFAULT_MODEL_TAKE_LIMIT
    });

    if (candidates.length === 0) {
      console.warn(`No active models found for role ${roleId}`);
      return null;
    }

    // [RESILIENCE] Redis Blacklist Filter
    const healthyCandidates: typeof candidates = [];
    for (const c of candidates) {
      if (!(await isModelBlacklisted(c.id))) {
        healthyCandidates.push(c);
      } else {
        console.warn(`[ModelManager] Skipping blacklisted model: ${c.id}`);
      }
    }

    if (healthyCandidates.length === 0) {
      console.warn(`No healthy models found for role ${roleId} after blacklist filtering`);
      return null;
    }

    // Intelligent Selection: Provider LRU -> Model LRU

    // 1. Fetch usage stats
    const candidateIds = healthyCandidates.map(c => c.id);
    const usageStats = await prisma.modelUsage.groupBy({
      by: ['modelId'],
      where: { modelId: { in: candidateIds } },
      _max: { createdAt: true }
    });

    // 2. Map model usages
    const modelUsageMap = new Map<string, number>();
    usageStats.forEach(stat => {
      if (stat.modelId && stat._max.createdAt) {
        modelUsageMap.set(stat.modelId, stat._max.createdAt.getTime());
      }
    });

    // 3. Compute Provider Usage (Max timestamp of any model in that provider)
    const providerUsageMap = new Map<string, number>();
    for (const c of healthyCandidates) {
      const mTime = modelUsageMap.get(c.id) || 0;
      const pTime = providerUsageMap.get(c.providerId) || 0;
      if (mTime > pTime) { // We want the *latest* usage to represent the provider's "freshness"
        providerUsageMap.set(c.providerId, mTime);
      }
    }

    // 4. Sort Candidates
    healthyCandidates.sort((a, b) => {
      // Priority 0: Billing Risk Level (ZERO_RISK first)
      const riskA = a.provider.billingRiskLevel === 'ZERO_RISK' ? 0 : 1;
      const riskB = b.provider.billingRiskLevel === 'ZERO_RISK' ? 0 : 1;
      if (riskA !== riskB) {
        return riskA - riskB;
      }

      const pTimeA = providerUsageMap.get(a.providerId) || 0;
      const pTimeB = providerUsageMap.get(b.providerId) || 0;

      // Primary Sort: Provider Usage (Oldest first)
      if (pTimeA !== pTimeB) {
        return pTimeA - pTimeB;
      }

      // Secondary Sort: Model Usage (Oldest first)
      const mTimeA = modelUsageMap.get(a.id) || 0;
      const mTimeB = modelUsageMap.get(b.id) || 0;
      return mTimeA - mTimeB;
    });

    // 5. Select Winner
    const selected = healthyCandidates[0];

    const isFree = (selected.costPer1k === 0);

    console.log(`✅ Selected model: ${selected.provider.name}/${selected.name} (free: ${isFree})`);

    // Use external ID from providerData, fallback to name, never usage internal CUID
    const providerDataObj = selected.providerData as Prisma.JsonObject;
    // Helper to safely access 'id' from the JSON object
    const externalId = (typeof providerDataObj === 'object' && providerDataObj !== null && 'id' in providerDataObj)
      ? (providerDataObj['id'] as string)
      : selected.name;

    return {
      modelId: externalId,
      internalId: selected.id,
      providerId: selected.providerId,
      name: selected.name,
      isFree: isFree,
      source: 'registry',
      provider: selected.provider,
      specs: {},
    };
  } catch (error) {
    console.error('Failed to select model from registry:', error);
    return null;
  }
}

export async function getBestModel(roleId?: string, failedModels: string[] = [], failedProviders: string[] = []): Promise<ModelSelectionResult | null> {
  try {
    const role = roleId ? await prisma.role.findUnique({ where: { id: roleId } }) : null;
    const modelId = await resolveModelForRole(role || { id: 'default', metadata: {} }, 0, failedModels, failedProviders);

    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: { provider: true }
    });

    if (model) {
      const providerDataObj = model.providerData as Prisma.JsonObject;
      const externalId = (typeof providerDataObj === 'object' && providerDataObj !== null && 'id' in providerDataObj)
        ? (providerDataObj['id'] as string)
        : model.name;

      return {
        modelId: externalId,
        providerId: model.providerId,
        model: { ...model, internalId: model.id },
        temperature: DEFAULT_MODEL_TEMP,
        maxTokens: DEFAULT_MAX_TOKENS
      };
    }
  } catch (e: unknown) {
    console.warn("[Arbitrage] Unified selection failed:", e);
  }

  // Final fallback
  const fallbackModel = await prisma.model.findFirst({
    where: { provider: { isEnabled: true }, isActive: true },
    include: { provider: true }
  });

  if (fallbackModel) {
    const providerDataObj = fallbackModel.providerData as Prisma.JsonObject;
    const externalId = (typeof providerDataObj === 'object' && providerDataObj !== null && 'id' in providerDataObj)
      ? (providerDataObj['id'] as string)
      : fallbackModel.name;
    return {
      modelId: externalId,
      providerId: fallbackModel.providerId,
      model: { ...fallbackModel, internalId: fallbackModel.id },
      temperature: DEFAULT_MODEL_TEMP,
      maxTokens: DEFAULT_MAX_TOKENS
    };
  }

  throw new Error(`No models available for role ${roleId}`);
}

/**
 * ARBITRAGE ROUTER: Multi-Armed Bandit implementation
 */
export async function selectBestModel(requirements: RoleRequirement, excludedModelIds: string[] = [], excludedProviderIds: string[] = []): Promise<SelectionResult> {
  const allModels = await prisma.model.findMany({
    where: {
      isActive: true,
      provider: { isEnabled: true },
      NOT: [
        ...(excludedModelIds.length > 0 ? [{ id: { in: excludedModelIds } }] : []),
        ...(excludedProviderIds.length > 0 ? [{ providerId: { in: excludedProviderIds } }] : [])
      ]
    },
    include: {
      capabilities: true,
      provider: true
    }
  });

  if (allModels.length === 0) throw new Error('[Arbitrage] No active models found.');

  // Blacklist filter
  const availableModels: typeof allModels = [];
  for (const m of allModels) {
    const isModelBanned = await isModelBlacklisted(m.id);
    const isProviderBanned = !ProviderManager.isHealthy(m.providerId);
    if (!isModelBanned && !isProviderBanned) {
      availableModels.push(m);
    }
  }

  if (availableModels.length === 0) throw new Error('[Arbitrage] All candidates blacklisted.');

  // Hard Requirements
  let candidates = availableModels.filter(m => {
    const caps = m.capabilities;
    if (!caps) return false;
    if (requirements.minContext && (caps.contextWindow || 0) < requirements.minContext) return false;
    if (requirements.requiresVision && !caps.hasVision && !caps.modalityTags.includes('VISION')) return false;
    if (requirements.requiresTools && !caps.supportsFunctionCalling && !caps.modalityTags.includes('TOOL_CALLING')) return false;
    if (requirements.requiresJson && !caps.supportsJsonMode) return false;
    return true;
  });

  // Credit/Trust filter
  const trustCandidates: typeof candidates = [];
  for (const m of candidates) {
    const isLocked = await CreditGuard.isProviderLocked(m.providerId);
    if (!(isLocked && (m.costPer1k || 0) > 0)) trustCandidates.push(m);
  }
  candidates = trustCandidates.length > 0 ? trustCandidates : candidates;

  if (candidates.length === 0) throw new Error('[Arbitrage] No models match requirements.');

  // Epsilon-Greedy (90/10)
  if (Math.random() < 0.1) {
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    return { providerId: selected.providerId, modelName: selected.name };
  }

  const scored = candidates.map(m => {
    const caps = m.capabilities!;
    const successRate = (caps.successCount || 0) / ((caps.successCount || 0) + (caps.failureCount || 0) || 1);
    const latencyScore = 1 / (caps.latencyAvg || 1000);
    const freeBonus = (m.costPer1k || 0) === 0 ? 2.0 : 0.0;
    const riskBonus = m.provider.billingRiskLevel === 'ZERO_RISK' ? 10.0 : 0.0;
    return { model: m, score: successRate + latencyScore + freeBonus + riskBonus };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].model;
  return { providerId: best.providerId, modelName: best.name };
}

export async function resolveModelForRole(role: any, estimatedInputTokens?: number, excludedModelIds: string[] = [], excludedProviderIds: string[] = []): Promise<string> {
  // 1. Strict Override Check
  if (role && role.targetProvider && role.targetModel) {
    console.log(`[ROUTING] Role ${role.name || role.id} strictly bound to ${role.targetProvider} : ${role.targetModel}`);
    const activeProviders = ProviderManager.getProviderIds();

    if (!activeProviders.includes(role.targetProvider)) {
      throw new Error(`Role is strictly bound to provider '${role.targetProvider}', but it is currently unavailable.`);
    }

    const model = await prisma.model.findFirst({
      where: {
        providerId: role.targetProvider,
        name: role.targetModel
      }
    });

    if (!model) {
      // If the hardcoded model isn't in our DB but the provider is active, we might fail or fallback.
      // Based on strict rules, if it's strictly bound and missing, it's an error.
      throw new Error(`Role is strictly bound to model '${role.targetModel}' on provider '${role.targetProvider}', but this model is not registered in the database.`);
    }

    return model.id;
  }

  // 2. Standard Routing
  const metadata = (role.metadata || {}) as any;
  const requirements = metadata.requirements || {};

  const roleReq: RoleRequirement = {
    minContext: requirements.minContext || metadata.minContext || estimatedInputTokens || 0,
    requiresVision: requirements.capabilities?.includes('vision') || metadata.requiresVision === true,
    requiresTools: requirements.capabilities?.includes('tools') || metadata.requiresTools === true,
    requiresJson: requirements.capabilities?.includes('json') || metadata.requiresJson === true
  };

  try {
    const { providerId, modelName } = await selectBestModel(roleReq, excludedModelIds, excludedProviderIds);
    const model = await prisma.model.findFirst({ where: { providerId, name: modelName } });
    if (!model) throw new Error("No healthy models available.");
    return model.id;
  } catch (error) {
    throw error;
  }
}



/**
 * Updates the Bandit reward scores for a model.
 * Applies a massive penalty for 429/401 errors.
 */
export async function updateReward(modelId: string, success: boolean, latency?: number, errorType?: string | number) {
  try {
    const isRateLimited = errorType === 429 || errorType === '429' || String(errorType).includes('Quota') || String(errorType).includes('RESOURCE_EXHAUSTED');
    const isAuthError = errorType === 401 || errorType === '401' || String(errorType).includes('unauthorized');

    const penalty = (isRateLimited || isAuthError) ? 100 : 1;

    if (isRateLimited) {
      await blacklistModel(modelId, 600);

      // Also blacklist the entire provider
      const model = await prisma.model.findUnique({ where: { id: modelId } });
      if (model) {
        ProviderManager.markUnhealthy(model.providerId, 600);
        console.warn(`[Arbitrage] Blacklisted entire provider ${model.providerId} for 600s due to 429`);
      }
    }

    await prisma.modelCapabilities.update({
      where: { modelId },
      data: {
        successCount: success ? { increment: 1 } : undefined,
        failureCount: !success ? { increment: penalty } : undefined,
        latencyAvg: (success && latency) ? { set: latency } : undefined,
        updatedAt: new Date()
      }
    });

    console.log(`[Bandit] Updated reward for ${modelId}: success=${success}, penalty=${penalty}`);
  } catch (err) {
    console.error(`[Bandit] Failed to update reward for ${modelId}:`, err);
  }
}


// Failure helpers

/**
 * Increment persistent failure counts for a model (used to avoid retries across restarts)
 */
export async function recordModelFailure(providerId: string, modelId: string, _roleId?: string) {
  try {
    // Manual upsert to avoid type issues with unique constraints
    const existing = await prisma.modelFailure.findFirst({
      where: { providerId, modelId }
    });

    if (existing) {
      await prisma.modelFailure.update({
        where: { id: existing.id },
        data: { failures: { increment: 1 } }
      });
    } else {
      await prisma.modelFailure.create({
        data: { providerId, modelId, failures: 1 }
      });
    }
    console.log(`[Model Failure] Recorded failure for ${modelId} on ${providerId}`);
  } catch (err) {
    console.warn('[Model Failure] Failed to record model failure:', err);
  }
}

export function recordProviderFailure(_providerId: string, _roleId?: string) {
  // ProviderFailure table does not exist in schema.
  // Skipping recording.
  console.warn(`[Provider Failure] Skipping record for provider ${_providerId} (schema table missing)`);
}
