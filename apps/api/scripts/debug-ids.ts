import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const providers = await prisma.providerConfig.findMany();
    console.log('--- ALL PROVIDERS ---');
    console.log(JSON.stringify(providers.map(p => ({ id: p.id, name: p.name, type: p.type, isEnabled: p.isEnabled })), null, 2));

    const models = await prisma.model.findMany({
        select: { id: true, providerId: true, name: true, isActive: true }
    });
    console.log('--- MODELS ---');
    console.log(JSON.stringify(models.filter(m => m.providerId.includes('xai') || m.name.includes('grok')), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
