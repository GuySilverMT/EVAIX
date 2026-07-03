import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc.js';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export const llmRouter = createTRPCRouter({
  getConfigModels: publicProcedure.query(async () => {
    try {
      const configPath = path.resolve(process.cwd(), '../../litellm_config.yaml');
      const fileContents = fs.readFileSync(configPath, 'utf8');
      const data = yaml.load(fileContents) as any;
      
      const models = data.model_list.map((m: any) => ({
        id: m.model_name,
        name: m.model_name,
        enabled: true,
        color: '#a855f7'
      }));
      return models;
    } catch (e) {
      console.error("Error reading litellm config:", e);
      return [];
    }
  }),

  process: protectedProcedure
    .input(z.object({
      prompt: z.string(),
      modelId: z.string().optional()
    }))
    .mutation(async () => {
      return { text: "Stubbed LLM response" };
    }),

  getUsage: protectedProcedure
    .query(async () => {
      return { totalTokens: 0, cost: 0 };
    })
});
