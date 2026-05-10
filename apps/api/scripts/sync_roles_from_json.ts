
import { prisma } from '../src/db.js';
import * as fs from 'fs/promises';
import * as path from 'path';


async function syncRoles() {
    console.log("🔄 Syncing Roles from roles.json...");

    const rolesPath = path.resolve(process.cwd(), 'packages/coc/agents/roles.json');
    console.log(`📂 Reading from: ${rolesPath}`);

    try {
        const raw = await fs.readFile(rolesPath, 'utf-8');
        const rolesConfig = JSON.parse(raw);

        console.log(`📦 Found ${rolesConfig.length} roles in JSON.`);

        // 1. Pre-seed Tools
        console.log("🛠️  Pre-seeding Tools...");
        const allTools = new Set<string>();
        rolesConfig.forEach((r: any) => r.tools?.forEach((t: string) => allTools.add(t)));

        for (const toolName of allTools) {
            await prisma.tool.upsert({
                where: { name: toolName },
                update: {},
                create: {
                    name: toolName,
                    description: "System Tool (Auto-seeded)",
                    instruction: "Standard system tool.",
                    schema: "{}",
                    isEnabled: true
                }
            });
        }
        console.log(`✅ ${allTools.size} Tools ensured.`);

        const toolsInDb = await prisma.tool.findMany({
            where: { name: { in: Array.from(allTools) } }
        });
        const toolNameToId = new Map<string, string>();
        for (const t of toolsInDb) {
            toolNameToId.set(t.name, t.id);
        }


        // 2. Sync Roles
        for (const roleDef of rolesConfig) {
            console.log(`   -> Syncing: ${roleDef.name} (${roleDef.id})`);

            let categoryId = null;
            if (roleDef.category) {
                const cat = await prisma.roleCategory.upsert({
                    where: { name: roleDef.category },
                    update: {},
                    create: { name: roleDef.category }
                });
                categoryId = cat.id;
            }

const toolConnections = (roleDef.tools || [])
                .map((t: string) => {
                    const toolId = toolNameToId.get(t);
                    return toolId ? { toolId } : null;
                })
                .filter(Boolean);

            // Fix: use 'create' for RoleTool relation syntax in Prisma
            // For update, we delete existing and re-create to ensure sync

            const commonData = {
                basePrompt: roleDef.basePrompt,
                description: roleDef.basePrompt.substring(0, 100) + "...",
                categoryId: categoryId,
                categoryString: roleDef.category,
                metadata: {
                    minContext: roleDef.minContext,
                    maxContext: roleDef.maxContext,
                    needsReasoning: roleDef.needsReasoning,
                    needsCoding: roleDef.needsCoding,
                    defaultTemperature: roleDef.defaultTemperature,
                    defaultMaxTokens: roleDef.defaultMaxTokens
                }
            };

            await prisma.role.upsert({
                where: { name: roleDef.id },
                update: {
                    ...commonData,
                    tools: {
                        deleteMany: {}, // Clear old associations
                        create: toolConnections // Add new ones
                    }
                },
                create: {
                    name: roleDef.id,
                    ...commonData,
                    tools: {
                        create: toolConnections
                    }
                }
            });
        }
        console.log("✅ Sync Complete.");

    } catch (e) {
        console.error("❌ Sync Failed:", e);
        process.exit(1);
    }
}


syncRoles()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
