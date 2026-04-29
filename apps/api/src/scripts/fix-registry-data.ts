
import { prisma } from '../db.js';

async function main() {
    console.log("🚑 Starting Registry Healer...");

    // 1. Find invalid capabilities where maxOutput is 0 or null
    const invalidCaps = await prisma.modelCapabilities.findMany({
        where: {
            OR: [
                { maxOutput: { equals: 0 } },
                { maxOutput: { equals: null } }
            ]
        },
        include: { model: true }
    });

    console.log(`Found ${invalidCaps.length} corrupted capability records.`);

    if (invalidCaps.length === 0) {
        console.log("✅ Registry is healthy.");
        return;
    }

    // 2. Fix them
    let fixedCount = 0;
    for (const cap of invalidCaps) {
        const safeMax = 4096; // Safe default for most modern models
        
        await prisma.modelCapabilities.update({
            where: { id: cap.id },
            data: { maxOutput: safeMax }
        });
        
        const modelName = cap.model?.name || 'Unknown Model';
        // Only log every 10 to avoid spamming if huge
        if (fixedCount < 20 || fixedCount % 50 === 0) {
            console.log(`Fixed ${modelName}: maxOutput 0/null -> ${safeMax}`);
        }
        fixedCount++;
    }

    console.log(`✅ Healed ${fixedCount} models.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
