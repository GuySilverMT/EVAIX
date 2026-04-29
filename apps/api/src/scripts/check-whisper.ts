
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const models = await prisma.model.findMany({
    where: {
      id: { contains: 'whisper', mode: 'insensitive' }
    },
    include: { capabilities: true }
  });
  console.log(JSON.stringify(models, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
