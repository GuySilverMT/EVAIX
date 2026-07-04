import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../trpc.js";
import { TRPCError } from "@trpc/server";
import { createOpenAI } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import fs from "fs/promises";
import path from "path";
import { fetchAllProviderModels } from "../utils/modelFetcher.js";

// Live connection to the LiteLLM container proxy
const liteLlmProvider = createOpenAI({
  baseURL: process.env.LITELLM_API_BASE || "http://localhost:8080/v1",
  apiKey: process.env.LITELLM_MASTER_KEY || "sk-litellm-key",
  headers: {
    "Authorization": `Bearer ${process.env.LITELLM_MASTER_KEY || "sk-litellm-key"}`
  }
});

const ROLES_DIR = path.join(process.cwd(), "data", "agents");

export const llmRouter = createTRPCRouter({
  // Completely gutted and rewired to hit raw APIs directly
  getConfigModels: publicProcedure.query(async () => {
    try {
      const liveModels = await fetchAllProviderModels();

      // Safety gate: ensures your ModelBar never goes blank if an API times out
      if (liveModels.length === 0) {
        return [
          { id: "llama3-70b-8192", name: "Groq Llama 3 Backup", provider: "Groq", color: "#f59e0b", enabled: true }
        ];
      }

      return liveModels;
    } catch (e) {
      console.error("[llmRouter] Failed compiling direct API model array:", e);
      return [];
    }
  }),

  // The real agent execution loop.
  // modelId, roleId, contextDepth, and prompt all flow directly from the client-side
  // mutation hook (driven by the ModelBar dropdown, the AgentDNA role selector, and
  // the context depth slider) into a Mastra Agent bound to the chosen LiteLLM model.
  runAgentSession: protectedProcedure
    .input(
      z.object({
        modelId: z.string(),
        roleId: z.string(),
        contextDepth: z.number(),
        prompt: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Load the Agent DNA system prompt file directly from disk.
        const rolePath = path.join(ROLES_DIR, `${input.roleId}.md`);
        let systemInstructions = "You are a helpful AI assistant.";

        try {
          systemInstructions = await fs.readFile(rolePath, "utf-8");
        } catch {
          console.warn(
            `Role file ${input.roleId}.md not found, using generic persona.`,
          );
        }

        // Initialize a clean Mastra agent on the fly with the exact model selected.
        const dynamicAgent = new Agent({
          id: `run-${input.roleId}`,
          name: `Running ${input.roleId}`,
          instructions: systemInstructions,
          model: liteLlmProvider(input.modelId),
        });

        // Generate the text. contextDepth caps the conversation history sent to the model,
        // so the context window is bounded exactly by what the slider was set to before run.
        const response = await dynamicAgent.generate(input.prompt, {
          memory: {
            thread: {
              id: `run-${input.roleId}-${Date.now()}`,
              resourceId: input.roleId,
            },
            options: {
              lastMessages: input.contextDepth,
            },
          },
        });

        return {
          text: response.text,
          modelUsed: input.modelId,
          roleUsed: input.roleId,
        };
      } catch (err: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Agent execution failed: ${err.message}`,
        });
      }
    }),
});
