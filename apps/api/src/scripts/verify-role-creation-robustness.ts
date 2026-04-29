
import { PrismaClient } from '@prisma/client';
import { RoleFactoryService } from '../services/RoleFactoryService.js';
import { ProviderManager } from '../services/ProviderManager.js';

const prisma = new PrismaClient();

async function main() {
    console.log("🛠️ Starting Robustness Verification...");
    await ProviderManager.initialize();
    const factory = new RoleFactoryService();

    // 1. Ensure Architect
    await factory.ensureArchitectRole();

    // 2. Create Dummy Intent
    const intent = {
        name: "Test Robustness Bot",
        description: "A test bot to verify retry logic in RoleFactory.",
        domain: "Backend",
        complexity: "LOW" as const
    };

    // 3. Create Role Container
    let role = await prisma.role.findUnique({ where: { name: intent.name } });
    if (!role) {
        role = await prisma.role.create({
            data: {
                name: intent.name,
                description: intent.description,
                basePrompt: "You are a test bot."
            }
        });
    }

    // 4. Create Variant
    try {
        console.log("🚀 Attempting to create variant (Watch logs for retries if any model fails)...");
        const variant = await factory.createRoleVariant(role.id, intent);
        console.log("✅ Verification SUCCESS: Variant created:", variant.id);
        console.log("Identity:", variant.identityConfig);
    } catch (e) {
        console.error("❌ Verification FAILED:", e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
