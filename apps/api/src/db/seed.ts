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


  await prisma.providerConfig.upsert({
    where: { id: 'google_jules' },
    update: {},
    create: {
      id: 'google_jules',
      name: 'Google Jules',
      type: 'google_jules',
      isEnabled: true,
    },
  });

  console.log('✅ Seeding complete: 2 Providers, 0 Roles.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
