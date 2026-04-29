import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspect() {
  console.log('🔍 Database Inspection\n');
  
  // Check providers
  const providers = await prisma.providerConfig.findMany({
    select: { id: true, type: true, label: true }
  });
  
  console.log('=== PROVIDERS ===');
  providers.forEach(p => {
    console.log(`${p.type} (${p.label}) - ID: ${p.id}`);
  });
  
  // Check a few models
  const models = await prisma.model.findMany({
    include: {
      provider: true,
      capabilities: true
    },
    take: 5
  });
  
  console.log('\n=== SAMPLE MODELS ===');
  models.forEach(m => {
    console.log(`\nModel: ${m.name}`);
    console.log(`  ModelID: ${m.modelId}`);
    console.log(`  Provider Type: ${m.provider.type}`);
    console.log(`  Provider Label: ${m.provider.label}`);
    console.log(`  Cost Per 1k: ${m.costPer1k}`);
    console.log(`  Has Capabilities: ${!!m.capabilities}`);
    if (m.capabilities) {
      console.log(`  Context Window: ${m.capabilities.contextWindow}`);
    }
  });
  
  // Count by provider type
  console.log('\n=== MODELS BY PROVIDER ===');
  for (const provider of providers) {
    const count = await prisma.model.count({
      where: { providerId: provider.id }
    });
    console.log(`${provider.type}: ${count} models`);
  }
  
  await prisma.$disconnect();
}

inspect().catch(console.error);
