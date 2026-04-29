
import { prisma } from '../db.js';

async function main() {
    const total = await prisma.model.count();
    const openRouter = await prisma.model.count({ where: { provider: { type: 'openrouter' } } });
    const mistral = await prisma.model.count({ where: { provider: { type: 'mistral' } } });
    
    console.log(`Total Models: ${total}`);
    console.log(`OpenRouter Models: ${openRouter}`);
    console.log(`Mistral Models: ${mistral}`);
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
