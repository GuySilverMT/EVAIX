import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runBenchmark() {
  console.log('Setting up mock data...');
  for (let i = 0; i < 50; i++) {
    await prisma.tool.upsert({
      where: { name: `benchmark-tool-${i}` },
      update: {},
      create: { name: `benchmark-tool-${i}`, description: 'test tool', instruction: 'do something', schema: '{}' }
    });
  }

  const category = await prisma.roleCategory.upsert({
    where: { name: 'Benchmark Category' },
    update: {},
    create: { name: 'Benchmark Category' }
  });

  const roles = [];
  for (let i = 0; i < 50; i++) {
    const role = await prisma.role.create({
      data: {
        name: `benchmark-role-${Date.now()}-${i}`,
        basePrompt: 'Test',
        categoryId: category.id,
      }
    });
    const tools = [];
    for (let j = 0; j < 50; j++) {
      tools.push(`benchmark-tool-${j}`);
    }
    roles.push({
      roleId: role.id,
      tools: tools
    });
  }

  console.log('Starting benchmark...');
  const start = Date.now();

  // CURRENT IMPLEMENTATION (UNOPTIMIZED)
  for (const roleData of roles) {
    if (roleData.tools && roleData.tools.length > 0) {
      for (const toolName of roleData.tools) {
        const tool = await prisma.tool.findUnique({
          where: { name: toolName }
        });

        if (tool) {
          await prisma.roleTool.create({
            data: {
              roleId: roleData.roleId,
              toolId: tool.id
            }
          }).catch(() => {
            // Ignore duplicate tool connections
          });
        }
      }
    }
  }

  const end = Date.now();
  console.log(`Time taken (unoptimized): ${end - start}ms`);

  // OPTIMIZED IMPLEMENTATION
  console.log('Starting optimized benchmark...');

  // Clean up relationships
  await prisma.roleTool.deleteMany({
    where: { role: { name: { startsWith: 'benchmark-role-' } } }
  });

  const startOpt = Date.now();

  for (const roleData of roles) {
    if (roleData.tools && roleData.tools.length > 0) {
      const tools = await prisma.tool.findMany({
        where: { name: { in: roleData.tools } }
      });

      if (tools.length > 0) {
        await prisma.roleTool.createMany({
          data: tools.map(tool => ({
            roleId: roleData.roleId,
            toolId: tool.id
          })),
          skipDuplicates: true
        });
      }
    }
  }

  const endOpt = Date.now();
  console.log(`Time taken (optimized): ${endOpt - startOpt}ms`);

  // Clean up
  await prisma.roleTool.deleteMany({
    where: { role: { name: { startsWith: 'benchmark-role-' } } }
  });
  await prisma.role.deleteMany({
    where: { name: { startsWith: 'benchmark-role-' } }
  });
  await prisma.tool.deleteMany({
    where: { name: { startsWith: 'benchmark-tool-' } }
  });

  process.exit(0);
}

runBenchmark().catch(console.error).finally(() => prisma.$disconnect());
