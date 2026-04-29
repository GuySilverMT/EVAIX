
import { RoleFactoryService } from '../services/RoleFactoryService.js';
import { ProviderManager } from '../services/ProviderManager.js';
import { prisma } from '../db.js';

async function main() {
    console.log("--- Role Persistence Verification ---");

    // 1. Initialize
    await ProviderManager.initialize();
    const factory = new RoleFactoryService();

    // 2. Trigger Seeding (this should run the smartSeedVariant logic)
    console.log("Triggering ensureArchitectRole()...");
    await factory.ensureArchitectRole();

    // 3. Verify Grand Orchestrator (Should be 32000)
    const orchestrator = await prisma.role.findFirst({
        where: { name: "Grand Orchestrator" },
        include: { variants: { where: { isActive: true } } }
    });
    const orchMin = (orchestrator?.variants[0]?.cortexConfig as any)?.contextRange?.min;
    console.log(`Grand Orchestrator Min Context: ${orchMin} (Expected: 32000)`);
    if (orchMin !== 32000) throw new Error(`Orchestrator Verify Failed: Got ${orchMin}`);

    // 4. Verify Terminal Liaison (Should be upgraded to 4000)
    const liaison = await prisma.role.findFirst({
        where: { name: "Terminal Liaison" },
        include: { variants: { where: { isActive: true } } }
    });
    const liaisonMin = (liaison?.variants[0]?.cortexConfig as any)?.contextRange?.min;
    console.log(`Terminal Liaison Min Context: ${liaisonMin} (Expected: 4000)`);
    if (liaisonMin !== 4000) throw new Error(`Liaison Verify Failed: Got ${liaisonMin}`);

    // 5. Verify Role Architect (Should be 32000)
    const architect = await prisma.role.findFirst({
        where: { name: "Role Architect" },
        include: { variants: { where: { isActive: true } } }
    });
    const archMin = (architect?.variants[0]?.cortexConfig as any)?.contextRange?.min;
    console.log(`Role Architect Min Context: ${archMin} (Expected: ~32000)`);
    if (archMin < 30000) throw new Error(`Architect Verify Failed: Got ${archMin}`);

    console.log("✅ Verification Passed: All roles updated correctly!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
