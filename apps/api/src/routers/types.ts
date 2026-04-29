import { appRouter } from './index.js';
import { z } from 'zod';

export type AppRouter = typeof appRouter;

export const modelInputSchema = z.object({
  providerId: z.string(),
  modelId: z.string(),
  name: z.string(),
  isFree: z.boolean(),
  contextWindow: z.number(),
  hasVision: z.boolean(),
  hasReasoning: z.boolean(),
  hasCoding: z.boolean(),
  providerData: z.any(),
});
