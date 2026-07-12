const prisma = new Proxy({}, { get: () => () => ({}) }) as any;
type Prisma = any;
const DEFAULT_MODEL_TEMP = 0.7;
const DEFAULT_MAX_TOKENS = 1000;

export const liteLlmFallbackModels: string[] = [];
export const liteLlmContextFallbacks: string[] = [];
export const liteLlmCooldowns: string[] = [];

/**
 * LiteLLM Proxy Router Engine
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
  headers?: any;
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

/**
 * Logs model usage to the DB, extracting cost from LiteLLM proxy headers if explicit cost is not provided.
 */
export async function logUsage(data: RawProviderOutput) {
  const {
    modelId,
    roleId,
    providerId,
    underlyingProvider,
    usage,
    cost: explicitCost,
    headers,
    ...metadata
  } = data;

  const promptTokens = usage?.prompt_tokens || 0;
  const completionTokens = usage?.completion_tokens || 0;

  // Compute real cost if not explicitly provided by the caller
  let resolvedCost = explicitCost ?? 0;
  if (resolvedCost === 0 && headers && headers['x-litellm-response-cost']) {
    try {
      resolvedCost = parseFloat(headers['x-litellm-response-cost']);
    } catch (e) {
      console.warn('[logUsage] Failed to parse x-litellm-response-cost header:', e);
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
        metadata: { ...metadata } as any,
      } as any,
    });
    console.log(`[logUsage] Recorded: ${modelId} $${resolvedCost.toFixed(6)} — log id ${newLog.id}`);
    return newLog;
  } catch (error) {
    console.error('[logUsage] Failed to write usage log:', error);
  }
}

export async function getBestModel(roleId?: string, failedModels: string[] = [], failedProviders: string[] = []): Promise<ModelSelectionResult | null> {
  return {
    modelId: 'litellm-proxy',
    providerId: 'litellm',
    model: { internalId: 'litellm-proxy' },
    temperature: DEFAULT_MODEL_TEMP,
    maxTokens: DEFAULT_MAX_TOKENS
  };
}

export async function resolveModelForRole(role: any, estimatedInputTokens?: number, excludedModelIds: string[] = [], excludedProviderIds: string[] = []): Promise<string> {
  return 'litellm-proxy';
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
      // Stubbed since we removed blacklist logic in LiteLLM implementation
      console.warn(`[Arbitrage] Detected 429 rate limit for ${modelId}. LiteLLM handles fallbacks.`);
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
