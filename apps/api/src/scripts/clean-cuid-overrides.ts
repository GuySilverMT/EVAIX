
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanOverrides() {
    console.log("🧹 Cleaning CUID overrides from Roles and Variants...");
    
    // 1. Clean Roles
    const roles = await prisma.role.findMany();
    let roleUpdates = 0;
    for (const role of roles) {
        const meta = (role.metadata as Record<string, any>) || {};
        const mid = meta.hardcodedModelId;
        
        if (typeof mid === 'string' && mid.length === 25 && mid.startsWith('c') && !mid.includes(':')) {
            console.log(`- Removing CUID override from Role: ${role.name}`);
            const newMeta = { ...meta };
            delete newMeta.hardcodedModelId;
            delete newMeta.hardcodedProviderId;
            
            await prisma.role.update({
                where: { id: role.id },
                data: { metadata: newMeta as Prisma.InputJsonValue }
            });
            roleUpdates++;
        }
    }

    // 2. Clean Variants
    const variants = await prisma.roleVariant.findMany();
    let variantUpdates = 0;
    for (const variant of variants) {
        const cortex = (variant.cortexConfig as Record<string, any>) || {};
        const mid = cortex.hardcodedModelId;
        
        if (typeof mid === 'string' && mid.length === 25 && mid.startsWith('c') && !mid.includes(':')) {
            console.log(`- Removing CUID override from Variant: ${variant.id}`);
            const newCortex = { ...cortex };
            delete newCortex.hardcodedModelId;
            delete newCortex.hardcodedProviderId;
            
            await prisma.roleVariant.update({
                where: { id: variant.id },
                data: { cortexConfig: newCortex as Prisma.InputJsonValue }
            });
            variantUpdates++;
        }
    }

    console.log(`✅ Fixed ${roleUpdates} Roles and ${variantUpdates} Variants.`);
}

cleanOverrides().catch(console.error).finally(() => prisma.$disconnect());
