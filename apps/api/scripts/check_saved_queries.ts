
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const queries = await prisma.savedQuery.findMany();
    console.log('Saved Queries:', queries);
  } catch (error) {
    console.error('Error fetching saved queries:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
