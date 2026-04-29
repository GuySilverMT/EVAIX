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

export interface IdentityConfig {
    personaName: string;
    systemPromptDraft: string;
    style: string; // [FLEXIBLE] Allow legacy styles like 'SOCRATIC'
    thinkingProcess: string; // [FLEXIBLE] Allow legacy processes
    reflectionEnabled: boolean;
    environmentAnchors?: {
        runtime: string;
        codingStandard: string;
        forbidden: string[];
    };
}


export interface CortexConfig {
    executionMode: AgentExecutionMode;
    contextRange: { min: number; max: number };
    maxOutputTokens?: number; // Role-specific output length requirement (default: 1024 for JSON/tools, higher for planning/writing)
    capabilities: string[];
    tools: string[]; // List of tool names
}

export interface ContextConfig {
    strategy: string[]; // Non-exclusive: EXPLORATORY, VECTOR_SEARCH, LOCUS_FOCUS
    permissions: string[];
}

export interface GovernanceConfig {
    rules: string[];
    assessmentStrategy: string[]; // Non-exclusive: LINT_ONLY, VISUAL_CHECK, STRICT_TEST_PASS, JUDGE, LIBRARIAN
    enforcementLevel: 'LOW' | 'MEDIUM' | 'HIGH';
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
    private async executeJsonMode<T>(modelId: string, prompt: string, schemaName: string): Promise<T> {
        const { provider, apiModelId } = await this.resolveProvider(modelId);

        console.log(`[RoleFactory] 🤖 ${schemaName} Architect is thinking (JSON Mode)...`);

        try {
            const response = await provider.generateCompletion({
                modelId: apiModelId,
                messages: [
                    {
                        role: 'system',
                        content: `You are the ${schemaName} Architect. 
Return ONLY a valid JSON object. 
No markdown code blocks unless requested. 
Ensure the output is parseable by JSON.parse().`
                    },
                    { role: 'user', content: prompt }
                ],
                // responseFormat: { type: 'json_object' } // Some providers support this
            });

            // Robust JSON extraction
            let jsonStr = response.text.trim();
            // Allow ```json, ```JSON, or just ```
            const blockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/i);
            if (blockMatch) {
                jsonStr = blockMatch[1];
            } else {
                const firstBrace = jsonStr.indexOf('{');
                const lastBrace = jsonStr.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
                }
            }

