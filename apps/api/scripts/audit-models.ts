
import { prisma } from '../db.js';

async function main() {
    const models = await prisma.model.findMany({
        include: {
            capabilities: true,
            provider: true
        }
    });

    console.log(`Found ${models.length} models.`);
    console.log("---------------------------------------------------");
    console.log("Name | Provider | Context Window");
    console.log("---------------------------------------------------");
    
    models.forEach(m => {
        console.log(`${m.name.padEnd(40)} | ${m.provider.label.padEnd(20)} | ${m.capabilities?.contextWindow || 'N/A'}`);
    });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
