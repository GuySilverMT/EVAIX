import { BaseLLMProvider } from './BaseLLMProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import { AnthropicProvider } from './AnthropicProvider.js';
import { GoogleGenAIProvider } from './GoogleGenAIProvider.js';
import { OllamaProvider } from './OllamaProvider.js';
import { MistralProvider } from './MistralProvider.js';

export * from './BaseLLMProvider.js';


export class ProviderFactory {

  static createProvider(rawType: string, config: any): BaseLLMProvider {
    const type = (rawType || '').toLowerCase().trim();
    console.log(`[ProviderFactory] Initializing: "${type}" (raw: "${rawType}")`);


    switch (type) {
      // --- GROUP 1: NATIVE PROVIDERS ---
      case 'mistral':
        return new MistralProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);

      case 'google': // Gemini Developer API (AI Studio)
      case 'vertex': // Google Vertex AI (Enterprise)
      case 'vertex-studio': // Legacy handling
        return new GoogleGenAIProvider(config);

      // --- GROUP 2: OPENAI COMPATIBLE (The "Universal" Group) ---
      // The UI sends these specific names, but they all speak "OpenAI"
      case 'openai':
      case 'openrouter':
      case 'groq':
      case 'deepseek':
      case 'cerebras':
      case 'nvidia':
      case 'xai':
      case 'generic-openai': // For custom endpoints
        return new OpenAIProvider({
          ...config,
          // 1. Trust the Base URL from the Database (which came from UI)
          // 2. Fallback to defaults ONLY if DB is empty
          baseURL: config.baseURL || this.getDefaultBaseURL(type)
        });

      case 'ollama':
        if (!config.baseURL) throw new Error('Ollama requires a baseURL accessible from the API runtime.');
        return new OllamaProvider(config);

      default:
        throw new Error(`Provider type '${type}' (from raw: '${rawType}') is not supported yet.`);
    }
  }

  // Helper to keep the switch clean
  private static getDefaultBaseURL(rawType: string): string | undefined {
    const type = (rawType || '').toLowerCase().trim();
    switch (type) {

      case 'openrouter': return 'https://openrouter.ai/api/v1';
      case 'mistral': return 'https://api.mistral.ai/v1';
      case 'groq': return 'https://api.groq.com/openai/v1';
      case 'cerebras': return 'https://api.cerebras.ai/v1';
      case 'nvidia': return 'https://integrate.api.nvidia.com/v1';
      case 'xai': return 'https://api.x.ai/v1';
      default: return undefined; // Let SDK default to api.openai.com
    }
  }
}
