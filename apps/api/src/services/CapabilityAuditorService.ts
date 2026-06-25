import { prisma } from '../db.js';
import { AgentRuntime } from './AgentRuntime.js';
import { RoleFactoryService } from './RoleFactoryService.js';
import { mcpOrchestrator } from '../orchestrator/McpOrchestrator.js';
import { ProviderManager } from './ProviderManager.js';
import { resolveModelForRole } from './modelManager.service.js';


export class CapabilityAuditorService {
    private factory = new RoleFactoryService();

    /**
     * Discovers all tools and runs verification drills.
     */
    async auditAllCapabilities() {
        console.log('[Auditor] 🛡️ Starting Automated Quality Assurance (AQA) Drill...');

        // 1. Discovery
        const tools = await prisma.tool.findMany({
            where: { isEnabled: true, serverId: { not: null } }
        });

        console.log(`[Auditor] 📡 Discovered ${tools.length} capabilities to audit.`);

        // 2. Instantiate Auditor Role
        const auditorRole = await this.ensureAuditorRole();

        for (const tool of tools) {
            console.log(`\n[Auditor] 🔬 Testing: ${tool.name} (Server: ${tool.serverId})...`);
            try {
                await this.runDrill(auditorRole, tool);
                console.log(`[Auditor] ✅ Tool ${tool.name} PASSED logic audit.`);
            } catch (error: any) {
                console.error(`[Auditor] ❌ Tool ${tool.name} FAILED:`, error.message);
            }
        }
    }

    private async runDrill(auditorRole: any, tool: any) {
        // We use the Auditor intent to get the right DNA
        const runtime = await AgentRuntime.create(process.cwd(), ['terminal_execute', 'read_file'], auditorRole.id, 'HYBRID_AUTO');
        
        const drillGoal = `
[MISSION]: Verify the capability '${tool.name}' on server '${tool.serverId}'.

[EXECUTION PROTOCOL]:
1. If the tool '${tool.name}' is not visible in your environment, you MUST output 'REQUEST_TOOL:${tool.serverId}' immediately.
2. Once the tool is available, generate a safe, logical test case based on this schema: ${tool.schema}
3. Execute the tool call using either a code block or JSON RPC.
4. OBSERVE THE RESULT.

[VALIDATION CRITERIA]:
- If the tool responds correctly, output exactly: 'AUDIT_PASS'.
- If the tool fails or the protocol is broken, explain the error and output: 'AUDIT_FAIL'.

DO NOT engage in conversation. Focus solely on the drill.
`;

        // 3. Run the agent loop
        const variant = auditorRole.variants[0];
        // Resolve model via selector for high-quality auditing
        const modelId = await resolveModelForRole({
            id: auditorRole.id,
            metadata: {
                requirements: {
                    // Maximum range: no strict constraints
                    capabilities: [], 
                    minContext: 0
                }
            }
        }, 1000); 


        const { provider, apiModelId } = await this.factory.resolveProvider(modelId);

        const regenerateCallback = async (prompt: string) => {
            const response = await provider.generateCompletion({
                modelId: apiModelId,
                messages: [
                    { role: 'system', content: (variant.identityConfig).systemPromptDraft },
                    { role: 'user', content: prompt }
                ]
            });
            return response.text;
        };

        const initialTurn = await regenerateCallback(drillGoal);
        const result = await runtime.runAgentLoop(drillGoal, initialTurn, regenerateCallback, 5);
        
        if (!result.result.includes('AUDIT_PASS')) {
            throw new Error(result.result || "Auditor did not confirm PASS.");
        }
    }

    private async ensureAuditorRole() {
        const name = "MCP Capability Auditor";
        let role = await prisma.role.findUnique({
            where: { name },
            include: { variants: { where: { isActive: true }, take: 1 } }
        });

        if (!role) {
            console.log(`[Auditor] 🏗️ Creating Auditor Role...`);
            let cat = await prisma.roleCategory.findUnique({ where: { name: 'System' } });
            if (!cat) cat = await prisma.roleCategory.create({ data: { name: 'System', order: 0 } });

            role = await prisma.role.create({
                data: {
                    name,
                    description: "System service for end-to-end verification of MCP tool integrity.",
                    categoryId: cat.id,
                    basePrompt: "You are the MCP Capability Auditor. Your job is to rigorously test every tool in the registry."
                },
                include: { variants: true }
            });

            // Create variant via factory to trigger special Auditor handling in RoleFactoryService
            await this.factory.createRoleVariant(role.id, {
                name,
                description: role.description!,
                domain: "System",
                complexity: "HIGH"
            });

            // Re-fetch
            role = await prisma.role.findUnique({
                where: { name },
                include: { variants: { where: { isActive: true }, take: 1 } }
            }) as any;
        }

        return role!;
    }
}
