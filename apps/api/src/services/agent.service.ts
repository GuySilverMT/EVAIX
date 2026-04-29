import { z } from "zod";
import * as fs from 'fs/promises';
import * as path from 'path';
import { AgentRuntime } from "./AgentRuntime.js";
import { createVolcanoAgent, VolcanoAgent, type AgentConfig } from "./VolcanoAgent.js";

import { ProviderManager } from "./ProviderManager.js";
import { blacklistModel, isModelBlacklisted } from "../rateLimiter.js";

import { prisma } from "../db.js";
import type { Role } from "@prisma/client";
import {
  getBestModel,
  updateReward,
  resolveModelForRole,
  recordModelFailure,
  recordProviderFailure,
  type ModelSelectionResult
} from "./modelManager.service.js";


import { InstructionChain } from "../utils/InstructionChain.js";

// [RESILIENCE] Standard schema, no changes needed here
export const startSessionSchema = z.object({
  roleId: z.string(),
  modelConfig: z.object({
    providerId: z.string().optional(),
    modelId: z.string().optional(),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().min(256).max(128000).default(1024), // Most roles (JSON/tools) need 1024; planning/writing roles specify higher in metadata
  }),
  userGoal: z.string().min(1, "User goal/prompt is required"),
  cardId: z.string(),
  context: z
    .object({
      targetDir: z.string().optional(),
      targetFile: z.string().optional(),
      screenspaceId: z.string().optional(),
    })
    .optional(),
  sessionId: z.string().optional(),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;

const BASE_PROMPT_SQL_HELPER = `
You are an expert PostgreSQL Query Generator. Your task is to translate the user's natural language request into a single, clean SQL query that can be executed against the available database tables.

The user is querying the following table schemas:
[TABLE_SCHEMAS_CONTEXT]

User Request: [USER_PROMPT]

Constraints:
1. Only output the raw SQL query text. Do NOT include any markdown, commentary, or explanation (e.g., do not use \`\`\`sql ... \`\`\`).
2. Only use SELECT statements. Do not use INSERT, DELETE, DROP, or ALTER.
`;

export interface ExtendedRole extends Omit<Role, 'basePrompt'> {
  needsVision?: boolean;
  needsCoding?: boolean;
  needsReasoning?: boolean;
  needsTools?: boolean;
  basePrompt?: string;
  variants?: unknown[];
}

interface RoleVariantWithBehavior {
    identityConfig: Record<string, unknown>;
    cortexConfig: Record<string, unknown>;
    contextConfig: Record<string, unknown>;
    governanceConfig: Record<string, unknown>;
    behaviorConfig: { silenceConfirmation?: boolean };
}


export class AgentService {
  async startSession(input: StartSessionInput) {
    const sessionId = input.sessionId || `session-${input.cardId}-${Date.now()}`;
    const context: any = { input, sessionId };

    const pipeline = new InstructionChain(context)
      .addStep("resolve_context", async (ctx) => {
        const { cardId, context: inputCtx, userGoal } = ctx.input;
        const card = await prisma.workOrderCard.findUnique({
          where: { id: cardId },
          include: { workspace: true },
        });
        ctx.projectPrompt = card?.workspace.systemPrompt || undefined;

        ctx.finalUserGoal = userGoal;
        if (inputCtx?.targetDir) {
          ctx.finalUserGoal = `Context: Target Directory: ${inputCtx.targetDir}\n\n${userGoal}`;
        }
        return ctx;
      })
      .addStep("select_brain", async (ctx) => {
        const { roleId, modelConfig } = ctx.input;
        const rawRole = await prisma.role.findUnique({
          where: { id: roleId },
          include: { tools: { include: { tool: true } }, variants: { where: { isActive: true }, take: 1 } }
        });

        const role: ExtendedRole | null = rawRole ? { ...rawRole } as ExtendedRole : null;
        let tools = rawRole?.tools.map(rt => rt.tool.name) || [];
        let executionMode: string = 'HYBRID_AUTO';
        let silenceConfirmation: boolean = false;
        let cortexMaxOutputTokens: number | null = null;

        if (role && rawRole?.variants?.length) {
          const v = rawRole.variants[0];
          const cortex = (v.cortexConfig as Record<string, unknown>) || {};
          const identity = (v.identityConfig as Record<string, unknown>) || {};
          const caps = (Array.isArray(cortex.capabilities) ? cortex.capabilities : []) as string[];

          role.needsVision = caps.includes('vision');
          role.needsCoding = caps.includes('coding');
          role.needsReasoning = caps.includes('reasoning');
          role.needsTools = caps.includes('tools');

          if (typeof cortex.executionMode === 'string') executionMode = cortex.executionMode;
          if (typeof cortex.maxOutputTokens === 'number') cortexMaxOutputTokens = cortex.maxOutputTokens;
          
          const behavior = (v as unknown as RoleVariantWithBehavior).behaviorConfig || {};
          if (typeof behavior.silenceConfirmation === 'boolean') silenceConfirmation = behavior.silenceConfirmation;
          if (typeof identity.systemPromptDraft === 'string' && identity.systemPromptDraft) role.basePrompt = identity.systemPromptDraft;
          if (Array.isArray(cortex.tools)) {
            const extraTools = cortex.tools as string[];
            tools = Array.from(new Set([...tools, ...extraTools]));
          }
        }

        let resolvedModelId = modelConfig.modelId || null;
        let resolvedProviderId = modelConfig.providerId || undefined;

        if (resolvedModelId && resolvedModelId.length === 25 && resolvedModelId.startsWith('c')) {
           const modelRecord = await prisma.model.findUnique({ where: { id: resolvedModelId }, include: { provider: true } });
           if (modelRecord) {
             resolvedModelId = modelRecord.name;
             resolvedProviderId = modelRecord.providerId;
           }
        }

        // [ROLE-SPECIFIC] Extract maxTokens with priority: cortexConfig > metadata > modelConfig
        const roleMetadata = (role?.metadata || {}) as Record<string, unknown>;
        const metadataMaxTokens = typeof roleMetadata.maxTokens === 'number' ? roleMetadata.maxTokens : null;
        const effectiveMaxTokens = cortexMaxOutputTokens || metadataMaxTokens || modelConfig.maxTokens;

        let bestModel: any = null;

        if (!resolvedModelId) {
          const totalEstimatedChars = (role?.basePrompt?.length || 0) + ctx.finalUserGoal.length + 5000;
          const estimatedTokens = Math.ceil(totalEstimatedChars / 3.5);
          
          // Pass maxTokens as a requirement so selector chooses a model that can handle it
          const baseRole = role || { id: 'default', metadata: {} };
          const existingRequirements = (roleMetadata.requirements as Record<string, unknown>) || {};
          
          const roleWithMaxOutput = {
            ...baseRole,
            metadata: {
              ...(baseRole.metadata || {}),
              requirements: {
                ...existingRequirements,
                minOutputTokens: effectiveMaxTokens // Ensure model can handle required output
              }
            }
          } as any;
          
          const bestSlug = await resolveModelForRole(roleWithMaxOutput, estimatedTokens, []);
          bestModel = await prisma.model.findUnique({ where: { id: bestSlug }, include: { provider: true, capabilities: true } });
          if (bestModel) {
            resolvedModelId = bestModel.name;
            resolvedProviderId = bestModel.providerId;
          }
        } else if (resolvedModelId) {

          // If modelId was provided, we still want the internal record for failures
          bestModel = await prisma.model.findFirst({ 
            where: { 
              OR: [
                { id: resolvedModelId },
                { name: resolvedModelId }
              ]
            } 
          });
        }


        ctx.role = role;
        ctx.tools = tools;
        ctx.executionMode = executionMode;
        ctx.silenceConfirmation = silenceConfirmation;
        ctx.agentConfig = {
          roleId,
          modelId: resolvedModelId!,
          providerId: resolvedProviderId,
          internalId: (bestModel as any)?.id || resolvedModelId!, // bestModel is from line 165
          isLocked: false,
          temperature: modelConfig.temperature,
          maxTokens: effectiveMaxTokens,
          userGoal: ctx.finalUserGoal,
          projectPrompt: ctx.projectPrompt,
        };

        return ctx;
      })
      .addStep("jit_tool_mount", async (ctx) => {
        let tier = 'Worker';
        if (ctx.role?.name.toLowerCase().includes('architect')) tier = 'Architect';
        else if (ctx.role?.name.toLowerCase().includes('nebula')) tier = 'Nebula';
        else if (ctx.tools.includes('meta')) tier = 'Architect';

        ctx.runtime = await AgentRuntime.create(undefined, ctx.tools, tier, ctx.executionMode, ctx.silenceConfirmation);
        if (ctx.input.context?.screenspaceId) {
            (ctx.runtime as any).baggage = { ...((ctx.runtime as any).baggage || {}), screenspaceId: ctx.input.context.screenspaceId };
        }
        return ctx;
      })
      .addStep("execute_loop", async (ctx) => {
        const agent = await createVolcanoAgent(ctx.agentConfig!);
        const initialResponse = await ctx.runtime!.generateWithContext(
          agent,
          ctx.role?.basePrompt || "",
          ctx.finalUserGoal,
          ctx.input.roleId,
          ctx.sessionId
        ) as string;

        const { result, logs } = await ctx.runtime!.runAgentLoop(
          ctx.finalUserGoal,
          initialResponse,
          async (retryPrompt: string) => {
            return await ctx.runtime!.generateWithContext(agent, ctx.role?.basePrompt || "", retryPrompt, ctx.input.roleId) as string;
          }
        );

        return { result, logs, agent };
      });

    const execution = await pipeline.execute();
    const { result, logs, agent } = execution;

    // Save final state
    try {
      const filePath = context.input.context?.targetFile || path.join(process.cwd(), 'sessions', `${input.cardId}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, result, 'utf-8');
    } catch (e) { console.error("File save error", e); }

    return {
      sessionId,
      status: "completed",
      cardId: input.cardId,
      result,
      logs,
      modelId: agent?.getConfig().modelId || context.agentConfig.modelId,
      providerId: agent?.getConfig().providerId || context.agentConfig.providerId,
    };
  }

  async generateQuery(input: {
    userPrompt: string;
    targetTable?: string;
    roleName?: string;
  }) {
    const { userPrompt, targetTable, roleName = "sql-query-helper" } = input;

    // 1. Try to find an optional role; fall back to base prompt if none
    let role = null;
    if (roleName) {
      role = await prisma.role.findFirst({ where: { name: roleName } });
      if (!role) {
        console.warn(
          `[AgentService] Role "${roleName}" not found; proceeding without role-specific settings.`
        );
      }
    }

    // 2. Build schema context (lightweight)
    let schemaContext = "";
    if (targetTable) {
      const rows = await prisma.$queryRawUnsafe<{ column_name: string; data_type: string }[]>(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${targetTable}'`
      );
      schemaContext = rows.length
        ? `The primary table is "${targetTable}" with columns: ` +
        rows.map((r) => `${r.column_name} (${r.data_type})`).join(", ")
        : "";
    }

    // 3. Final prompt
    const finalPrompt = ((role && role.basePrompt) || BASE_PROMPT_SQL_HELPER)
      .replace("[TABLE_SCHEMAS_CONTEXT]", schemaContext)
      .replace("[USER_PROMPT]", userPrompt);

    // 4. Select Model using Dynamic Role Criteria
    let selectedModel: ModelSelectionResult | null = null;
    try {
      selectedModel = await getBestModel(role?.id, [], []);
    } catch (e) {
      console.warn(
        `[AgentService] Dynamic model selection failed for role ${roleName}:`,
        e
      );
    }

    // Fallback if dynamic selection fails
    if (!selectedModel) {
      console.log(
        `[AgentService] Falling back to any enabled model for ${roleName}`
      );
      const fallback = await prisma.model.findFirst({
        where: { provider: { isEnabled: true } },
        include: { provider: true },
      });

      if (fallback) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        const metadata = ((role as any)?.metadata as Record<string, unknown>) || {};
        selectedModel = {
          modelId: fallback.id,
          providerId: fallback.providerId,
          model: fallback,
          temperature: (metadata.defaultTemperature as number) || 0.1,
          maxTokens: (metadata.defaultMaxTokens as number) || 1024,
        };
      }
    }

    if (!selectedModel)
      throw new Error("No suitable models available for SQL generation.");

    console.log(
      `[AgentService] Generating SQL using model: ${selectedModel.modelId} (${selectedModel.providerId})`
    );

    // Attempt generation with retries and model fallbacks on invalid-model errors
    const maxAttempts = 3;
    const failedModels: string[] = [];
    const failedProviders: string[] = [];
    let attempt = 0;
    let queryText = "";

    while (attempt < maxAttempts) {
      if (!selectedModel) break;
      attempt++;
      const provider = ProviderManager.getProvider(selectedModel.providerId);
      if (!provider)
        throw new Error(
          `Selected provider ${selectedModel.providerId} is not initialized.`
        );

      try {
        const response = await provider.generateCompletion({
          modelId: selectedModel.modelId,
          messages: [{ role: "user", content: finalPrompt }],
          temperature: selectedModel.temperature ?? 0.1,
          max_tokens: selectedModel.maxTokens ?? 1024,
        });

        // Strip markdown code blocks if present
        queryText = (response.text || "").trim();
        if (queryText.startsWith("```sql")) {
          queryText = queryText
            .replace(/^```sql\s*/, "")
            .replace(/\s*```$/, "");
        } else if (queryText.startsWith("```")) {
          queryText = queryText.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        // Success
        break;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(
          `[AgentService] Model generation failed for ${selectedModel.modelId} (${selectedModel.providerId}): ${errMsg}`
        );

        // If provider says invalid model, blacklist this model and try again
        if (/provider|not found|model|rate limit|429|quota|overloaded|busy|capacity|timeout|APIConnectionTimeoutError|fetch|connection|econnrefused|network/i.test(errMsg)) {
          // Persist the failure
          try {
            const failingId = (selectedModel as any).internalId || selectedModel.modelId;
            console.warn(`[Arbitrage] Model ${failingId} rate limited. Swapping...`);
            await blacklistModel(failingId, 600);
            await updateReward(failingId, false, undefined, errMsg);

            
            await recordModelFailure(
              selectedModel.providerId,
              selectedModel.modelId,
              role?.id
            );

            recordProviderFailure(selectedModel.providerId, role?.id);
          } catch (recErr) {
            console.warn(
              "[AgentService] Failed to persist model/provider failure:",
              recErr
            );
          }

          // Add provider-level fallback
          if (!failedProviders.includes(selectedModel.providerId))
            failedProviders.push(selectedModel.providerId);

          // Also track the failed model id
          if (!failedModels.includes(selectedModel.modelId))
            failedModels.push(selectedModel.modelId);

          // Select a new model avoiding the failed ones
          try {
            selectedModel = await getBestModel(
              role?.id,
              failedModels,
              failedProviders
            );
            if (!selectedModel) {
              console.warn(
                "[AgentService] No alternative model available after failure"
              );
              throw new Error("No alternative models available");
            }
            console.log(
              `[AgentService] Retrying with new model: ${selectedModel.modelId} (${selectedModel.providerId})`
            );
          } catch (selectErr) {
            console.warn(
              "[AgentService] Failed to select alternative model:",
              selectErr
            );
            // Try fallback selection
            try {
              const fallback = await getBestModel(
                role?.id,
                failedModels,
                failedProviders
              );
              if (!fallback) throw new Error("No fallback model available");
              selectedModel = fallback;
              console.log(
                `[AgentService] Retrying with fallback: ${selectedModel.modelId} (${selectedModel.providerId})`
              );
              continue;
            } catch (fallbackErr) {
              console.warn(
                "[AgentService] Fallback selection failed:",
                fallbackErr
              );
            }
          }
        } else {
          throw err;
        }
      }
    }

    if (!queryText)
      throw new Error("Failed to generate query after multiple attempts.");

    return { queryText };
  }
}
