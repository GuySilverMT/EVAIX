import { initTRPC } from '@trpc/server';
import { z } from 'zod';

/**
 * 1. Initialize tRPC
 * Note: We don't define Context here to avoid circular deps with the DB
 */
const t = initTRPC.create();

/**
 * Creates a tRPC router.
 * Used to define a collection of procedures.
 */
export const createTRPCRouter = t.router;

/**
 * A public tRPC procedure that does not require authentication.
 * Use this for endpoints that should be accessible to everyone.
 */
export const publicProcedure = t.procedure;

/**
 * A protected tRPC procedure that requires authentication.
 * Use this for endpoints that require a logged-in user.
 *
 * @remarks
 * Currently, this is an alias to `publicProcedure`, but it should be configured
 * with middleware to enforce authentication in the future.
 */
export const protectedProcedure = t.procedure;

/**
 * Re-export Zod for schema validation.
 */
export { z };

/**
 * Zod schema for validating model input data.
 * Used for creating or updating LLM model configurations.
 */
export const modelInputSchema = z.object({
  /** The unique identifier for the provider (e.g., 'openai', 'anthropic'). */
  providerId: z.string(),
  /** The unique identifier for the model within the provider (e.g., 'gpt-4', 'claude-3-opus'). */
  modelId: z.string(),
  /** The human-readable name of the model. */
  name: z.string(),
  /** Indicates if the model is free to use. */
  isFree: z.boolean(),
  /** The context window size of the model in tokens. */
  contextWindow: z.number(),
  /** Indicates if the model supports vision capabilities (image input). */
  hasVision: z.boolean(),
  /** Indicates if the model supports reasoning capabilities. */
  hasReasoning: z.boolean(),
  /** Indicates if the model is optimized for coding tasks. */
  hasCoding: z.boolean(),
  /** Additional provider-specific data. */
  providerData: z.record(z.unknown()), // ✅ Better than z.any()
});

/**
 * TypeScript type inferred from `modelInputSchema`.
 * Represents the structure of a model input object.
 */
export type ModelInput = z.infer<typeof modelInputSchema>;
