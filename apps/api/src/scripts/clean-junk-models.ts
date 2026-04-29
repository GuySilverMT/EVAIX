// Run this via: npx ts-node --esm src/scripts/clean-junk-models.ts
import { PrismaClient } from '@prisma/client';
import { Surveyor } from '../services/Surveyor.js';

const prisma = new PrismaClient();

async function clean() {
    console.log("🧹 Starting Model Cleanup for Mistral and Nvidia...");
    
    const providers = await prisma.providerConfig.findMany({
        where: {
            type: { in: ['mistral', 'nvidia'] }
        }
    });

    let totalDeleted = 0;

    for (const provider of providers) {
        console.log(`\n🔍 Checking ${provider.name} (${provider.type})...`);
        
        const models = await prisma.model.findMany({
            where: { providerId: provider.id }
        });

        console.log(`   Found ${models.length} existing models.`);

        const rawModels = models.map(m => m.providerData as any).filter(Boolean);
        const sanitizedRaw = Surveyor.sanitizeModelList(rawModels);
        const sanitizedIds = new Set(sanitizedRaw.map(r => r.id.toLowerCase()));

        let deletedCount = 0;
        for (const model of models) {
            const rawId = (model.providerData as any)?.id?.toLowerCase();
            
            // If it's a date-stamped model and not in the sanitized list, prune it
            if (rawId && !sanitizedIds.has(rawId)) {
                console.log(`   🗑️  Pruning: ${model.name} (${rawId})`);
                await prisma.model.delete({
                    where: { id: model.id }
                });
                deletedCount++;
            }
        }
        
        console.log(`   ✅ Finished ${provider.name}. Pruned ${deletedCount} models.`);
        totalDeleted += deletedCount;
    }

    console.log(`\n✨ Cleanup complete. Total models pruned: ${totalDeleted}`);
}

clean()
    .catch(console.error)
    .finally(() => prisma.$disconnect());