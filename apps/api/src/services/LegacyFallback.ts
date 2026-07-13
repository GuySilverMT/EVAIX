import { ProviderManager } from './ProviderManager.js';
import { CardAgentState } from '../types.js';

export interface AgentConfig extends CardAgentState {
  providerId?: string;
  internalId?: string;
}

export function parseResponse(text: string): any {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerError) {
        console.error("Regex extraction failed to produce valid JSON:", innerError);
        throw e;
      }
    }
    throw e;
  }
}

export async function generateWithProvider(config: AgentConfig, prompt: string | any[]): Promise<{ text: string, usage?: any }> {
    const { modelId, temperature, maxTokens } = config;

    let providerId = config.providerId || '';
    let actualModelId = modelId || 'gpt-4o';

    if (!providerId && modelId?.includes('/')) {
        const parts = modelId.split('/');
        providerId = parts[0];
        actualModelId = parts.slice(1).join('/');
    }

    if (!providerId) {
        const activeProviders = ProviderManager.getProviderIds();
        if (activeProviders.includes('openai')) {
            providerId = 'openai';
        } else if (activeProviders.length > 0) {
            throw new Error(`Execution failed: Could not infer provider for model '${actualModelId}' and no default 'openai' provider is active.`);
        }
    }

    const provider = ProviderManager.getProvider(providerId);
    if (!provider) {
        throw new Error(`Provider '${providerId}' not found for agent execution.`);
    }

    return await provider.generateCompletion({
        modelId: actualModelId,
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature || 0.7,
        max_tokens: maxTokens || 1024
    });
}
