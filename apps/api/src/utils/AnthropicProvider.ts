import { BaseLLMProvider, CompletionRequest, LLMModel } from './BaseLLMProvider.js';

export class AnthropicProvider implements BaseLLMProvider {
  id: string;

  constructor(config: { id: string; apiKey: string; baseURL?: string }) {
    this.id = config.id;
  }

  async getModels(): Promise<LLMModel[]> {
    throw new Error("Anthropic getModels not implemented.");
  }

  async generateCompletion(request: CompletionRequest): Promise<{ text: string, usage?: any }> {
    throw new Error("Anthropic generateCompletion not implemented.");
  }
}
