import { PrismaClient } from '@prisma/client';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './apps/api/src/routers/_app.js';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function run() {
  console.log('Setting up mock tools...');
  for (let i = 0; i < 50; i++) {
    await prisma.tool.upsert({
      where: { name: `benchmark-tool-${i}` },
      update: {},
      create: { name: `benchmark-tool-${i}`, description: 'test tool' }
    });
  }

  const roles = [];
  for (let i = 0; i < 20; i++) {
    const tools = [];
    for (let j = 0; j < 10; j++) {
      tools.push(`benchmark-tool-${Math.floor(Math.random() * 50)}`);
    }
    roles.push({
      name: `benchmark-role-${i}-${Date.now()}`,
      basePrompt: 'You are a test',
      tools: tools
    });
  }

  // To test the trpc router directly without HTTP overhead:
  // actually we can just import the router and call it
}
run().catch(console.error).finally(() => prisma.$disconnect());
