import { type LLMModel } from './utils/ProviderFactory.js';
import { z } from 'zod';

/**
 * We reuse the LLMModel interface to keep things consistent.
 * If MCP returns different fields, we can extend it here.
 */
export interface MCPAdapter {
  providerName: string;
  configSchema: z.ZodObject<any>;
  getModels(config: { baseURL?: string; apiKey?: string }): Promise<LLMModel[]>;
}

export class GatewayAdapter implements MCPAdapter {
  providerName: string = 'mcp';
  configSchema = z.object({
    baseURL: z.string().url().optional(),
    apiKey: z.string().min(1).optional(),
  });
  async getModels(): Promise<LLMModel[]> {
    // Placeholder implementation - ensure strict types
    return [
      {
        id: 'gateway-model-1',
        providerId: 'mcp-gateway',
        object: 'model',
        created: Date.now(),
        owned_by: 'gateway',
      },
    ];
  }
}

// Example of a concrete implementation (adapt as needed for your real logic)
export class LocalAdapter implements MCPAdapter {
  providerName: string = 'local';
  configSchema = z.object({
    // Define schema for local adapter if needed
  });
  async getModels(): Promise<LLMModel[]> {
    return [];
  }
}