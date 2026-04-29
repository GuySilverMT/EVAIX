import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log("💧 Starting Capability Hydration...");
  
  const models = await prisma.model.findMany({
    include: { capabilities: true }
  });

  let fixed = 0;
  let skipped = 0;

  for (const model of models) {
    // If capabilities already exist, skip
    if (model.capabilities) {
      skipped++;
      continue;
    }

    console.log(`Fixing ${model.modelId}...`);
    
    // Heuristics based on name/ID
    const id = model.modelId.toLowerCase();
    const name = model.name.toLowerCase();
    const raw = (model.providerData as Record<string, unknown>) || {};
    const rawStr = JSON.stringify(raw).toLowerCase();
    
    // Attempt to read context from raw data
    let context = 4096;
    if (typeof raw.context_window === 'number') context = raw.context_window;
    else if (typeof raw.inputTokenLimit === 'number') context = raw.inputTokenLimit;
    else if (typeof raw.context_length === 'number') context = raw.context_length;
    else if (typeof raw.max_context_length === 'number') context = raw.max_context_length;
    else {
      // Try to parse as number if it's a string
      const contextWindow = raw.context_window ?? raw.inputTokenLimit ?? raw.context_length ?? raw.max_context_length;
      if (contextWindow !== undefined) {
        const parsed = Number(contextWindow);
        if (!isNaN(parsed)) context = parsed;
      }
    }

    // Extract capabilities using heuristics
    const hasVision = id.includes('vision') || id.includes('vl') || name.includes('vision');
    const hasAudioInput = id.includes('whisper') || id.includes('audio') || name.includes('audio');
    const hasAudioOutput = id.includes('tts') || rawStr.includes('text-to-speech');
    const hasTTS = id.includes('tts');
    const hasImageGen = id.includes('dall-e') || id.includes('imagen');
    const isMultimodal = hasVision || hasAudioInput || hasImageGen;
    const supportsFunctionCalling = rawStr.includes('function') || rawStr.includes('tool');
    const supportsJsonMode = rawStr.includes('json_mode') || rawStr.includes('json');

    await prisma.modelCapabilities.create({
      data: {
        id: uuidv4(),
        modelId: model.id,
        contextWindow: context,
        maxOutput: 4096,
        hasVision,
        hasAudioInput,
        hasAudioOutput,
        hasTTS,
        hasImageGen,
        isMultimodal,
        supportsFunctionCalling,
        supportsJsonMode
      }
    });
    
    fixed++;
  }
  
  console.log(`✅ Hydration Complete!`);
  console.log(`   Fixed: ${fixed} models`);
  console.log(`   Skipped: ${skipped} models (already had capabilities)`);
}

main()
  .catch(e => {
    console.error('❌ Hydration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
