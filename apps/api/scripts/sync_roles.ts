
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Syncing Roles from roles.json...');

    interface RoleJson {
      id: string;
      name: string;
      category: string;
      basePrompt: string;
      tools?: string[];
    }

    const rolesPath = path.resolve(process.cwd(), 'packages/coc/agents/roles.json');
    const raw = await fs.readFile(rolesPath, 'utf-8');
    const roles = JSON.parse(raw) as RoleJson[];

    // 1. Collect all unique tools
    const allTools = new Set<string>();
    roles.forEach((r: any) => {
        if (r.tools) r.tools.forEach((t: string) => allTools.add(t));
    });

    console.log(`Found ${allTools.size} unique tools:`, [...allTools]);

    // 2. Ensure Tools exist
    for (const toolName of allTools) {
        // Simple upsert for tool
        try {
            const existing = await prisma.tool.findFirst({ where: { name: toolName } });
            if (!existing) {
                console.log(`Creating missing Tool: ${toolName}`);
                await prisma.tool.create({
                    data: {
                        name: toolName,
                        description: `Auto-generated tool for ${toolName}`,
                        schema: '{}', // Empty schema default
                        instruction: `Usage for ${toolName}`
                    }
                });
            }
        } catch (e) {
            console.error(`Error syncing tool ${toolName}:`, e);
        }
    }

    // 3. Sync Roles
    for (const roleDef of roles) {
        console.log(`Syncing Role: ${roleDef.name} (${roleDef.id})`);

        try {
             // Prepare tool connections
             const tools = roleDef.tools || [];
             
             // We need to fetch the tool IDs to connect reliably, or use connect by unique name if supported.
             // Usually 'name' is unique. Let's assume name is unique.
             
             const toolConnections = tools.map((tName: string) => ({
                 tool: { connect: { name: tName } }
             }));

             // Update Role
             // Note: Updating tools requires clearing old ones and adding new ones to be clean, 
             // OR using 'set' if it's a direct many-to-many list (implicit).
             // If it's explicit RoleTool model, we use deleteMany + create.
             
             await prisma.role.upsert({
                where: { id: roleDef.id },
                update: {
                    name: roleDef.name,
                    category: {
                        connectOrCreate: {
                            where: { name: roleDef.category },
                            create: { name: roleDef.category, order: 99 }
                        }
                    },
                    basePrompt: roleDef.basePrompt,
                    // tools relation update logic:
                    tools: {
                        deleteMany: {}, // Remove all existing links
                        create: toolConnections // Create new links
                    }
                },
                create: {
                    id: roleDef.id,
                    name: roleDef.name,
                    category: {
                        connectOrCreate: {
                            where: { name: roleDef.category },
                            create: { name: roleDef.category, order: 99 }
                        }
                    },
                    basePrompt: roleDef.basePrompt,
                    tools: {
                        create: toolConnections
                    }
                }
            });
            
        } catch (e) {
            console.error(`Failed to sync role ${roleDef.id}:`, e);
            // Fallback: try without tools if that failed? No, we need tools.
        }
    }
    console.log('Role sync complete.');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
