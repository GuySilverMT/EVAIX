import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Querying available models...\n');
  
  // Count models by provider
  const modelCount = await prisma.model.groupBy({
    by: ['providerId'],
    _count: true,
  });
  
  console.log('=== MODELS BY PROVIDER ===');
  modelCount.forEach(p => {
    console.log(`${p.providerId}: ${p._count} models`);
  });
  
  // Get chat models
  const chatModels = await prisma.chatModel.findMany({
    include: {
      model: {
        select: {
          id: true,
          name: true,
          providerId: true,
        }
      }
    },
    take: 20,
  });
  
  console.log(`\n=== CHAT MODELS (${chatModels.length} shown) ===\n`);
  chatModels.forEach(m => {
    console.log(`  - ${m.model.id} (${m.contextWindow || '?'} tokens)`);
  });
  
  // Get audio models
  const audioModels = await prisma.audioModel.findMany({
    include: {
      model: {
        select: {
          id: true,
          name: true,
          providerId: true,
        }
      }
    },
  });
  
  console.log(`\n=== AUDIO MODELS (${audioModels.length} total) ===\n`);
  audioModels.forEach(m => {
    console.log(`  - ${m.model.id}`);
  });
  
  // Get voice engines
  const voiceEngines = await prisma.voiceEngine.findMany({
    select: {
      name: true,
      type: true,
      provider: true,
      isEnabled: true,
    }
  });
  
  console.log(`\n=== VOICE ENGINES (${voiceEngines.length} total) ===\n`);
  voiceEngines.forEach(e => {
    console.log(`  - ${e.name} (${e.type}, ${e.provider}) ${e.isEnabled ? '✅' : '❌'}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
