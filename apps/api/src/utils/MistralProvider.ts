import { HttpsProxyAgent } from 'https-proxy-agent';
import { BaseLLMProvider, CompletionRequest, LLMModel } from './BaseLLMProvider.js';
// import { UsageCollector } from '../services/UsageCollector.js';

export class MistralProvider implements BaseLLMProvider {
  id: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(config: { id: string; apiKey: string; baseURL?: string }) {
    this.id = config.id;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseURL || 'https://api.mistral.ai/v1';
  }

  async getModels(): Promise<LLMModel[]> {
    try {
      const proxy = process.env.HTTPS_PROXY;
      const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;

      const response = await fetch(`${this.baseUrl}/models`, {
        agent,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      } as any);
      
      if (!response.ok) {
        throw new Error(`Mistral API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.data.map((m: any) => ({
        id: m.id,
        providerId: this.id,
        contextWindow: m.context_window || 32000, // Mistral default
        isFree: false, // Mistral API is generally paid, but we can check if they add pricing fields
        name: m.id,
        providerData: m
      }));
    } catch (error) {
      console.error("Failed to fetch Mistral models:", error);
      return [];
    }
  }

  async generateCompletion(request: CompletionRequest): Promise<{ text: string, usage?: any }> {
    try {
      const proxy = process.env.HTTPS_PROXY;
      const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        agent,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: request.modelId,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.max_tokens,
          response_format: request.response_format,
          stream: false
        })
      } as any);

      // Extract headers for rate limiting
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
      // UsageCollector.updateDynamicLimits(this.id, headers);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Mistral API error: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return { text: data.choices[0]?.message?.content || '', usage: data.usage };
    } catch (error) {
      console.error("Mistral generation failed:", error);
      throw error;
    }
  }
}
