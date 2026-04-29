import { getRedisClient } from './redis.js';

export interface IAtomicRedisClient {
  get(key: string): Promise<string | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<boolean>;
  multi(): any;
}

export class RateLimiter {
  private redis: IAtomicRedisClient;

  constructor(redisClient: IAtomicRedisClient) {
    this.redis = redisClient;
  }

  /**
   * Atomically checks and increments the rate limit counter.
   * Returns true if request is allowed, false if limit exceeded.
   */
  async checkAndIncrement(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const current = await this.redis.incr(key);
    
    // If this is the first request (current === 1), set the expiry.
    // Note: There is a tiny race here where if the process crashes after incr but before expire,
    // the key might persist without expiry. Lua script avoids this, but this is generally acceptable.
    // If strict atomicity for expiry is required, we'd need eval support in the interface.
    if (current === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    
    return current <= limit;
  }
}

import { ProviderManager } from './services/ProviderManager.js';
import { type BaseLLMProvider, type CompletionRequest, type CompletionResponse } from './utils/BaseLLMProvider.js';

export async function executeWithRateLimit(provider: BaseLLMProvider, request: CompletionRequest): Promise<CompletionResponse> {
  try {
    if (!ProviderManager.isHealthy(provider.id)) {
      // Create an error object that looks like an axios error
      const error = new Error(`Provider ${provider.id} is on cooldown.`);
      (error as any).status = 429;
      throw error;
    }
    return await provider.generateCompletion(request);
  } catch (error: any) {
    const status = error.response?.status || error.status;
    if (status === 429) { 
      console.warn(`[RateLimit] ${provider.id} exhausted. Marking as unhealthy.`);
      ProviderManager.markUnhealthy(provider.id, 60); // Cooldown for 60 seconds
    }
    // Also mark provider as unhealthy on other server-side errors
    if (status >= 500) {
        console.warn(`[RateLimit] ${provider.id} returned a server error. Marking as unhealthy.`);
        ProviderManager.markUnhealthy(provider.id, 30); // Shorter cooldown for general errors
    }
    throw error;
  }
}

/**
 * Temporarily blacklists a specific model in Redis when a 429 is encountered.
 */
export async function blacklistModel(modelId: string, ttlSeconds: number = 60): Promise<void> {
  try {
    const client = await getRedisClient();
    const key = `rate_limit:model:${modelId}`;
    await client.set(key, 'true', { EX: ttlSeconds });
    console.warn(`[RateLimit] Blacklisted model ${modelId} for ${ttlSeconds}s`);
  } catch (err) {
    console.error(`[RateLimit] Failed to blacklist model ${modelId}:`, err);
  }
}

/**
 * Checks if a model is currently blacklisted in Redis.
 */
export async function isModelBlacklisted(modelId: string): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const key = `rate_limit:model:${modelId}`;
    const result = await client.get(key);
    return result === 'true';
  } catch (err) {
    console.error(`[RateLimit] Failed to check blacklist for model ${modelId}:`, err);
    return false;
  }
}