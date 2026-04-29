import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Clean Slate Seed...');
  
  // 1. Ensure the default Provider exists (so you can add models)
  await prisma.providerConfig.upsert({
    where: { id: 'openai' },
    update: {},
    create: {
      id: 'openai',
      name: 'OpenAI',
      type: 'chat',
        // apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
      isEnabled: true,
    },
  });

  console.log('✅ Seeding complete: 1 Provider, 0 Roles.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