            return JSON.parse(jsonStr) as T;
        } catch (e: unknown) {
            console.error(`[RoleFactory] ❌ JSON Execution Failed for ${schemaName}:`, e instanceof Error ? e.message : String(e));
            throw e;
        }
    }

    /**
     * Master method for code execution (Legacy/Hybrid support)
     */
    private async executeCodeMode<T>(code: string, timeoutInput: any = 30000): Promise<T> {
        const timeout = typeof timeoutInput === 'number' ? timeoutInput : (Number(timeoutInput) || 30000);
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
            const MAX_RETRIES = 2;
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
            (mid) => this.identityArchitect(mid, intent),
            () => this.getIdentityFallback(intent)
        );

        // 2. Cortex Architect
        const cortexConfig = await executeWithResilience<CortexConfig>(
            "Cortex",
            (mid) => this.cortexArchitect(mid, intent),
            () => this.getCortexFallback(intent)
        );

        // 3. Context Architect
        const contextConfig = await executeWithResilience<ContextConfig>(
            "Context",
            (mid) => this.contextArchitect(mid, intent),
            () => this.getContextFallback(intent)
        );

        // 4. Governance Architect
        const governanceConfig = await executeWithResilience<GovernanceConfig>(
            "Governance",
            (mid) => this.governanceArchitect(mid, intent),
            () => this.getGovernanceFallback(intent)
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
                    minContext: 16000
                }
            }
        };

        try {
            // Ask the Arbitrage Router to pick the best model
            // PASS EXCLUSIONS and estimate context needs (Architect tasks are heavy)
            const bestModelId = await resolveModelForRole(architectRequirements, 16000, excludedModelIds);


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
    async identityArchitect(modelId: string, intent: RoleIntent): Promise<IdentityConfig> {
        const prompt = `
        Design the core persona for a new AI Role.
        Input Intent:
        - Name: ${intent.name}
        - Description: ${intent.description}
        - Domain: ${intent.domain}
        - Complexity: ${intent.complexity}

        ## 🛡️ ENVIRONMENT ANCHORS (MANDATORY):
        ALL roles MUST operate within these constraints:
        - Runtime: Node.js 22+ / TypeScript 5.7
        - Coding Standard: Functional, Type-Safe, 9-line function rule
        - Execution Mode: TypeScript ONLY (async/await, system.* tools)
        
        ## 🚫 FORBIDDEN:
        - Python code (def, import os, pip, requirements.txt)
        - Manual thought logs (Thought:, Action:, Observation:)
        - Any non-TypeScript/JavaScript syntax
        
        ## ✅ REQUIRED:
        - Use TypeScript syntax exclusively
        - Leverage async/await for all operations
        - Call tools via system.* namespace
        - Follow functional programming patterns

        ## JSON Schema:
        {
            "personaName": "String",
            "systemPromptDraft": "String (Detailed system instructions INCLUDING environment anchors)",
            "style": "PROFESSIONAL_CONCISE" | "FRIENDLY_HELPFUL" | "ACADEMIC_FORMAL" | "CREATIVE",
            "thinkingProcess": "SOLO" | "CHAIN_OF_THOUGHT" | "CRITIC_LOOP",
            "reflectionEnabled": boolean,
            "environmentAnchors": {
                "runtime": "Node.js 22+ / TypeScript 5.7",
                "codingStandard": "Functional, Type-Safe, 9-line rules",
                "forbidden": ["python", "pip", "requirements.txt", "manual thought logs"]
            }
        }
        `;
        // Pass through errors to resilience layer
        return await this.executeJsonMode<IdentityConfig>(modelId, prompt, "Identity");
    }

    private getIdentityFallback(intent: RoleIntent): IdentityConfig {
        return {
            personaName: intent.name,
            systemPromptDraft: `You are ${intent.name}. ${intent.description}. 
                
                ENVIRONMENT: Node.js 22+ / TypeScript 5.7
                FORBIDDEN: Python, pip, requirements.txt, manual thought logs
                REQUIRED: Use TypeScript syntax with async/await and system.* tools`,
            style: 'PROFESSIONAL_CONCISE',
            thinkingProcess: intent.complexity === 'HIGH' ? 'CHAIN_OF_THOUGHT' : 'SOLO',
            reflectionEnabled: intent.complexity === 'HIGH',
            environmentAnchors: {
                runtime: "Node.js 22+ / TypeScript 5.7",
                codingStandard: "Functional, Type-Safe, 9-line rules",
                forbidden: ["python", "pip", "requirements.txt", "manual thought logs"]
            }
        };
    }

    /**
     * MODULE B: Cortex (The Brain)
     */
    async cortexArchitect(modelId: string, intent: RoleIntent): Promise<CortexConfig> {
        const isHealthProbe = intent.name === 'System Health Probe';
        const isAuditor = intent.name === 'MCP Capability Auditor';

        const prompt = `
        Determine the cognitive load and execution strategy for this agent.
        Intent:
        - Name: ${intent.name}
        - Complexity: ${intent.complexity}
        - Domain: ${intent.domain}

        ## DNA SETTINGS: 
        Determine if this agent should use:
        1. JSON_STRICT: Best for Architects/Managers (Data input/output).
        2. CODE_INTERPRETER: Best for Workers/Engineers (Writing/Running code).
        3. HYBRID_AUTO: Best for generalists who need to pick the best tool.

        ${isHealthProbe ? 'NOTE: For System Health Probes, HYBRID_AUTO is MANDATORY.' : ''}
        ${isAuditor ? 'NOTE: For Capability Auditors, HYBRID_AUTO is MANDATORY.' : ''}

        ## OUTPUT LENGTH REQUIREMENTS:
        Set maxOutputTokens based on role type:
        - **1024**: JSON responses, tool calls, coordinators, managers (DEFAULT)
        - **2048**: Code generation, refactoring, moderate documentation
        - **4096**: Long-form planning, architectural documents, detailed analysis
        - **8192**: Comprehensive documentation, multi-file generation, extensive reports

        ## JSON Schema:
        {
            "executionMode": "JSON_STRICT" | "CODE_INTERPRETER" | "HYBRID_AUTO",
            "contextRange": { "min": number, "max": number }, // Standard Min: 4000. Orchestrators: 32000.
            "maxOutputTokens": number, // Set based on role's output needs (see above)
            "capabilities": string[], // ["vision", "reasoning", "tts", "embedding"]
            "tools": string[] // ["filesystem", "terminal", "browser", "search_codebase"]
        }
        `;
        const config = await this.executeJsonMode<CortexConfig>(modelId, prompt, "Cortex");

        if (isHealthProbe || isAuditor) {
            config.executionMode = 'HYBRID_AUTO';
        }

        return config;
    }

    private getCortexFallback(intent: RoleIntent): CortexConfig {
        return {
            executionMode: intent.complexity === 'HIGH' ? 'HYBRID_AUTO' : 'JSON_STRICT',
            contextRange: { min: 4000, max: 128000 },
            maxOutputTokens: intent.complexity === 'HIGH' ? 2048 : 1024, // High complexity roles may need more output
            capabilities: intent.capabilities || [],
            tools: ['filesystem', 'terminal']
        };
    }

    /**
     * MODULE C: Context (The Memory)
     */
    async contextArchitect(modelId: string, intent: RoleIntent): Promise<ContextConfig> {
        const prompt = `
        Determine how this agent accesses information.
        Intent Domain: ${intent.domain}

        ## JSON Schema:
        {
            "strategy": ["EXPLORATORY" | "VECTOR_SEARCH" | "LOCUS_FOCUS"],
            "permissions": ["/src", "/docs", "ALL"]
        }
        `;
        return await this.executeJsonMode<ContextConfig>(modelId, prompt, "Context");
    }

    private getContextFallback(intent: RoleIntent): ContextConfig {
        return { strategy: ['EXPLORATORY'], permissions: ['ALL'] };
    }

    /**
     * MODULE D: Governance (The Law)
     */
    async governanceArchitect(modelId: string, intent: RoleIntent): Promise<GovernanceConfig> {
        const isHealthProbe = intent.name === 'System Health Probe';
        const isAuditor = intent.name === 'MCP Capability Auditor';

        const prompt = `
        Set the rules and assessment criteria.
        Intent: ${intent.name} in ${intent.domain} (${intent.complexity})

        ## JSON Schema:
        {
            "rules": string[],
            "assessmentStrategy": ["LINT_ONLY" | "VISUAL_CHECK" | "STRICT_TEST_PASS" | "JUDGE"],
            "enforcementLevel": "LOW" | "MEDIUM" | "HIGH"
        }
        `;
        const config = await this.executeJsonMode<GovernanceConfig>(modelId, prompt, "Governance");

        if (isHealthProbe) {
            config.assessmentStrategy = ["STRICT_TEST_PASS"];
        }

        if (isAuditor) {
            config.assessmentStrategy = ["JUDGE"]; // Auditor needs to judge logic
        }

        return config;
    }

    private getGovernanceFallback(intent: RoleIntent): GovernanceConfig {
        return {
            rules: ["Verify work before submitting."],
            assessmentStrategy: ["VISUAL_CHECK"],
            enforcementLevel: "MEDIUM"
        };
    }

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
        const res = await this.executeJsonMode<{ tools: string[] }>(modelId, prompt, "Tool");
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

        for (const dbTool of dbTools) {
            await prisma.roleTool.create({
                data: {
                    roleId: role.id,
                    toolId: dbTool.id,
                }
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
                contextRange: { min: 32000, max: 128000 },
                maxOutputTokens: 2048,
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
                contextRange: { min: 32000, max: 128000 },
                maxOutputTokens: 2048,
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
                contextRange: { min: 4000, max: 32000 },
                maxOutputTokens: 1024,
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
        const OUTDATED_DEFAULTS = [8192, 4096];

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
