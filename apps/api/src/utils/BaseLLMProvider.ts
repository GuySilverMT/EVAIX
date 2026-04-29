export interface LLMModel {
  id: string;
  name?: string;
  provider?: string;
  providerId?: string;
  providerConfigId?: string;
  isFree?: boolean;
  costPer1k?: number;
  limitRequestRate?: number;
  limitWindow?: number;
  capabilities?: string[];
  specs?: {
    contextWindow?: number;
    maxOutput?: number;
    hasVision?: boolean;
    hasReasoning?: boolean;
    hasCoding?: boolean;
    hasAudioInput?: boolean;
    hasAudioOutput?: boolean;
    isMultimodal?: boolean;
    supportsFunctionCalling?: boolean;
    supportsJsonMode?: boolean;
    hasImageGen?: boolean;
    hasTTS?: boolean;
    hasEmbedding?: boolean;
    hasOCR?: boolean;
    hasReward?: boolean;
    hasModeration?: boolean;
  };
  [key: string]: unknown;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  modelId: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'text' | 'json_object' };
  [key: string]: unknown;
}

export interface CompletionResponse {
  text: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export interface BaseLLMProvider {
  id: string;
  getModels(): Promise<LLMModel[]>;
  generateCompletion(request: CompletionRequest): Promise<CompletionResponse>;
}
