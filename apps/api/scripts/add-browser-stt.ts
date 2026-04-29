import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Add Browser Native STT Engine
 * Uses Web Speech API - no external API needed
 */

async function main() {
  console.log('🎤 Adding Browser Native STT Engine...\n');

  // Add browser native engine
  const browserEngine = await prisma.voiceEngine.upsert({
    where: {
      id: 'voice-engine-browser-native',
    },
    create: {
      id: 'voice-engine-browser-native',
      name: 'Browser (Native)',
      type: 'STT',
      provider: 'browser',
      isEnabled: true,
      config: {
        type: 'web-speech-api',
        continuous: false,
        interimResults: true,
        lang: 'en-US',
      },
      metadata: {
        description: 'Browser built-in Web Speech API - no external API needed',
        supportedBrowsers: ['Chrome', 'Edge', 'Safari'],
      }
    },
    update: {
      name: 'Browser (Native)',
      type: 'STT',
      provider: 'browser',
      isEnabled: true,
      config: {
        type: 'web-speech-api',
        continuous: false,
        interimResults: true,
        lang: 'en-US',
      },
      metadata: {
        description: 'Browser built-in Web Speech API - no external API needed',
        supportedBrowsers: ['Chrome', 'Edge', 'Safari'],
      }
    }
  });

  console.log(`✅ ${browserEngine.type}: ${browserEngine.name} (${browserEngine.provider})`);
  console.log('\n📊 Browser Native STT engine added!');
  console.log('   - No API key required');
  console.log('   - Works offline');
  console.log('   - Supports Chrome, Edge, Safari');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
