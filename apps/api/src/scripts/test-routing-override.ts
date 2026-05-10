import { PrismaClient } from '@prisma/client';
import { resolveModelForRole } from '../services/modelManager.service.js';

const prisma = new PrismaClient();

async function runTest() {
  console.log('--- Starting Routing Override Test ---');
  let testRole;

  try {
    // 1. Create a temporary hardcoded role
    testRole = await prisma.role.create({
      data: {
        name: 'TEST_ROUTING_OVERRIDE_ROLE',
        description: 'Temporary role for testing',
        basePrompt: 'You are a testing assistant.',
        targetProvider: 'xai',
        targetModel: 'grok-beta'
      }
    });
    console.log(`[SETUP] Created test role: ${testRole.id} bound to xai:grok-beta`);

    // 2. Trigger the routing logic
    console.log('[TEST] Fetching model resolution for role...');

    const resolutionId = await resolveModelForRole(testRole);
    const resolution = await prisma.model.findUnique({ where: { id: resolutionId } });

    if (!resolution) {
      throw new Error(`Model with id ${resolutionId} not found in database.`);
    }

    // 3. Output results
    console.log(`[RESULT] Resolved Provider: ${resolution.providerId}`);
    console.log(`[RESULT] Resolved Model: ${resolution.name}`);

    if (
      (resolution.providerId === 'xai') &&
      (resolution.name === 'grok-beta')
    ) {
      console.log('✅ SUCCESS: Routing override strictly enforced.');
    } else {
      console.error('❌ FAILURE: Routing override bypassed or failed.');
    }

  } catch (error) {
    console.error('❌ ERROR during test execution:', error);
  } finally {
    // 4. Cleanup
    if (testRole) {
      await prisma.role.delete({ where: { id: testRole.id } });
      console.log('[CLEANUP] Test role deleted.');
    }
    await prisma.$disconnect();
  }
}

runTest();
