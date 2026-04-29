import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGroq() {
  console.log('🔍 Checking Groq Model Status\n');
  
  try {
    // Find all models with 'groq' in the name or provider
    const groqModels = await prisma.model.findMany({
      where: {
        OR: [
          { modelId: { contains: 'groq', mode: 'insensitive' } },
          { providerId: { contains: 'groq', mode: 'insensitive' } },
          { name: { contains: 'groq', mode: 'insensitive' } }
        ]
      },
      include: {
        capabilities: true
      },
      take: 5
    });
    
    console.log(`Found ${groqModels.length} Groq models\n`);
    
    if (groqModels.length === 0) {
      console.log('❌ No Groq models found in database');
      console.log('\nLet\'s check what providers exist:');
      
      const allProviders = await prisma.model.findMany({
        select: { providerId: true },
        distinct: ['providerId']
      });
      
      console.log('Available providers:', allProviders.map(p => p.providerId).join(', '));
      return;
    }
    
    // Show details for each Groq model
    for (const model of groqModels) {
      console.log('='.repeat(60));
      console.log(`Model: ${model.name}`);
      console.log(`ID: ${model.id}`);
      console.log(`ModelID: ${model.modelId}`);
      console.log(`Provider: ${model.providerId}`);
      console.log(`Active: ${model.isActive}`);
      console.log(`Cost Per 1k: ${model.costPer1k}`);
      
      if (model.capabilities) {
        console.log('\n✅ HAS CAPABILITIES:');
        console.log(`  Context Window: ${model.capabilities.contextWindow}`);
        console.log(`  Max Output: ${model.capabilities.maxOutput}`);
        console.log(`  Has Vision: ${model.capabilities.hasVision}`);
        console.log(`  Has Audio Input: ${model.capabilities.hasAudioInput}`);
        console.log(`  Has TTS: ${model.capabilities.hasTTS}`);
        console.log(`  Supports Function Calling: ${model.capabilities.supportsFunctionCalling}`);
      } else {
        console.log('\n❌ NO CAPABILITIES RECORD');
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGroq();
