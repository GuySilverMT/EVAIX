import { Agent } from '@mastra/core/agent';
import { createOpenAI } from '@ai-sdk/openai';
import { ProviderManager } from './ProviderManager.js';

/**
 * @description Instantiates Mastra Agents routed through the LiteLLM Proxy.
 */
export class MastraAgentFactory {
  static createAgent(name: string, instructions: string, tools: any = {}): Agent {
    // Retrieve the bootstrapped LiteLLM config
    const liteLlmProvider = ProviderManager.getProvider('litellm-router') as any;
    const baseURL = liteLlmProvider?.baseURL || liteLlmProvider?.config?.baseURL || 'http://localhost:8080/v1';
    const apiKey = process.env.LITELLM_MASTER_KEY || 'sk-litellm-key';

    // LiteLLM is fully compatible with the standard OpenAI SDK
    const liteLlmModel = createOpenAI({
      baseURL,
      apiKey,
    });

    return new Agent({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name: name,
      instructions: instructions,
      // Target the router endpoint, LiteLLM handles the upstream mapping
      model: liteLlmModel('gpt-4o'), 
      tools: tools,
    });
  }
}
