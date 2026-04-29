import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const capCount = await prisma.modelCapabilities.count();
  const modelCount = await prisma.model.count();
  
  console.log('Total Models:', modelCount);
  console.log('Total Capabilities:', capCount);
  
  // Check a specific Groq model
  const groqModel = await prisma.model.findFirst({
    where: { 
      OR: [
        { modelId: { contains: 'groq' } },
        { providerId: { contains: 'groq' } }
      ]
    },
    include: { capabilities: true }
  });
  
  if (groqModel) {
    console.log('\nGroq Model Found:');
    console.log('  ID:', groqModel.id);
    console.log('  ModelID:', groqModel.modelId);
    console.log('  Provider:', groqModel.providerId);
    console.log('  Has Capabilities:', !!groqModel.capabilities);
    if (groqModel.capabilities) {
      console.log('  Context Window:', groqModel.capabilities.contextWindow);
      console.log('  Has Vision:', groqModel.capabilities.hasVision);
      console.log('  Full Capabilities:', JSON.stringify(groqModel.capabilities, null, 2));
    }
  } else {
    console.log('\nNo Groq model found');
  }
  
  // Check what the ModelSelector would see
  const allModelsWithCaps = await prisma.model.findMany({
    where: { isActive: true },
    include: { capabilities: true },
    take: 5
  });
  
  console.log('\n--- First 5 Active Models ---');
  allModelsWithCaps.forEach(m => {
    console.log(`${m.modelId}: capabilities=${!!m.capabilities}`);
  });
  
  await prisma.$disconnect();
}

check().catch(console.error);
