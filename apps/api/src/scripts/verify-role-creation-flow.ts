
import { RoleFactoryService, RoleIntent, IdentityConfig, CortexConfig } from '../services/RoleFactoryService.js';
import { ProviderManager } from '../services/ProviderManager.js';

async function main() {
    console.log("--- Role Creation Flow Verification ---");

    // 1. Initialize Providers
    await ProviderManager.initialize();

    // 2. Ensure "Architect" Role exists (required for factory)
    const factory = new RoleFactoryService();
    const architect = await factory.ensureArchitectRole();
    if (!architect) {
        throw new Error("Failed to ensure Architect Role exists");
    }
    console.log(`✅ Architect Role ID: ${architect.id}`);

    // 3. Define Intent for a new role
    const intent: RoleIntent = {
        name: "Test Frontend Agent",
        description: "A React/Next.js specialist that writes clean UI components.",
        domain: "Frontend",
        complexity: "MEDIUM",
        capabilities: ["vision"] // Should trigger Cortex filtering
    };

    console.log(`\n[Test] Creating Role "${intent.name}"...`);

    try {
        const variant = await factory.createRoleVariant(architect.id, intent);
        console.log(`\n✅ Role Created Successfully!`);
        console.log(`- Variant ID: ${variant.id}`);
        
        const identity = variant.identityConfig as unknown as IdentityConfig;
        const cortex = variant.cortexConfig as unknown as CortexConfig;

        console.log(`- Identity: ${identity.personaName}`);
        console.log(`- Tools: ${JSON.stringify(cortex.tools)}`);
    } catch (error) {
        console.error("\n❌ Role Creation Failed:", error);
    }
}

main().catch(console.error);
