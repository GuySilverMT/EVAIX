#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateRoleDNA() {
  console.log('🔄 Updating Role DNA to use arrays for non-exclusive fields...\n');

  // 1. Update Nebula Architect variant
  const nebulaRole = await prisma.role.findUnique({
    where: { name: 'Nebula Architect' },
    include: { variants: { where: { isActive: true }, take: 1 } }
  });

  if (nebulaRole && nebulaRole.variants[0]) {
    await prisma.roleVariant.update({
      where: { id: nebulaRole.variants[0].id },
      data: {
        identityConfig: {
          ...(nebulaRole.variants[0].identityConfig as Record<string, unknown>),
          thinkingProcess: 'CHAIN_OF_THOUGHT',
          reflectionEnabled: true
        },
        cortexConfig: {
          contextRange: { min: 8192, max: 128000 },
          capabilities: ['reasoning', 'coding']
        },
        governanceConfig: {
          assessmentStrategy: ['VISUAL_CHECK'],
          enforcementLevel: 'WARN_ONLY',
          rules: [
            'Always capture node IDs when using nebula.addNode',
            'Never use tree.rootId - use "root" string',
            'Always use Tailwind CSS classes for styling'
          ]
        },
        contextConfig: {
          strategy: ['EXPLORATORY'],
          permissions: ['ALL']
        }
      }
    });
    console.log('✅ Updated Nebula Architect DNA');
  }

  // 2. Update Role Architect variant
  const roleArchitect = await prisma.role.findUnique({
    where: { name: 'Role Architect' },
    include: { variants: { where: { isActive: true }, take: 1 } }
  });

  if (roleArchitect && roleArchitect.variants[0]) {
    await prisma.roleVariant.update({
      where: { id: roleArchitect.variants[0].id },
      data: {
        identityConfig: {
          ...(roleArchitect.variants[0].identityConfig as Record<string, unknown>),
          thinkingProcess: 'MULTI_STEP_PLANNING',
          reflectionEnabled: true
        },
        cortexConfig: {
          contextRange: { min: 8192, max: 32000 },
          capabilities: ['reasoning']
        },
        governanceConfig: {
          assessmentStrategy: ['LINT_ONLY'],
          enforcementLevel: 'WARN_ONLY',
          rules: [
            'Always provide complete DNA configurations',
            'Consider domain-specific governance rules',
            'Match capabilities to role requirements'
          ]
        },
        contextConfig: {
          strategy: ['EXPLORATORY'],
          permissions: ['ALL']
        }
      }
    });
    console.log('✅ Updated Role Architect DNA');
  }

  // 3. Update Librarian variant
  const librarianRole = await prisma.role.findUnique({
    where: { name: 'Librarian' },
    include: { variants: { where: { isActive: true }, take: 1 } }
  });

  if (librarianRole && librarianRole.variants[0]) {
    await prisma.roleVariant.update({
      where: { id: librarianRole.variants[0].id },
      data: {
        identityConfig: {
          ...(librarianRole.variants[0].identityConfig as Record<string, unknown>),
          thinkingProcess: 'SOLO',
          reflectionEnabled: false
        },
        cortexConfig: {
          contextRange: { min: 16000, max: 128000 },
          capabilities: [] // Remove 'embedding' manually
        }
      }
    });
    console.log('✅ Updated Librarian DNA');
  }

  console.log('\n🎉 DNA updates complete!');
}

updateRoleDNA()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
