import { z } from 'zod';

/**
 * Represents an LLM provider.
 */
export interface LLMProvider {
  /** The unique identifier for the provider. */
  id: string;
  /** The name of the provider. */
  name:string;
  /** The display name of the provider. */
  displayName: string;
  /** A list of models available from the provider. */
  models: string[];
  /** The configuration schema for the provider. */
  configSchema: z.ZodObject<any>;
}

/**
 * Represents a request to an LLM for a completion.
 */
export interface LLMCompletionRequest {
  /** The prompt to send to the LLM. */
  prompt: string;
  /** The ID of the provider configuration to use. */
  providerId: string;
  /** The ID of the model to use. */
  modelId: string;
  /** The maximum number of tokens to generate. */
  maxTokens?: number;
  /** The temperature to use for the completion. */
  temperature?: number;
  /** Additional configuration for the request. */
  config?: { [key: string]: any };
}