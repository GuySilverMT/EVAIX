import { GoogleGenAI, GenerateContentParameters, Part } from '@google/genai';
import { BaseLLMProvider, CompletionRequest, LLMModel } from './BaseLLMProvider.js';

export class GoogleGenAIProvider implements BaseLLMProvider {
  id: string;
  private client: GoogleGenAI;
  private projectConfig: { projectId?: string, location?: string } = {};

  constructor(config: { id: string; apiKey: string; baseURL?: string; projectId?: string; location?: string }) {
    this.id = config.id;
    
    // Initialize the new unified client
    this.client = new GoogleGenAI({
      apiKey: config.apiKey, // Used for AI Studio / simplest API key auth
      // The SDK automatically uses GOOGLE_CLOUD_PROJECT/LOCATION env vars if set,
      // or falls back to API Key.
    });

    this.projectConfig.projectId = config.projectId;
    this.projectConfig.location = config.location;
  }

  setUsageCollector(collector: any) {
    // Implement if needed for sniffing headers (Google doesn't usually use headers)
  }

  async getModels(): Promise<LLMModel[]> {
    try {
      const response = await this.client.models.list();
      
      // Handle SDK response structure (it usually returns an object with a 'models' property)
      const models = (response as any).models || (Array.isArray(response) ? response : []);

      return models.map((m: any) => {
        // Google model names are typically "models/gemini-pro". We strip the prefix for the ID.
        const id = m.name.startsWith('models/') ? m.name.slice(7) : m.name;
        
        return {
          id: id,
          name: m.displayName || id,
          contextWindow: m.inputTokenLimit || 32000,
          // Simple heuristic for free tier, similar to how we handle other providers
          isFree: id.includes('flash') || id.includes('exp') || id.includes('preview'), 
          providerId: this.id,
          providerData: m
        };
      });
    } catch (error) {
      console.error("Failed to fetch Google models:", error);
      return [];
    }
  }

  private formatMessages(messages: any[]): { systemInstruction?: string, contents: any[] } {
    let systemInstruction: string | undefined;
    const contents: any[] = [];

    // 1. Extract System Prompt (if any)
    const systemMessages = messages.filter(m => m.role === 'system');
    if (systemMessages.length > 0) {
      systemInstruction = systemMessages.map(m => m.content).join('\n');
    }

    // 2. Format User/Assistant Messages
    let isFirstUserMessage = true;
    
    for (const msg of messages) {
      if (msg.role === 'system') continue; // Handled above

      let content = msg.content;
      if (Array.isArray(content)) {
        // Fallback for arrays (multimodal): extract and join text parts
        content = content
          .filter(part => part.type === 'text')
          .map(part => part.text)
          .join('\n');
      }
      
      // Merge system prompt into first user message
      if (isFirstUserMessage && msg.role === 'user' && systemInstruction) {
        content = `${systemInstruction}\n\n${content}`;
        systemInstruction = undefined; // Clear it so we don't use it again
        isFirstUserMessage = false;
      } else if (msg.role === 'user') {
        isFirstUserMessage = false;
      }

      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: content }]
      });
    }
    
    return { contents };
  }

  async generateCompletion(request: CompletionRequest): Promise<{ text: string, usage?: any }> {
    const { contents } = this.formatMessages(request.messages);

    const params: GenerateContentParameters = { 
      model: request.modelId,
      contents: contents,
      config: {
        temperature: request.temperature,
        maxOutputTokens: request.max_tokens,
        responseMimeType: request.response_format?.type === 'json_object' ? 'application/json' : undefined,
      },
    };

    // ANTIGRAVITY: Enable Thinking for Gemini 3
//    if (request.modelId.includes('gemini-3')) {
//         eslint-disable-next-line @typescript-eslint/no-explicit-any
//        (params.config as any).thinkingConfig = {
//            thinkingLevel: "high"
//        };
//    }

    try {
      const response = await this.client.models.generateContent(params);
      const usage = (response as any).usageMetadata ? {
        prompt_tokens: (response as any).usageMetadata.promptTokenCount,
        completion_tokens: (response as any).usageMetadata.candidatesTokenCount
      } : undefined;
      return { text: response.text || "", usage };
    } catch (error: any) {
      console.error("GoogleGenAIProvider Error:", error);
      throw error;
    }
  }
}
