import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const providerId = 'groq'; // The ID from my debug output
    const config = await prisma.providerConfig.findUnique({ where: { id: providerId } });
    console.log('Config:', JSON.stringify(config, null, 2));

    const searchIds = [providerId];
    if (config?.type) searchIds.push(config.type);
    console.log('Search IDs:', searchIds);

    const models = await prisma.model.findMany({
        where: {
            providerId: { in: searchIds },
            isActive: true
        },
        include: { capabilities: true },
        orderBy: { name: 'asc' },
    });

    console.log('Result length:', models.length);
    if (models.length > 0) {
        console.log('First model:', JSON.stringify(models[0], null, 2));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
