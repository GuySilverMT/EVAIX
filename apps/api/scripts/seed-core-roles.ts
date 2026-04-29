import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const prisma = new PrismaClient();kdjf

async function main() {
  const agentsToSeed = [
    {
      name: 'Skill Finder',
      description: 'Discovers and installs new MCP skills to extend system capabilities.',
      promptFileName: 'skill-lookup.md',
      tools: ['search_skills', 'get_skill', 'filesystem'] 
    },
    {
      name: 'Coding Orchestrator',
      description: 'Manages isolated coding environments and parallel workflows via PTY.',
      promptFileName: 'coding-agent.md',
      tools: ['terminal', 'filesystem'] 
    }
  ];

  for (const agent of agentsToSeed) {
    const promptPath = join(process.cwd(), 'data', 'agents', agent.promptFileName);
    
    let systemPrompt;
    try {
        systemPrompt = readFileSync(promptPath, 'utf-8');
    } catch (error) {
        console.error(`Failed to read prompt file for ${agent.name}. Ensure it exists at ${promptPath}`);
        continue;
    }

    // 1. Ensure the tools actually exist in the DB before connecting them
    const existingTools = await prisma.tool.findMany({
        where: { name: { in: agent.tools } },
        select: { name: true }
    });
    
    const connectableTools = existingTools.map(t => ({ name: t.name }));

    if (connectableTools.length < agent.tools.length) {
        console.warn(`⚠️ Warning: Some tools for ${agent.name} are missing from the DB and won't be bound.`);
    }

    // 2. Upsert the Role using the explicit RoleTool join table syntax
    await prisma.role.upsert({
      where: { name: agent.name },
      update: {
        description: agent.description,
        systemPrompt: systemPrompt, 
        tools: {
            deleteMany: {}, // Wipe existing tool connections to ensure a clean state
            create: connectableTools.map(t => ({
                tool: { connect: { name: t.name } }
            }))
        }
      },
      create: {
        name: agent.name,
        description: agent.description,
        systemPrompt: systemPrompt,
        tools: {
            create: connectableTools.map(t => ({
                tool: { connect: { name: t.name } }
            }))
        }
      }
    });
    
    console.log(`✅ Successfully seeded: ${agent.name} with ${connectableTools.length} tools attached.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });