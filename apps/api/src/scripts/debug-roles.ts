#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugRoles() {
  console.log('🔍 Debugging Role List...\n');

  // 1. Check Roles
  const roles = await prisma.role.findMany({
    include: {
      category: true,
      variants: {
        where: { isActive: true },
        take: 1
      },
      tools: {
        include: { tool: true }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  console.log(`Found ${roles.length} roles:\n`);
  
  for (const role of roles) {
    console.log(`  📋 ${role.name}`);
    console.log(`     Category: ${role.category?.name || 'Uncategorized'}`);
    console.log(`     Variants: ${role.variants.length}`);
    
    if (role.variants.length > 0) {
      const variant = role.variants[0];
      console.log(`     DNA Modules:`);
      console.log(`       - Identity: ${variant.identityConfig ? '✅' : '❌'}`);
      console.log(`       - Cortex: ${variant.cortexConfig ? '✅' : '❌'}`);
      console.log(`       - Governance: ${variant.governanceConfig ? '✅' : '❌'}`);
      console.log(`       - Context: ${variant.contextConfig ? '✅' : '❌'}`);
    }
    console.log('');
  }

  // 2. Check Categories
  const categories = await prisma.roleCategory.findMany({
    orderBy: { order: 'asc' }
  });

  console.log(`\n📁 Found ${categories.length} categories:`);
  for (const cat of categories) {
    const roleCount = roles.filter(r => r.categoryId === cat.id).length;
    console.log(`  - ${cat.name} (${roleCount} roles)`);
  }
}

debugRoles()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
