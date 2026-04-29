import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed hierarchical role categories
 * Creates system categories with subcategories
 */

async function main() {
  console.log('📁 Creating hierarchical role categories...\n');

  // System category (protected)
  const systemCategory = await prisma.roleCategory.upsert({
    where: { name: 'System' },
    create: {
      name: 'System',
      description: 'Built-in system roles',
      isSystem: true,
      order: 0,
      icon: '⚙️',
      color: '#6366f1',
    },
    update: {
      isSystem: true,
    }
  });

  console.log(`✅ ${systemCategory.name} (System Category)`);

  // Development category with subcategories
  const devCategory = await prisma.roleCategory.upsert({
    where: { name: 'Development' },
    create: {
      name: 'Development',
      description: 'Software development roles',
      isSystem: false,
      order: 1,
      icon: '💻',
      color: '#10b981',
    },
    update: {}
  });

  console.log(`✅ ${devCategory.name}`);

  // Development subcategories
  const frontendSubcat = await prisma.roleCategory.upsert({
    where: { name: 'Frontend' },
    create: {
      name: 'Frontend',
      description: 'Frontend development roles',
      parentId: devCategory.id,
      order: 0,
      icon: '🎨',
    },
    update: { parentId: devCategory.id }
  });

  const backendSubcat = await prisma.roleCategory.upsert({
    where: { name: 'Backend' },
    create: {
      name: 'Backend',
      description: 'Backend development roles',
      parentId: devCategory.id,
      order: 1,
      icon: '🔧',
    },
    update: { parentId: devCategory.id }
  });

  console.log(`  └─ ${frontendSubcat.name} (subcategory)`);
  console.log(`  └─ ${backendSubcat.name} (subcategory)`);

  // Content category with subcategories
  const contentCategory = await prisma.roleCategory.upsert({
    where: { name: 'Content' },
    create: {
      name: 'Content',
      description: 'Content creation roles',
      isSystem: false,
      order: 2,
      icon: '✍️',
      color: '#f59e0b',
    },
    update: {}
  });

  console.log(`✅ ${contentCategory.name}`);

  const writingSubcat = await prisma.roleCategory.upsert({
    where: { name: 'Writing' },
    create: {
      name: 'Writing',
      description: 'Writing and editing roles',
      parentId: contentCategory.id,
      order: 0,
      icon: '📝',
    },
    update: { parentId: contentCategory.id }
  });

  const designSubcat = await prisma.roleCategory.upsert({
    where: { name: 'Design' },
    create: {
      name: 'Design',
      description: 'Design and creative roles',
      parentId: contentCategory.id,
      order: 1,
      icon: '🎨',
    },
    update: { parentId: contentCategory.id }
  });

  console.log(`  └─ ${writingSubcat.name} (subcategory)`);
  console.log(`  └─ ${designSubcat.name} (subcategory)`);

  // Analysis category
  const analysisCategory = await prisma.roleCategory.upsert({
    where: { name: 'Analysis' },
    create: {
      name: 'Analysis',
      description: 'Data analysis and research roles',
      isSystem: false,
      order: 3,
      icon: '📊',
      color: '#8b5cf6',
    },
    update: {}
  });

  console.log(`✅ ${analysisCategory.name}`);

  console.log('\n📊 Summary:');
  console.log('  System: 1 category (protected)');
  console.log('  Development: 1 category, 2 subcategories');
  console.log('  Content: 1 category, 2 subcategories');
  console.log('  Analysis: 1 category');
  console.log('  Total: 4 top-level, 4 subcategories');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
