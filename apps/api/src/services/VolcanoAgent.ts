import { ProviderManager } from './ProviderManager.js';
import { CardAgentState } from '../types.js';

export interface AgentConfig extends CardAgentState {
  providerId?: string;
  internalId?: string;
  // Add any specific properties if needed
}


export class VolcanoAgent {
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  getConfig() {
    return this.config;
  }

  async generate(prompt: string | any[]): Promise<{ text: string, usage?: any }> {
    const { modelId, temperature, maxTokens } = this.config;
    
    // ...
    let providerId = this.config.providerId || ''; 
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

  /**
   * [RESILIENCE] Extract JSON from potentially messy LLM output.
   * Handles conversational fluff and markdown wrapping.
   */
  public static parseResponse(text: string): any {
    try {
      return JSON.parse(text);
    } catch (e) {
      // Fallback: extract the largest JSON block using balanced brace matching regex
      // Note: Javascript does not support recursive regex (?R), so we use a greedy match 
      // from the first '{' to the last '}' which covers most single-JSON response cases.
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (innerError) {
          console.error("[VolcanoAgent] Regex extraction failed to produce valid JSON:", innerError);
          throw e; // Throw original error for better context
        }
      }
      throw e;
    }
  }
}

export function createVolcanoAgent(config: AgentConfig): Promise<VolcanoAgent> {
  return Promise.resolve(new VolcanoAgent(config));
}
