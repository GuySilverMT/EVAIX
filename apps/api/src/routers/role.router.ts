import { z } from "zod";
import type { Role, Prisma } from "@prisma/client";

interface RouterExtendedRole extends Role {
  needsVision?: boolean;
  needsCoding?: boolean;
  needsReasoning?: boolean;
  needsTools?: boolean;
  needsJson?: boolean;
  needsImageGeneration?: boolean;
  minContext?: number;
  maxContext?: number;
  variants?: Array<Record<string, unknown>>;
}




import * as path from "path";
import { fileURLToPath } from "url";
import { createTRPCRouter, publicProcedure } from "../trpc.js";
import { prisma } from "../db.js";
import { ingestAgentLibrary, onboardProject } from "../services/RoleIngestionService.js";

import { RoleFactoryService } from "../services/RoleFactoryService.js";
import { SkillFinderService } from "../services/SkillFinderService.js";


// Helper function for template-based prompt generation (fallback)
function generateTemplatePrompt(
  name: string,
  goal: string | undefined,
  category: string | undefined,
  capabilities?: {
    vision?: boolean;
    reasoning?: boolean;
    coding?: boolean;
    tools?: boolean;
  }
): string {
  const capabilityList: string[] = [];
  if (capabilities?.vision) capabilityList.push("Vision (multimodal understanding)");
  if (capabilities?.reasoning) capabilityList.push("Advanced reasoning and chain-of-thought");
  if (capabilities?.coding) capabilityList.push("Code generation and analysis");
  if (capabilities?.tools) capabilityList.push("Tool usage and function calling");

  const categoryContext = category ? `\n\n**Category:** ${category}` : "";
  const capabilitiesContext = capabilityList.length > 0
    ? `\n\n**Required Capabilities:**\n${capabilityList.map(c => `- ${c}`).join('\n')}`
    : "";

  return `## ROLE: ${name}${categoryContext}${capabilitiesContext}

**GOAL:**
${goal || "Assist the user with high-quality, accurate responses tailored to this role."}

**CORE INSTRUCTIONS:**
- You are a specialized AI assistant with the role of "${name}".
- Your primary objective is to fulfill the user's request based on your defined goal and capabilities.
- Analyze the context provided and respond efficiently, accurately, and professionally.
- Maintain a helpful, clear, and concise communication style.
- Always prioritize accuracy and relevance in your responses.`;
}


const upsertRoleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required."),
  description: z.string().optional(),
  basePrompt: z.string().min(1, "Base prompt is required."),
  categoryName: z.string().optional().default('Uncategorized'),
  tools: z.array(z.string()).optional().default([]),

  // Modalities / Capabilities
  needsVision: z.boolean().optional(),
  needsReasoning: z.boolean().optional(),
  needsCoding: z.boolean().optional(),
  needsTools: z.boolean().optional(),
  needsJson: z.boolean().optional(),
  needsImageGeneration: z.boolean().optional(),

  // Context Requirements
  minContext: z.number().int().optional(),
  maxContext: z.number().int().optional(),

  // Hardcoded model override
  hardcodedModelId: z.string().optional().nullable(),
  hardcodedProviderId: z.string().optional().nullable(),

  // Additional metadata
  metadata: z.record(z.unknown()).optional(),
});


