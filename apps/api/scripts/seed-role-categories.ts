import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    {
      name: 'Core',
      description: 'Essential system roles',
      isSystem: true,
    },
    {
      name: 'Skills',
      description: 'Specialized skill roles',
      isSystem: false,
    },
    {
      name: 'Coding',
      description: 'Coding and development roles',
      isSystem: false,
    },
  ];

  for (const cat of categories) {
    await prisma.roleCategory.upsert({
      where: { name: cat.name },
      update: cat,
      create: cat,
    });
    console.log(`✅ Seeded category: ${cat.name}`);
  }

  // Assign categories to roles
  const skillsCat = await prisma.roleCategory.findUnique({ where: { name: 'Skills' } });
  const codingCat = await prisma.roleCategory.findUnique({ where: { name: 'Coding' } });
  if (skillsCat) {
    await prisma.role.updateMany({
      where: { name: 'Skill Finder' },
      data: { categoryId: skillsCat.id },
    });
  }
  if (codingCat) {
    await prisma.role.updateMany({
      where: { name: 'Coding Orchestrator' },
      data: { categoryId: codingCat.id },
    });
  }
  console.log('✅ Assigned categories to roles');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());