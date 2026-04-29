import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed Voice Engines from existing Audio Models
 * Categorizes models as STT, TTS, or BIDIRECTIONAL
 */

async function main() {
  console.log('🎤 Seeding Voice Engines from Audio Models...\n');

  // Get all audio models
  const audioModels = await prisma.audioModel.findMany({
    include: {
      model: {
        select: {
          id: true,
          name: true,
          providerId: true,
        }
      }
    }
  });

  console.log(`Found ${audioModels.length} audio models\n`);

  // Categorize models
  const sttModels = [
    'whisper-large-v3-turbo',
    'whisper-large-v3',
    'orpheus-v1-english',
    'orpheus-arabic-saudi',
    'voxtral-mini-transcribe-2507',
  ];

  const bidirectionalModels = [
    'voxtral-mini-2507',
    'voxtral-mini-latest',
    'voxtral-small-2507',
    'voxtral-small-latest',
    'gemini-2.0-flash-exp',
  ];

  let sttCount = 0;
  let ttsCount = 0;
  let bidirectionalCount = 0;

  for (const audioModel of audioModels) {
    const modelName = audioModel.model.name.toLowerCase();
    const modelId = audioModel.model.id;
    const provider = audioModel.model.providerId;

    // Determine type
    let type: 'STT' | 'TTS' | 'BIDIRECTIONAL' = 'STT';
    let engineName = audioModel.model.name;

    if (sttModels.some(m => modelName.includes(m))) {
      type = 'STT';
      engineName = `${audioModel.model.name} (STT)`;
      sttCount++;
    } else if (bidirectionalModels.some(m => modelName.includes(m))) {
      type = 'BIDIRECTIONAL';
      engineName = `${audioModel.model.name} (Audio)`;
      bidirectionalCount++;
    }

    // Create or update voice engine
    const engine = await prisma.voiceEngine.upsert({
      where: {
        id: `voice-engine-${modelId}`,
      },
      create: {
        id: `voice-engine-${modelId}`,
        name: engineName,
        type,
        provider,
        isEnabled: true,
        config: {
          modelId,
          audioModelId: audioModel.id,
        },
        metadata: {
          voices: audioModel.voices,
          sampleRates: audioModel.sampleRates,
        }
      },
      update: {
        name: engineName,
        type,
        provider,
        config: {
          modelId,
          audioModelId: audioModel.id,
        },
        metadata: {
          voices: audioModel.voices,
          sampleRates: audioModel.sampleRates,
        }
      }
    });

    console.log(`✅ ${type}: ${engine.name} (${provider})`);
  }

  // Add mock TTS engines for Coqui (will be replaced with real implementation)
  const mockTTSEngines = [
    {
      id: 'voice-engine-coqui-tts',
      name: 'Coqui TTS (Local)',
      type: 'TTS' as const,
      provider: 'coqui',
      config: {
        modelPath: process.env.COQUI_MODEL_PATH || './models/coqui',
      }
    },
    {
      id: 'voice-engine-openai-tts',
      name: 'OpenAI TTS',
      type: 'TTS' as const,
      provider: 'openai',
      config: {
        model: 'tts-1',
        voice: 'alloy',
      }
    }
  ];

  for (const ttsEngine of mockTTSEngines) {
    const engine = await prisma.voiceEngine.upsert({
      where: { id: ttsEngine.id },
      create: {
        ...ttsEngine,
        isEnabled: false, // Disabled until configured
      },
      update: {
        ...ttsEngine,
      }
    });

    console.log(`⚠️  ${engine.type}: ${engine.name} (${engine.provider}) - Not configured`);
    ttsCount++;
  }

  console.log('\n📊 Summary:');
  console.log(`  STT Engines: ${sttCount}`);
  console.log(`  TTS Engines: ${ttsCount}`);
  console.log(`  Bidirectional Engines: ${bidirectionalCount}`);
  console.log(`  Total: ${sttCount + ttsCount + bidirectionalCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