export const roleRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    // Fetch all roles from the database
    const roles = await prisma.role.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        category: true,
        tools: {
          include: {
            tool: true
          }
        },
        variants: {
          where: { isActive: true },
          take: 1
        },
        modelUsage: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      },

    });

    // OPTIMIZED: Avoid N+1 Model Resolution
    // Only resolve hardcoded models. Otherwise, return 'Auto-Detect'.

    // 1. Collect all hardcoded model IDs
    // 1. Collect all hardcoded model IDs
    const hardcodedIds = new Set<string>();
    roles.forEach(r => {
      const meta = r.metadata as Record<string, unknown>;
      if (typeof meta?.hardcodedModelId === 'string') hardcodedIds.add(meta.hardcodedModelId);

      // Also check variant
      if (r.variants?.length > 0) {
        const variant = r.variants[0];
        // Variant doesn't have 'metadata', assume conf is in cortexConfig
        const cortex = (variant.cortexConfig as Record<string, unknown>) || {};
        // Check if hardcodedModelId is in cortexConfig (schema adjustment assumption)
        if (typeof cortex?.hardcodedModelId === 'string') hardcodedIds.add(cortex.hardcodedModelId);
      }
    });


    // 2. Bulk Fetch Hardcoded Models with Capabilities
    const modelMap = new Map<string, { name: string, capabilities?: any }>();
    if (hardcodedIds.size > 0) {
      const models = await prisma.model.findMany({
        where: { id: { in: Array.from(hardcodedIds) } },
        select: {
          id: true,
          name: true,
          capabilities: true
        }
      });
      models.forEach(m => modelMap.set(m.id, { name: m.name, capabilities: m.capabilities }));
    }


    const enrichedRoles = roles.map((role) => {
      // Scope Extraction (Simple Heuristic)
      let scope = 'Global';
      const desc = (role.description || '').toLowerCase();
      if (desc.includes('frontend') || desc.includes('react') || desc.includes('ui')) scope = 'Frontend (src/components)';
      else if (desc.includes('backend') || desc.includes('api') || desc.includes('database')) scope = 'Backend (apps/api)';
      else if (desc.includes('test') || desc.includes('qa')) scope = 'Tests (*.test.ts)';

      // DNA Fusion: Overlay Variant Config if available
      const activeVariant = role.variants?.[0];
      const fusedRole = { ...role } as RouterExtendedRole;

      // Resolve Model Name logic
      // Resolve Model Name logic
      let currentModelName = 'Auto-Detect';
      const meta = (role.metadata as Record<string, unknown>) || {};

      const cortex = (activeVariant?.cortexConfig as Record<string, unknown>) || {};

      // Priority: Variant Cortex > Role Metadata
      const hardcodedId = (cortex.hardcodedModelId as string) || (meta.hardcodedModelId as string);
      let currentModelCapabilities = null;
      if (hardcodedId) {
        const modelInfo = modelMap.get(hardcodedId);
        currentModelName = modelInfo?.name || 'Unknown Model';
        currentModelCapabilities = modelInfo?.capabilities || null;
      }

      if (activeVariant) {
        // Safely cast JSON config with type check
        const cortexConfig = (activeVariant.cortexConfig && typeof activeVariant.cortexConfig === 'object')
          ? activeVariant.cortexConfig as Record<string, unknown>
          : {};


        const capabilities = Array.isArray(cortexConfig.capabilities) ? cortexConfig.capabilities as string[] : [];

        // 1. Overlay Capabilities (DNA -> Legacy Boolean Flags)
        fusedRole.needsVision = capabilities.includes('vision');
        fusedRole.needsCoding = capabilities.includes('coding');
        fusedRole.needsReasoning = capabilities.includes('reasoning');
        fusedRole.needsTools = capabilities.includes('tools');
        fusedRole.needsJson = capabilities.includes('json');
        fusedRole.needsImageGeneration = capabilities.includes('image_generation') || capabilities.includes('dalle');

        // 2. Overlay Context Window (DNA Context Range -> Legacy Metadata)
        if (cortexConfig.contextRange) {
          // Map context range if needed, e.g. fusedRole.maxContext = ...
        }

        // 3. Overlay System Prompt (DNA Identity -> Legacy basePrompt)
        // Assuming this part was acceptable from common ancestor or HEAD, checking...
        // Actually HEAD has this, ai-context block DOES NOT show it explicitly in the diff I saw, 
        // but I should probably keep it if it's useful.
        // Wait, the diff showed ai-context ENDING at line 249, then some common code, then HEAD at 275.
        // Ah, the conflict markers were weirdly nested or I misread.
        // Let's look at the view_file output again.
        // 215 =======
        // ... ai-context code ...
        // 249 >>>>>>> ai-context
        // 250 (Common code?)


        // Okay, so lines 251-274 are common.
        // Then 275 HEAD vs 290 ======= ??
        // Let's keep common code.
      }

      // RE-INSTATE COMMON CODE logic for System Prompt overlay if needed
      // ...

      // Explicitly map metadata fields to top-level properties effectively
      fusedRole.minContext = typeof meta.minContext === 'number' ? meta.minContext : undefined;
      fusedRole.maxContext = typeof meta.maxContext === 'number' ? meta.maxContext : undefined;

      if (activeVariant) {
        // If DNA exists, it overrides legacy metadata
        const cortex = (activeVariant.cortexConfig as Record<string, unknown>) || {};
        const range = cortex.contextRange as { min: number, max: number } | undefined;
        if (range) {
          fusedRole.minContext = range.min;
          fusedRole.maxContext = range.max;
        }
      }

      return {
        ...fusedRole,
        tools: role.tools.map(t => t.tool.name), // Flatten tools to string[]
        currentModel: currentModelName,
        modelCapabilities: currentModelCapabilities,
        scope: scope,
        healthScore: 100 // Placeholder for AssessmentService score
      };

    });

    // Return roles, or a default role if none exist (prevents UI crash)
    return enrichedRoles.length > 0
      ? enrichedRoles
      : [
        {
          id: "default",
          name: "General Assistant",
          basePrompt: "You are a helpful AI assistant.",
          categoryString: null,
          category: null,
          tools: [],
          metadata: {},
          preferredModels: [],
          currentModel: 'GPT-4o',
          scope: 'Global',
          healthScore: 100
        },
      ];
  }),

  // --- CATEGORY MANAGEMENT ---

  // --- CATEGORY MANAGEMENT ---

  listCategories: publicProcedure.query(async () => {
    // Nested query is tricky with simple client usage.
    // We return flat list and reconstruct tree on client, or return with children.
    // Let's return flat for maximum flexibility in UI.
    return prisma.roleCategory.findMany({
      orderBy: { order: 'asc' },
    });
  }),

  createCategory: publicProcedure
    .input(z.object({ name: z.string().min(1), parentId: z.string().optional() }))
    .mutation(async ({ input }) => {
      return prisma.roleCategory.create({
        data: {
          name: input.name,
          // parentId: input.parentId || null
        }
      });
    }),

  updateCategory: publicProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).optional() }))
    .mutation(async ({ input }) => {
      const data: Prisma.RoleCategoryUpdateInput = {};
      if (input.name) data.name = input.name;

      return prisma.roleCategory.update({
        where: { id: input.id },
        data: data
      });
    }),

  deleteCategory: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const category = await prisma.roleCategory.findUnique({
        where: { id: input.id },
        include: { roles: true } // , children: true } 
      });

      if (category) {
        // Flatten roles: set category to null (or parent?)
        // Let's set to null ('Uncategorized') for safety
        // if(category.children.length > 0) { ... }
        if (false) {
          /* await prisma.roleCategory.updateMany({
             where: { parentId: input.id },
             data: { parentId: category.parentId } 
          }); */
        }
      }

      return prisma.roleCategory.delete({
        where: { id: input.id }
      });
    }),

  moveRoleToCategory: publicProcedure
    .input(z.object({ roleId: z.string(), categoryId: z.string().nullable() }))
    .mutation(async ({ input }) => {
      if (input.categoryId) {
        await prisma.roleCategory.findUnique({ where: { id: input.categoryId } });
      }

      return prisma.role.update({
        where: { id: input.roleId },
        data: {
          categoryId: input.categoryId,
          // categoryString: categoryName // Removed 
        }
      });
    }),

  reorderCategories: publicProcedure
    .input(z.array(z.object({ id: z.string(), order: z.number() })))
    .mutation(async ({ input }) => {
      const updates = input.map(item =>
        prisma.roleCategory.update({
          where: { id: item.id },
          data: { order: item.order }
        })
      );
      return prisma.$transaction(updates);
    }),

  upsert: publicProcedure
    .input(upsertRoleSchema)
    .mutation(async ({ input }) => {
      const { id, name, description, basePrompt, categoryName, tools, ...metadataUpdate } = input;

      const category = await prisma.roleCategory.upsert({
        where: { name: categoryName || 'Uncategorized' },
        update: {},
        create: { name: categoryName || 'Uncategorized' }
      });

      // Prepare metadata
      const existing = id ? await prisma.role.findUnique({
        where: { id },
        select: { metadata: true }
      }) : null;

      const currentMeta = (existing?.metadata as Record<string, unknown>) || {};
      const newMetadata = {
        ...currentMeta,
        ...metadataUpdate
      };

      // Perform upsert
      const role = await prisma.role.upsert({
        where: { id: id || 'new-role-' + Date.now() },
        update: {
          name,
          description,
          basePrompt,
          categoryId: category.id,
          metadata: newMetadata as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
        create: {
          name,
          description: description || '',
          basePrompt,
          categoryId: category.id,
          metadata: newMetadata as Prisma.InputJsonValue,
        }
      });

      // Sync Tools
      if (tools) {
        await prisma.roleTool.deleteMany({ where: { roleId: role.id } });
        for (const toolName of tools) {
          const tool = await prisma.tool.findUnique({ where: { name: toolName } });
          if (tool) {
            await prisma.roleTool.create({
              data: { roleId: role.id, toolId: tool.id }
            }).catch(() => { });
          }
        }
      }

      // Sync DNA Variant for Model Capabilities
      const capabilities = [];
      if (metadataUpdate.needsVision) capabilities.push('vision');
      if (metadataUpdate.needsReasoning) capabilities.push('reasoning');
      if (metadataUpdate.needsCoding) capabilities.push('coding');
      if (metadataUpdate.needsTools) capabilities.push('tools');
      if (metadataUpdate.needsJson) capabilities.push('json');
      if (metadataUpdate.needsImageGeneration) capabilities.push('image_generation');

      const cortexConfig = {
        capabilities,
        contextRange: {
          min: metadataUpdate.minContext || 4096,
          max: metadataUpdate.maxContext || 128000
        },
        hardcodedModelId: metadataUpdate.hardcodedModelId,
        tools: tools || []
      };

      const existingVariant = await prisma.roleVariant.findFirst({
        where: { roleId: role.id, isActive: true }
      });

      if (existingVariant) {
        await prisma.roleVariant.update({
          where: { id: existingVariant.id },
          data: {
            cortexConfig: {
              ...(existingVariant.cortexConfig as Record<string, unknown>),
              ...cortexConfig
            } as Prisma.InputJsonValue
          }
        });
      } else {
        await prisma.roleVariant.create({
          data: {
            roleId: role.id,
            isActive: true,
            cortexConfig: cortexConfig as Prisma.InputJsonValue,
            identityConfig: { personaName: name } as Prisma.InputJsonValue,
            governanceConfig: {} as Prisma.InputJsonValue,
            contextConfig: {} as Prisma.InputJsonValue
          }
        });
      }

      return role;
    }),

  create: publicProcedure
    .input(upsertRoleSchema)
    .mutation(async ({ input }) => {
      // Re-use upsert logic for consistency
      const { id: _id, ...rest } = input;
      // We don't want to pass an ID to create
      // Actually, let's just make it a wrapper for clarity if needed, or just let them use upsert
      return prisma.role.create({
        data: {
          name: input.name,
          basePrompt: input.basePrompt,
          description: input.description || '',
          categoryId: (await prisma.roleCategory.upsert({
            where: { name: input.categoryName || 'Uncategorized' },
            update: {},
            create: { name: input.categoryName || 'Uncategorized' }
          })).id,
          metadata: input as unknown as Prisma.InputJsonValue
        }
      });
    }),




  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // Fetch role to check if it's protected
      const role = await prisma.role.findUnique({
        where: { id: input.id }
      });

      if (role) {
        const protectedNames = ['Role Architect', 'Nebula Architect', 'System Architect'];
        if (protectedNames.includes(role.name)) {
          throw new Error(`Cannot delete protected role: ${role.name}`);
        }
      }

      // Delete the role from the database
      await prisma.role.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),

  ingestLibrary: publicProcedure.mutation(async () => {
    // Get the directory where this router is located
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const agentsDir = path.join(__dirname, "../../../data/agents/en");

    const stats = await ingestAgentLibrary(agentsDir, prisma);
    return {
      message: "Agent library ingestion complete",
      ...stats,
    };
  }),

  generatePrompt: publicProcedure
    .input(
      z.object({
        name: z.string(),
        goal: z.string().optional(),
        category: z.string().optional(),
        capabilities: z.object({
          vision: z.boolean().optional(),
          reasoning: z.boolean().optional(),
          coding: z.boolean().optional(),
          tools: z.boolean().optional(),
        }).optional(),
        tools: z.array(z.string()).optional(),
        roleId: z.string().optional(), // Keep roleId optional for now
        context: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { name, goal, category, capabilities, tools } = input;

      // --- NEW: Real AI-Powered Prompt Generation ---
      console.log(`[PromptGen] 🎨 Generating AI prompt for role: "${name}"...`);

      // 1. Find the Prompt Improver role
      const promptImproverRole = await prisma.role.findFirst({
        where: { name: 'Prompt Improver' },
      });

      if (!promptImproverRole) {
        console.warn('[PromptGen] ⚠️ Prompt Improver role not found, falling back to template');
        // Fallback to template if role doesn't exist
        return generateTemplatePrompt(name, goal, category, capabilities);
      }

      // 2. Build the capability list
      const capabilityList: string[] = [];
      if (capabilities?.vision) capabilityList.push("Vision (multimodal understanding)");
      if (capabilities?.reasoning) capabilityList.push("Advanced reasoning and chain-of-thought");
      if (capabilities?.coding) capabilityList.push("Code generation and analysis");
      if (capabilities?.tools) capabilityList.push("Tool usage and function calling");

      const toolsList = tools && tools.length > 0 ? tools.join(', ') : 'none';

      // 3. Create the prompt engineering request
      const request = `Generate a professional, effective system prompt for an AI assistant with the following specifications:

**Role Name:** ${name}
**Category:** ${category || 'General'}
**Goal:** ${goal || 'Assist the user with high-quality, accurate responses tailored to this role'}
**Required Capabilities:** ${capabilityList.length > 0 ? capabilityList.join(', ') : 'General assistance'}
**Tools Available:** ${toolsList}

Please create a clear, structured system prompt that:
1. Defines the role and its expertise
2. States the primary goal/mission
3. Provides specific, actionable instructions
4. Uses markdown formatting for readability
5. Is concise but comprehensive (150-400 words ideal)

Return ONLY the system prompt, no additional commentary.`;

      try {
        const { createVolcanoAgent } = await import('../services/VolcanoAgent.js');

        const agent = await createVolcanoAgent({
          roleId: promptImproverRole.id,
          modelId: null, // CRITICAL: Setting modelId to null forces getBestModel to run.
          isLocked: false, // Let the system dynamically choose the best model
          temperature: 0.7,
          maxTokens: 1500,
        });

        // 6. Generate with the Prompt Engineer's instructions
        const fullRequest = `${promptImproverRole.basePrompt}\n\n---\n\n${request}`;

        console.log('[PromptGen] 🤖 Calling LLM...');
        const response = await agent.generate(fullRequest);
        const generatedPrompt = typeof response === 'string' ? response : response.text;
        console.log('[PromptGen] ✅ AI-generated prompt created successfully');

        return generatedPrompt;

      } catch (error) {
        console.error('[PromptGen] ❌ Failed to generate AI prompt:', error);
        // Fallback to template on error
        console.log('[PromptGen] 📋 Falling back to template generation');
        return generateTemplatePrompt(name, goal, category, capabilities);
      }
    }),

  onboardProject: publicProcedure
    .input(z.object({ rootPath: z.string() }))
    .mutation(async ({ input }) => {
      const stats = await onboardProject(input.rootPath, prisma);
      return {
        message: "Project onboarding complete",
        ...stats,
      };
    }),

  /**
   * FACTORY 4.0: Create a new DNA Variant
   */
  createVariant: publicProcedure
    .input(z.object({
      roleId: z.string(),
      intent: z.object({
        name: z.string(),
        description: z.string(),
        domain: z.string(),
        complexity: z.enum(['LOW', 'MEDIUM', 'HIGH'])
      })
    }))
    .mutation(async ({ input }) => {
      const factory = new RoleFactoryService();
      // Ensure the Architect exists (Just in case)
      await factory.ensureArchitectRole();

      let targetRoleId = input.roleId;

      // Verify if 'default' or missing - resolve to a "Base Agent"
      if (targetRoleId === 'default' || !targetRoleId) {
        // Find or create "General Assistant"
        const baseName = "General Assistant";
        let baseRole = await prisma.role.findFirst({ where: { name: baseName } });

        if (!baseRole) {
          // Ensure category
          let cat = await prisma.roleCategory.findUnique({ where: { name: 'Assistant' } });
          if (!cat) cat = await prisma.roleCategory.create({ data: { name: 'Assistant', order: 1 } });

          baseRole = await prisma.role.create({
            data: {
              name: baseName,
              description: "A capable general-purpose AI assistant.",
              categoryId: cat.id,
              basePrompt: "You are a helpful AI assistant."
            }
          });
        }
        targetRoleId = baseRole.id;
      }

      return factory.createRoleVariant(targetRoleId, input.intent);
    }),

  /**
   * DNA MANAGEMENT: Update the specific configuration of an active variant
   */
  updateVariantConfig: publicProcedure
    .input(z.object({
      roleId: z.string(),
      variantId: z.string().optional(), // If not provided, updates the active one
      configType: z.enum(['identity', 'cortex', 'governance', 'context', 'tuning', 'tools', 'behavior']), // 'tuning' maps to legacy for now or a new blob
      data: z.record(z.unknown())
    }))

    .mutation(async ({ input }) => {
      // 1. Find the active variant if no ID provided
      let variantId = input.variantId;
      if (!variantId) {
        const role = await prisma.role.findUnique({
          where: { id: input.roleId },
          include: { variants: { where: { isActive: true }, take: 1 } }
        });
        variantId = role?.variants[0]?.id;
      }

      if (!variantId) {
        console.log(`[RoleRouter] 🧬 Auto-creating missing DNA Variant for role ${input.roleId}`);
        const newVariant = await prisma.roleVariant.create({
          data: {
            role: { connect: { id: input.roleId } },
            isActive: true,
            identityConfig: {},
            cortexConfig: { executionMode: 'HYBRID_AUTO', contextRange: { min: 4096, max: 128000 }, capabilities: [], tools: [] },
            governanceConfig: { rules: [], assessmentStrategy: ['LINT_ONLY'], enforcementLevel: 'LOW' },
            contextConfig: { strategy: ['EXPLORATORY'], permissions: ['ALL'] },
            behaviorConfig: { silenceConfirmation: false }
          } as Prisma.RoleVariantCreateInput
        });

        variantId = newVariant.id;

      }

      // 2. Update the specific JSON blob
      // We assume the input.data matches the schema for that config
      const updateData: Prisma.RoleVariantUpdateInput = {};
      if (input.configType === 'identity') updateData.identityConfig = input.data as Prisma.InputJsonValue;
      if (input.configType === 'cortex') updateData.cortexConfig = input.data as Prisma.InputJsonValue;
      if (input.configType === 'governance') updateData.governanceConfig = input.data as Prisma.InputJsonValue;
      if (input.configType === 'context') updateData.contextConfig = input.data as Prisma.InputJsonValue;
      if (input.configType === 'behavior') {
        (updateData as Prisma.RoleVariantUpdateInput & { behaviorConfig: Prisma.InputJsonValue }).behaviorConfig = input.data as Prisma.InputJsonValue;
      }






      // SPECIAL HANDLE: Tools DNA Module
      if (input.configType === 'tools') {
        const tools = (input.data.customTools as string[]) || [];

        // A. Update the Json config in the variant (cortexConfig usually holds tools)
        const variant = await prisma.roleVariant.findUnique({ where: { id: variantId } });
        const currentCortex = (variant?.cortexConfig as Record<string, unknown>) || {};
        updateData.cortexConfig = { ...currentCortex, tools } as Prisma.InputJsonValue;

        // B. Sync the relational table (RoleTool) for MCP tools only
        // Native tools (meta, nebula, read_file, etc.) don't have Tool records
        const NATIVE_TOOL_NAMES = [
          'meta', 'nebula', 'read_file', 'write_file', 'list_files',
          'browse', 'terminal_execute', 'search_codebase', 'list_files_tree',
          'scan_ui_components', 'research.web_scrape', 'analysis.complexity',
          'ui_architect_tree_inspect', 'ui_architect_node_mutate', 'ui_factory_layout_generate',
          'role_registry_list', 'role_variant_evolve', 'role_config_patch'
        ];

        // Filter out native tools
        const mcpToolNames = tools.filter(name => !NATIVE_TOOL_NAMES.includes(name));

        // Clear existing RoleTool entries
        await prisma.roleTool.deleteMany({ where: { roleId: input.roleId } });

        // Create RoleTool entries ONLY for MCP tools
        for (const toolName of mcpToolNames) {
          const toolRecord = await prisma.tool.findUnique({ where: { name: toolName } });
          if (toolRecord) {
            await prisma.roleTool.create({
              data: { roleId: input.roleId, toolId: toolRecord.id }
            }).catch(e => {
              console.warn(`Failed to create RoleTool for ${toolName}:`, e);
            });
          } else {
            console.warn(`Tool '${toolName}' not found in database - skipping RoleTool creation`);
          }
        }
      }

      // Special handling for 'tuning' - store in metadata
      if (input.configType === 'tuning') {
        const role = await prisma.role.findUnique({
          where: { id: input.roleId },
          select: { metadata: true }
        });
        const currentMeta = (role?.metadata as Record<string, unknown>) || {};

        await prisma.role.update({
          where: { id: input.roleId },
          data: {
            metadata: {
              ...currentMeta,
              defaultTemperature: (input.data).defaultTemperature,
              defaultMaxTokens: (input.data).defaultMaxTokens
            } as Prisma.InputJsonValue
          }
        });
      }

      return prisma.roleVariant.update({
        where: { id: variantId },
        data: updateData
      });
    }),

  /**
   * BULK BACKUP: Export all roles with complete configuration
   */
  exportAllRoles: publicProcedure.query(async () => {
    const roles = await prisma.role.findMany({
      include: {
        category: true,
        tools: {
          include: {
            tool: true
          }
        },
        variants: {
          where: { isActive: true },
          take: 1
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const exportData = roles.map(role => {
      const variant = role.variants?.[0];

      return {
        name: role.name,
        description: role.description,
        basePrompt: role.basePrompt,
        categoryString: role.category?.name || 'Uncategorized',
        tools: role.tools.map(t => t.tool.name),

        // DNA Configuration
        dna: variant ? {
          identity: variant.identityConfig || {},
          cortex: variant.cortexConfig || {},
          governance: variant.governanceConfig || {},
          context: variant.contextConfig || {},
          tools: { customTools: role.tools.map(t => t.tool.name) }
        } : null,

        // Legacy parameters (from metadata)
        legacyParams: {
          temperature: (role.metadata as Record<string, unknown>)?.defaultTemperature || 0.7,
          maxTokens: (role.metadata as Record<string, unknown>)?.defaultMaxTokens || 2048,
          modelId: (role.metadata as Record<string, unknown>)?.hardcodedModelId || null
        },

        // Metadata for compatibility
        metadata: role.metadata
      };
    });

    return {
      roles: exportData,
      exportedAt: new Date().toISOString(),
      version: '1.0',
      totalCount: exportData.length
    };
  }),

  /**
   * BULK RESTORE: Import roles from backup file
   */
  importRoles: publicProcedure
    .input(z.object({
      roles: z.array(z.object({
        name: z.string(),
        description: z.string().optional().nullable(),
        basePrompt: z.string(),
        categoryString: z.string().optional(),
        tools: z.array(z.string()).optional(),
        dna: z.object({
          identity: z.record(z.unknown()).optional(),
          cortex: z.record(z.unknown()).optional(),
          governance: z.record(z.unknown()).optional(),
          context: z.record(z.unknown()).optional(),
          tools: z.object({
            customTools: z.array(z.string()).optional()
          }).optional()
        }).optional().nullable(),
        legacyParams: z.object({
          temperature: z.number().optional(),
          maxTokens: z.number().optional(),
          modelId: z.string().optional().nullable()
        }).optional(),
        metadata: z.record(z.unknown()).optional()
      }))
    }))
    .mutation(async ({ input }) => {
      const stats = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[]
      };

      for (const roleData of input.roles) {
        try {
          // Check if role already exists
          const existingRole = await prisma.role.findFirst({
            where: { name: roleData.name }
          });

          if (existingRole) {
            stats.skipped++;
            continue; // Skip existing roles to avoid duplicates
          }

          // Create or get category
          const categoryName = roleData.categoryString || 'Uncategorized';
          const category = await prisma.roleCategory.upsert({
            where: { name: categoryName },
            update: {},
            create: { name: categoryName }
          });

          // Create the role with legacy params in metadata
          const metadata = {
            ...(roleData.metadata || {}),
            defaultTemperature: roleData.legacyParams?.temperature,
            defaultMaxTokens: roleData.legacyParams?.maxTokens,
            hardcodedModelId: roleData.legacyParams?.modelId
          };

          const role = await prisma.role.create({
            data: {
              name: roleData.name,
              description: roleData.description || '',
              basePrompt: roleData.basePrompt,
              categoryId: category.id,
              metadata: metadata as Prisma.InputJsonValue
            }
          });

          // Create DNA variant if exists
          if (roleData.dna) {
            await prisma.roleVariant.create({
              data: {
                roleId: role.id,
                isActive: true,
                identityConfig: (roleData.dna.identity || {}) as Prisma.InputJsonValue,
                cortexConfig: (roleData.dna.cortex || {}) as Prisma.InputJsonValue,
                governanceConfig: (roleData.dna.governance || {}) as Prisma.InputJsonValue,
                contextConfig: (roleData.dna.context || {}) as Prisma.InputJsonValue
              }
            });
          }

          // Connect tools
          if (roleData.tools && roleData.tools.length > 0) {
            const tools = await prisma.tool.findMany({
              where: { name: { in: roleData.tools } }
            });

            if (tools.length > 0) {
              await prisma.roleTool.createMany({
                data: tools.map(tool => ({
                  roleId: role.id,
                  toolId: tool.id
                })),
                skipDuplicates: true
              });
            }
          }

          stats.created++;
        } catch (error) {
          stats.errors.push(`Failed to import ${roleData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return stats;
    }),
});
