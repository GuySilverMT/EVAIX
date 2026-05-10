import { HttpsProxyAgent } from 'https-proxy-agent';
// @ts-ignore
import { OpenAI } from 'openai';
import { BaseLLMProvider, CompletionRequest, LLMModel } from './BaseLLMProvider.js';
import { LLM_TIMEOUT_COMPLEX_MS, LLM_TIMEOUT_STANDARD_MS, LLM_MAX_RETRIES } from '../config/constants.js';
// import { UsageCollector } from '../services/UsageCollector.js';

export class OpenAIProvider implements BaseLLMProvider {
  id: string;
  private client: OpenAI;

  constructor(config: { id: string; apiKey: string; baseURL?: string }) {
    this.id = config.id;
    const proxy = process.env.HTTPS_PROXY;
    const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: LLM_TIMEOUT_COMPLEX_MS, // 120 seconds for Refactor Swarms (Cognitive Recovery)
      maxRetries: LLM_MAX_RETRIES,     // Volcano-native retry logic
      httpAgent: agent,
    } as any);
  }

  async getModels(): Promise<LLMModel[]> {
    try {
        const list = await this.client.models.list();
        return list.data.map((m: any) => {
            // OpenRouter specific: Check pricing
            let isFree = false;
            if (m.pricing) {
                const prompt = parseFloat(m.pricing.prompt);
                const completion = parseFloat(m.pricing.completion);
                if (prompt === 0 && completion === 0) {
                    isFree = true;
                }
            }
            let contextWindow = 4096;
            // OpenRouter uses 'context_length', others might use 'context_window'
            if (m.context_length) contextWindow = m.context_length;
            else if (m.context_window) contextWindow = m.context_window;

            // Normalize specs
            const specs = {
                contextWindow,
                maxOutput: m.max_completion_tokens || 4096,
                hasVision: m.id.toLowerCase().includes('vision') || m.id.toLowerCase().includes('vl'),
                hasReasoning: m.id.toLowerCase().includes('r1') || m.id.toLowerCase().includes('reasoning')
            };

            return { 
                id: m.id, 
                providerId: this.id, 
                isFree, 
                providerData: m, 
                specs,
                name: m.name || m.id // Ensure name is populated
            };
        });
    } catch (e) {
        console.error("Failed to fetch OpenAI models", e);
        return [];
    }
  }

  async generateCompletion(request: CompletionRequest): Promise<{ text: string, usage?: any }> {
    // Validate model ID is provided
    if (!request.modelId || request.modelId.trim() === '') {
      throw new Error(`OpenAIProvider: modelId is required but got: "${request.modelId}"`);
    }

    console.log(`[OpenAIProvider] Calling API with model: "${request.modelId}"`);
    
    // Determine timeout based on operation complexity
    const isComplexOperation = this.isComplexRefactorOperation(request);
    const timeout = isComplexOperation ? LLM_TIMEOUT_COMPLEX_MS : LLM_TIMEOUT_STANDARD_MS;
    
    console.log(`[OpenAIProvider] Using ${timeout/1000}s timeout (Complex: ${isComplexOperation})`);
    
    try {
      const response = await this.client.chat.completions.create({
        model: request.modelId,
        messages: request.messages as any,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        response_format: request.response_format,
      }, {
        timeout, // Dynamic timeout in options object
        maxRetries: LLM_MAX_RETRIES, // Ensure retries are applied per-request
      }).asResponse();

      // Extract headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      // Update dynamic limits
      // UsageCollector.updateDynamicLimits(this.id, headers);
      
      const json = await response.json();
      const content = json.choices[0]?.message?.content || '';
      const usage = json.usage;
      
      if (!content) {
        console.warn('[OpenAIProvider] Empty response from model:', json);
      }
      
      return { text: content, usage };
    } catch (error: any) {
      // Distinguish between timeout and other errors for better debugging
      const errorMessage = error.message || error.error?.message || String(error);
      
      if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
        console.error(`[OpenAIProvider] ⏱️ Timeout after ${timeout/1000}s for model ${request.modelId}`);
        console.error(`[OpenAIProvider] Consider increasing timeout or chunking the operation`);
      }
      
      // FIX: Handle Google models on OpenRouter rejecting system prompts
      if (errorMessage.includes("Developer instruction is not enabled")) {
        console.warn(`[OpenAIProvider] Model rejected system prompt. Retrying with merged prompt...`);
        
        // Merge system prompt into user message
        const mergedMessages = this.mergeSystemPrompt(request.messages);
        
        const response = await this.client.chat.completions.create({
          model: request.modelId,
          messages: mergedMessages as any,
          temperature: request.temperature,
          max_tokens: request.max_tokens,
        }, {
          timeout, // Use same timeout for retry
          maxRetries: LLM_MAX_RETRIES,
        }).asResponse();
        
        const json = await response.json();
        return { text: json.choices[0]?.message?.content || '', usage: json.usage };
      }
      throw error;
    }
  }

  private isComplexRefactorOperation(request: CompletionRequest): boolean {
    // Detect complex operations that may require extended timeouts
    const messageContent = JSON.stringify(request.messages).toLowerCase();
    const complexKeywords = [
      'refactor', 'registry', 'structural', 'migrate', 'transform',
      'nebula', 'architect', 'component manifest', 'large file',
      'move components', 'reorganize', 'split file'
    ];
    
    // Also check for large message payloads (>10KB suggests complex operation)
    const isLargePayload = messageContent.length > 10000;
    
    return complexKeywords.some(keyword => messageContent.includes(keyword)) || isLargePayload;
  }

  private mergeSystemPrompt(messages: any[]): any[] {
    const systemMessages = messages.filter(m => m.role === 'system');
    if (systemMessages.length === 0) return messages;

    const systemPrompt = systemMessages.map(m => m.content).join('\n');
    const newMessages: any[] = [];
    let isFirstUserMessage = true;

    for (const msg of messages) {
      if (msg.role === 'system') continue;
      
      if (isFirstUserMessage && msg.role === 'user') {
        let mergedContent;
        if (typeof msg.content === 'string') {
          mergedContent = `${systemPrompt}\n\n${msg.content}`;
        } else if (Array.isArray(msg.content)) {
          const newContent = [...msg.content];
          if (newContent.length > 0 && newContent[0].type === 'text') {
            newContent[0] = { ...newContent[0], text: `${systemPrompt}\n\n${newContent[0].text}` };
          } else {
            newContent.unshift({ type: 'text', text: `${systemPrompt}\n\n` });
          }
          mergedContent = newContent;
        } else {
          mergedContent = `${systemPrompt}\n\n${JSON.stringify(msg.content)}`;
        }

        newMessages.push({
          role: 'user',
          content: mergedContent
        });
        isFirstUserMessage = false;
      } else {
        newMessages.push(msg);
        if (msg.role === 'user') isFirstUserMessage = false;
      }
    }

    if (isFirstUserMessage && systemPrompt) {
      newMessages.push({
        role: 'user',
        content: systemPrompt
      });
    }

    return newMessages;
  }
}
