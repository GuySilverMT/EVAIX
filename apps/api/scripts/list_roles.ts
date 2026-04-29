
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({
    select: {
      id: true,
      name: true
    }
  });

  console.log('--- ROLES ---');
  roles.forEach(r => {
    console.log(`ID: ${r.id}, Name: ${r.name}`);
  });
  console.log('-------------');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
