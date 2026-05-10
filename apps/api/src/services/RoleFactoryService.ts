import { identityArchitect, getIdentityFallback, IdentityConfig } from './IdentityArchitect.js';
import { cortexArchitect, getCortexFallback, CortexConfig } from './CortexArchitect.js';
import { contextArchitect, getContextFallback, ContextConfig } from './ContextArchitect.js';
import { governanceArchitect, getGovernanceFallback, GovernanceConfig } from './GovernanceArchitect.js';
import { executeJsonMode } from './architectHelpers.js';
import { RoleVariant, Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { ProviderManager } from './ProviderManager.js';
import { type BaseLLMProvider } from '../utils/BaseLLMProvider.js';
import { resolveModelForRole } from './modelManager.service.js';

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { COORDINATOR_PROTOCOL_SNIPPET } from '../prompts/CoordinatorProtocol.js';
import * as Constants from './roleFactoryConstants.js';

const execAsync = promisify(exec);

// Type-safe helper for accessing providerData
interface ProviderDataWithId {
    id?: string;
    [key: string]: unknown;
}

// Type guard for error objects
interface ExecError extends Error {
    stderr?: string;
}

export type AgentExecutionMode = 'JSON_STRICT' | 'CODE_INTERPRETER' | 'HYBRID_AUTO';

export interface RoleIntent {
    name: string;
    description: string;
    domain: string; // e.g., "Frontend", "Backend", "Creative"
    complexity: 'LOW' | 'MEDIUM' | 'HIGH';
    capabilities?: string[]; // e.g. ['vision', 'reasoning', 'tts', 'embedding']
}



/**
 * RoleFactoryService (Factory 4.0 - Unlocked)
 * 
 * Assembles "Synthetic Organisms" (RoleVariants) by configuring their DNA modules.
 * Now powered by the "Role Architect" Meta-Agent via ProviderManager.
 */
export class RoleFactoryService {

    /**
     * The Master Method: Assembles a new RoleVariant from intent
     */
    /**
     * Executes an architect stage using a structured JSON strategy.
     * This is much more robust than "Code Mode" for configuration data.
     */

    /**
     * Master method for code execution (Legacy/Hybrid support)
     */
    private async executeCodeMode<T>(code: string, timeoutInput: unknown = Constants.TIMEOUT_DEFAULT): Promise<T> {
        const timeout = typeof timeoutInput === 'number' ? timeoutInput : (Number(timeoutInput) || Constants.TIMEOUT_DEFAULT);
        // Robust extraction: try to find a block or at least the roleBuilder call
        let cleanCode = code;

        // 1. Try to extract triple-backtick block
        const blockMatch = code.match(/```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/);
        if (blockMatch) {
            cleanCode = blockMatch[1];
        } else {
            // 2. See if there is a roleBuilder call anywhere
            const callMatch = code.match(/(roleBuilder\.set[a-zA-Z]+\s*\([\s\S]*\)\s*;?)/);
            if (callMatch) {
                cleanCode = callMatch[1];
            }
        }

        const tempDir = path.join(process.cwd(), '.temp', 'role-builder');
        await fs.mkdir(tempDir, { recursive: true });
        const fileName = `architect_${Date.now()}_${Math.random().toString(36).substring(7)}.ts`;
        const filePath = path.join(tempDir, fileName);

        // Minimal Shim for Role Building
        const SHIM = `
const __result = {};
const meta = {}; // Safety shim for models hallucinating a global meta object
const roleBuilder = {
    setIdentity: (config) => { Object.assign(__result, { identityConfig: config }); },
    setCortex: (config) => { Object.assign(__result, { cortexConfig: config }); },
    setContext: (config) => { Object.assign(__result, { contextConfig: config }); },
    setGovernance: (config) => { Object.assign(__result, { governanceConfig: config }); },
    setTools: (tools) => { Object.assign(__result, { tools }); }
};

try {
    ${cleanCode}
} catch (err) {
    console.error("RUNTIME_ERROR: " + err.message);
    process.exit(1);
}

process.stdout.write(JSON.stringify(__result));
`;

        try {
            await fs.writeFile(filePath, SHIM, 'utf-8');
            const { stdout } = await execAsync(`npx tsx ${filePath}`, { timeout, cwd: tempDir });
            return JSON.parse(stdout.trim()) as T;
        } catch (e: unknown) {
            const error = e as ExecError;
            console.error(`[RoleFactory] Code Execution Failed for snippet: ${cleanCode.substring(0, 100)}...`, error.stderr || error.message);
            throw new Error(`Architect Code Execution Failed: ${error.message}`);
        } finally {
            try { await fs.unlink(filePath); } catch { }
        }
    }


    async createRoleVariant(roleId: string, intent: RoleIntent): Promise<RoleVariant> {
        console.log(`[RoleFactory] 🧬 Assembling DNA for role: ${intent.name} (${intent.complexity})`);

        // State for Sticky Model Selection
        let currentModelId: string | null = null;
        let currentProvider: BaseLLMProvider | null = null;
        const excludedModelIds: string[] = [];

        // Helper to ensure we have a working brain
        const ensureBrain = async () => {
            if (currentModelId && currentProvider) return { modelId: currentModelId, provider: currentProvider };

            try {
                const brain = await this.getArchitectBrain(excludedModelIds);
                currentModelId = brain.modelId;
                currentProvider = brain.provider;
                return brain;
            } catch (err) {
                console.error("[RoleFactory] 💀 Critical: Could not find ANY capable architect model.", err);
                throw err;
            }
        };

        // Resilience Wrapper: Tries current model, if fails -> records exclusion -> picks new model -> retries
        const executeWithResilience = async <T>(
            stageName: string,
            operation: (modelId: string) => Promise<T>,
            fallbackGenerator: () => T
        ): Promise<T> => {
            const MAX_RETRIES = Constants.MAX_RETRIES;
            let attempts = 0;

            while (attempts <= MAX_RETRIES) {
                try {
                    const brain = await ensureBrain();
                    return await operation(brain.modelId);
                } catch (error) {
                    attempts++;
                    const isLastAttempt = attempts > MAX_RETRIES;
                    const errorMsg = error instanceof Error ? error.message : String(error);

                    console.warn(`[RoleFactory] ⚠️ ${stageName} Architect failed with model ${currentModelId} (Attempt ${attempts}/${MAX_RETRIES + 1}). Error: ${errorMsg}`);

                    // Mark current model as bad for this session
                    if (currentModelId) {
                        excludedModelIds.push(currentModelId);
                        currentModelId = null; // Force refresh
                        currentProvider = null;
                    }

                    if (isLastAttempt) {
                        console.error(`[RoleFactory] ❌ ${stageName} Architect exhausted all retries. Using Fallback.`);
                        break;
                    }
                }
            }

            return fallbackGenerator();
        };

        // 1. Identity Architect
        const identityConfig = await executeWithResilience<IdentityConfig>(
            "Identity",
            (mid) => identityArchitect(mid, intent),
            () => getIdentityFallback(intent)
        );

        // 2. Cortex Architect
        const cortexConfig = await executeWithResilience<CortexConfig>(
            "Cortex",
            (mid) => cortexArchitect(mid, intent),
            () => getCortexFallback(intent)
        );

        // 3. Context Architect
        const contextConfig = await executeWithResilience<ContextConfig>(
            "Context",
            (mid) => contextArchitect(mid, intent),
            () => getContextFallback(intent)
        );

        // 4. Governance Architect
        const governanceConfig = await executeWithResilience<GovernanceConfig>(
            "Governance",
            (mid) => governanceArchitect(mid, intent),
            () => getGovernanceFallback(intent)
        );

        // 5. Tool Architect
        const toolNames = await executeWithResilience<string[]>(
            "Tool",
            (mid) => this.toolArchitect(mid, intent),
            () => ['filesystem', 'terminal']
        );
        cortexConfig.tools = toolNames;

        // 6. Persist the DNA
        const variant = await prisma.roleVariant.create({
            data: {
                roleId: roleId,
                identityConfig: identityConfig as unknown as Prisma.InputJsonValue,
                cortexConfig: cortexConfig as unknown as Prisma.InputJsonValue,
                governanceConfig: governanceConfig as unknown as Prisma.InputJsonValue,
                contextConfig: contextConfig as unknown as Prisma.InputJsonValue,
                isActive: true
            }
        });

        // Ensure Role has isEvolved flag
        const currentRole = await prisma.role.findUnique({ where: { id: roleId } });
        if (currentRole) {
             const meta = (currentRole.metadata as Record<string, unknown>) || {};
             meta.isEvolved = true;
             meta.sourceOfTruth = 'DB';
             await prisma.role.update({
                  where: { id: roleId },
                  data: { metadata: meta as Prisma.JsonObject }
             });
        }

        console.log(`[RoleFactory] ✅ Born: Variant ${variant.id}`);
        return variant;
    }

    /**
     * Resolves the best available model for the Architect to use.
     */
    private async getArchitectBrain(excludedModelIds: string[] = []): Promise<{ provider: BaseLLMProvider, modelId: string }> {
        // Define virtual requirements for the Architect
        const architectRequirements = {
            id: 'role-architect-virtual',
            metadata: {
                requirements: {
                    capabilities: ['reasoning', 'json'],
                    minContext: Constants.IDENTITY_MAX_TOKENS
                }
            }
        };

        try {
            // Ask the Arbitrage Router to pick the best model
            // PASS EXCLUSIONS and estimate context needs (Architect tasks are heavy)
            const bestModelId = await resolveModelForRole(architectRequirements, Constants.IDENTITY_MAX_TOKENS, excludedModelIds);


            // Get the provider details for this model
            const modelDef = await prisma.model.findUnique({
                where: { id: bestModelId },
                include: { provider: true }
            });

            if (!modelDef || !modelDef.provider) {
                throw new Error(`Selected model ${bestModelId} not found in DB`);
            }

            const provider = ProviderManager.getProvider(modelDef.providerId);
            if (!provider) {
                throw new Error(`Provider ${modelDef.providerId} for model ${bestModelId} is not initialized`);
            }

            // Resolve the actual API Model ID (e.g. "gpt-4o") from metadata
            let apiModelId = modelDef.name; // Default to name
            if (modelDef.providerData && typeof modelDef.providerData === 'object') {
                const data = modelDef.providerData as ProviderDataWithId;
                if (data.id && typeof data.id === 'string') {
                    apiModelId = data.id;
                }
            }

            console.log(`[RoleFactory] 🧠 Architect using ${apiModelId} (DB: ${bestModelId}) via ${modelDef.providerId}`);
            return { provider, modelId: bestModelId }; // Return DB ID so downstream can resolve provider/slug properly

        } catch (error) {
            console.warn("[RoleFactory] ⚠️ Failed to resolve smart model via selector. Falling back to simple scan.", error);

            // Fail-safe: Iterate known providers like before, but grab their first available model
            const candidateProviders = ['openai', 'anthropic', 'openrouter', 'google', 'mistral', 'groq', 'nvidia', 'cerebras', 'ollama'];

            for (const pid of candidateProviders) {
                const provider = ProviderManager.getProvider(pid);
                if (provider) {
                    // Try to get a default model from this provider
                    try {
                        const models = await provider.getModels();
                        // Filter out excluded ones
                        const available = models.filter(m => !excludedModelIds.includes(m.id));

                        if (available.length > 0) {
                            return { provider, modelId: available[0].id };
                        }
                    } catch { continue; }
                }
            }

            throw new Error("No Intelligence Provider available for Role Factory.");
        }
    }

    /**
     * Helper to get provider instance from modelId
     */
    /**
     * Helper to get provider instance AND api-ready model ID from DB modelId
     */
    public async resolveProvider(dbModelId: string): Promise<{ provider: BaseLLMProvider, apiModelId: string }> {
        const model = await prisma.model.findUnique({ where: { id: dbModelId } });
        if (!model) throw new Error(`Model ${dbModelId} not found`);

        const provider = ProviderManager.getProvider(model.providerId);
        if (!provider) throw new Error(`Provider ${model.providerId} not initialized`);

        // Resolve API Slug
        let apiModelId = model.name;
        if (model.providerData && typeof model.providerData === 'object') {
            const data = model.providerData as ProviderDataWithId;
            if (data.id && typeof data.id === 'string') {
                apiModelId = data.id;
            }
        }

        return { provider, apiModelId };
    }

    /**
     * STAGE 1: IDENTITY
     */


    /**
     * MODULE B: Cortex (The Brain)
     */


    /**
     * MODULE C: Context (The Memory)
     */


    /**
     * MODULE D: Governance (The Law)
     */


    /**
     * MODULE E: Tools (The Hands)
     */
    async toolArchitect(modelId: string, intent: RoleIntent): Promise<string[]> {
        const prompt = `
        Select the necessary tools.
        Intent: ${intent.description}

        Available Options: ["read_file", "write_file", "terminal_execute", "browse", "role_variant_evolve", "role_registry_list", "search_codebase", "ui_architect_tree_inspect", "ui_factory_layout_generate"]

        ## JSON Schema:
        {
            "tools": string[]
        }
        `;
        const res = await executeJsonMode<{ tools: string[] }>(modelId, prompt, "Tool");
        return res.tools || ['filesystem', 'terminal'];
    }


    /**
     * JIT Role Assembly
     */
    async createDynamicRole(jobDescription: string, mcpServerName: string, syncedTools: { name: string; description: string }[]) {
        const toolNames = syncedTools.map(t => t.name).join(', ');
        const toolDescriptions = syncedTools.map(t => `- ${t.name}: ${t.description}`).join('\n');

        const basePrompt = `You are a dynamic specialist role assembled just-in-time for the following job:
${jobDescription}

You have access to the following tools from the ${mcpServerName} MCP server:
${toolDescriptions}

Always use the prefixed tool names (${toolNames}) when calling these tools.`;

        let cat = await prisma.roleCategory.findUnique({ where: { name: 'Skills' } });
        if (!cat) {
            cat = await prisma.roleCategory.create({ data: { name: 'Skills', order: 99 } });
        }

        const roleName = `Dynamic Specialist (${mcpServerName})`;

        const role = await prisma.role.create({
            data: {
                name: roleName,
                description: `A dynamic role equipped with tools from ${mcpServerName} to handle: ${jobDescription}`,
                categoryId: cat.id,
                basePrompt: basePrompt,
            }
        });

        // Ensure the tools are linked to the role via RoleTool relation
        // First get the actual tool IDs from the db based on the synced tool names
        const dbTools = await prisma.tool.findMany({
            where: {
                name: { in: syncedTools.map(t => t.name) }
            }
        });

        if (dbTools.length > 0) {
            await prisma.roleTool.createMany({
                data: dbTools.map(dbTool => ({
                    roleId: role.id,
                    toolId: dbTool.id,
                })),
                skipDuplicates: true
            });
        }

        await this.smartSeedVariant(role, {
            identity: {
                personaName: 'Specialist',
                style: 'PROFESSIONAL_CONCISE',
                systemPromptDraft: basePrompt,
                thinkingProcess: 'CHAIN_OF_THOUGHT',
                reflectionEnabled: true
            },
            cortex: {
                executionMode: 'JSON_STRICT',
                contextRange: { min: 32000, max: 128000 },
                maxOutputTokens: 2048,
                capabilities: ['reasoning'],
                tools: dbTools.map(t => t.name)
            },
            context: { strategy: ['EXPLORATORY'], permissions: ['ALL'] },
            governance: { rules: [], assessmentStrategy: ['LINT_ONLY'], enforcementLevel: 'LOW' }
        });

        return role;
    }

    /**
     * Seeds the "Role Architect" agent into the DB if missing.
     * This allows the user to chat with the factory.
     */
    async ensureArchitectRole() {
        const name = "Role Architect";
        let role = await prisma.role.findUnique({
            where: { name },
            include: { variants: { where: { isActive: true }, take: 1 } }
        });

        if (!role) {
            console.log(`[RoleFactory] 🏗️ Seeding "Role Architect"...`);
            // Create the Category if needed
            let cat = await prisma.roleCategory.findUnique({ where: { name: 'System' } });
            if (!cat) cat = await prisma.roleCategory.create({ data: { name: 'System', order: 0 } });

            role = await prisma.role.create({
                data: {
                    name,
                    description: "The Master Builder. Designs and evolves other agents.",
                    categoryId: cat.id,
                    basePrompt: `You are the Role Architect...` // Simplified for now, the seed script has the full one
                },
                include: { variants: true }
            });
        }

        // SMART SEEDING
        await this.smartSeedVariant(role, {
            identity: {
                personaName: 'DNA Synthesizer',
                style: 'PROFESSIONAL_CONCISE',
                systemPromptDraft: role.basePrompt,
                thinkingProcess: 'CHAIN_OF_THOUGHT',
                reflectionEnabled: true
            },
            cortex: {
                executionMode: 'JSON_STRICT',
                contextRange: { min: Constants.CORTEX_MIN_CONTEXT_DEFAULT, max: Constants.CORTEX_MAX_CONTEXT_DEFAULT },
                maxOutputTokens: Constants.CORTEX_MAX_OUTPUT_TOKENS_DEFAULT,
                capabilities: ['reasoning'],
                tools: ['role_registry_list', 'role_variant_evolve', 'role_config_patch']
            },
            context: { strategy: ['EXPLORATORY'], permissions: ['ALL'] },
            governance: { rules: [], assessmentStrategy: ['LINT_ONLY'], enforcementLevel: 'LOW' }
        });

        // Ensure other system roles are seeded
        await this.seedCoordinator();
        await this.seedLiaison();

        return await prisma.role.findUnique({ where: { id: role.id } });
    }

    public async seedCoordinator() {
        const name = "Grand Orchestrator";

        // Find by name OR slug if available (though slug isn't on Role model in previous snippet, assume name is unique)
        let role = await prisma.role.findFirst({ where: { name } });

        if (!role) {
            console.log(`[RoleFactory] 👑 Seeding "Grand Orchestrator"...`);
            let cat = await prisma.roleCategory.findUnique({ where: { name: 'System' } });
            if (!cat) cat = await prisma.roleCategory.create({ data: { name: 'System', order: 0 } });

            role = await prisma.role.create({
                data: {
                    name,
                    description: "The primary entry point for all complex requests.",
                    categoryId: cat.id,
                    basePrompt: COORDINATOR_PROTOCOL_SNIPPET
                }
            });
        }

        await this.smartSeedVariant(role, {
            identity: {
                personaName: 'Coordinator',
                style: 'PROFESSIONAL_CONCISE',
                systemPromptDraft: COORDINATOR_PROTOCOL_SNIPPET,
                thinkingProcess: 'CHAIN_OF_THOUGHT',
                reflectionEnabled: true
            },
            cortex: {
                executionMode: 'JSON_STRICT',
                contextRange: { min: Constants.CORTEX_MIN_CONTEXT_DEFAULT, max: Constants.CORTEX_MAX_CONTEXT_DEFAULT },
                maxOutputTokens: Constants.CORTEX_MAX_OUTPUT_TOKENS_DEFAULT,
                capabilities: ['reasoning'],
                tools: ["role_registry_list", "role_variant_evolve", "volcano.execute_task"]
            },
            context: { strategy: ['EXPLORATORY'], permissions: ['ALL'] },
            governance: { rules: [], assessmentStrategy: ['LINT_ONLY'], enforcementLevel: 'LOW' }
        });

        return role;
    }

    public async seedLiaison() {
        const name = "Terminal Liaison";

        let role = await prisma.role.findFirst({ where: { name } });

        if (!role) {
            console.log(`[RoleFactory] 🤝 Seeding "Terminal Liaison"...`);
            let cat = await prisma.roleCategory.findUnique({ where: { name: 'System' } });
            if (!cat) cat = await prisma.roleCategory.create({ data: { name: 'System', order: 0 } });

            role = await prisma.role.create({
                data: {
                    name,
                    description: "Expert at local execution and avoiding sudo hangs.",
                    categoryId: cat.id,
                    basePrompt: "You are the Terminal Liaison. You are an expert at avoiding sudo hangs. Always use npx or local --prefix for CLI tool installations."
                }
            });
        }

        await this.smartSeedVariant(role, {
            identity: {
                personaName: 'Liaison',
                style: 'CONCISE',
                systemPromptDraft: role.basePrompt,
                thinkingProcess: 'SOLO',
                reflectionEnabled: false
            },
            cortex: {
                executionMode: 'CODE_INTERPRETER',
                contextRange: { min: Constants.LIAISON_MIN_CONTEXT, max: Constants.LIAISON_MAX_CONTEXT },
                maxOutputTokens: Constants.LIAISON_MAX_OUTPUT,
                capabilities: ['coding'],
                tools: ["terminal_execute", "system.context_fetch"]
            },
            context: { strategy: ['LOCUS_FOCUS'], permissions: ['ALL'] },
            governance: { rules: ["Never use sudo"], assessmentStrategy: ['VISUAL_CHECK'], enforcementLevel: 'MEDIUM' }
        });

        return role;
    }

    /**
     * Helper to perform "Smart Seeding" of variants.
     * PRESERVES user edits to existing variants while upgrading outdated defaults.
     */
    private async smartSeedVariant(
        role: any,
        defaultConfig: {
            identity: Record<string, any>,
            cortex: Record<string, any>,
            context: Record<string, any>,
            governance: Record<string, any>
        }
    ) {
        const activeVariant = await prisma.roleVariant.findFirst({
            where: { roleId: role.id, isActive: true }
        });

        if (!activeVariant) {
            console.log(`[RoleFactory] 🧬 Creating missing DNA Variant for "${role.name}"...`);
            return await prisma.roleVariant.create({
                data: {
                    roleId: role.id,
                    isActive: true,
                    identityConfig: defaultConfig.identity,
                    cortexConfig: defaultConfig.cortex,
                    contextConfig: defaultConfig.context,
                    governanceConfig: defaultConfig.governance,
                }
            });
        }

        // SMART UPDATE LOGIC
        // Check for outdated defaults and upgrade without touching custom values
        const currentCortex = (activeVariant.cortexConfig as any) || {};
        let needsUpdate = false;
        const newCortex = { ...currentCortex };

        // 1. Min Context Upgrade (8192 | 4096 -> 32000 | 4000)
        const currentMin = currentCortex.contextRange?.min;
        const defaultMin = (defaultConfig.cortex as any).contextRange?.min;

        // Known outdated defaults
        const OUTDATED_DEFAULTS = Constants.OUTDATED_CONTEXT_DEFAULTS;

        if (OUTDATED_DEFAULTS.includes(currentMin)) {
            if (defaultMin && defaultMin !== currentMin) {
                console.log(`[RoleFactory] 🆙 Upgrading outdated minContext ${currentMin} -> ${defaultMin} for "${role.name}"`);
                if (!newCortex.contextRange) newCortex.contextRange = {};
                newCortex.contextRange.min = defaultMin;
                needsUpdate = true;
            }
        }

        // 2. Max Output Tokens Upgrade (if missing or default 0/null/outdated)
        // If Role Factory logic changed (e.g. adding maxOutputTokens), backfill it safely.
        const defaultMaxOutput = (defaultConfig.cortex as any).maxOutputTokens;
        if (defaultMaxOutput && !currentCortex.maxOutputTokens) {
            console.log(`[RoleFactory] 🆙 Backfilling missing maxOutputTokens (${defaultMaxOutput}) for "${role.name}"`);
            newCortex.maxOutputTokens = defaultMaxOutput;
            needsUpdate = true;
        }

        if (needsUpdate) {
            await prisma.roleVariant.update({
                where: { id: activeVariant.id },
                data: { cortexConfig: newCortex }
            });
            console.log(`[RoleFactory] ✅ Smart-updated "${role.name}" variant.`);
        }

        return activeVariant;
    }

}
