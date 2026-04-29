
import { prisma } from '../db.js';

async function addProviders() {
    console.log("Ensuring extra providers exist...");

    const providers = [
        { 
            id: 'cerebras', 
            name: 'Cerebras', 
            type: 'cerebras', 
            baseUrl: 'https://api.cerebras.ai/v1' 
        },
        { 
            id: 'nvidia', 
            name: 'NVIDIA', 
            type: 'nvidia', 
            baseUrl: 'https://integrate.api.nvidia.com/v1' 
        }
    ];

    for (const p of providers) {
        const existing = await prisma.providerConfig.findFirst({
            where: { type: p.type }
        });

        if (existing) {
            console.log(`✅ ${p.name} provider already exists.`);
        } else {
            await prisma.providerConfig.create({
                data: {
                    id: p.id,
                    name: p.name,
                    type: p.type,
                    baseUrl: p.baseUrl,
                    isEnabled: true
                }
            });
            console.log(`✅ Added ${p.name} Provider.`);
        }
    }
}

addProviders()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
