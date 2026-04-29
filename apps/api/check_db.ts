
import { prisma } from './src/db.js';

async function main() {
  const architect = await prisma.role.findFirst({
    where: { name: 'Nebula Architect' }
  });
  console.log('Nebula Architect Role:', JSON.stringify(architect, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
