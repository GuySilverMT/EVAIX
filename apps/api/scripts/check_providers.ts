
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProviders() {
  try {
    const configs = await prisma.providerConfig.findMany();
    console.log('Provider Configs:');
    configs.forEach(c => console.log(`- ID: ${c.id}, Label: ${c.label}, Type: ${c.type}`));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkProviders();
