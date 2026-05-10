import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function importRoles() {
  console.log('Importing Roles from JSON...');

  const importPath = path.join(__dirname, '..', 'db', 'custom_roles_backup.json');

  if (!fs.existsSync(importPath)) {
    console.log(`Backup file not found at ${importPath}. Skipping import.`);
    return;
  }

  const rawData = fs.readFileSync(importPath, 'utf-8');
  let roles: any[];
  try {
    roles = JSON.parse(rawData);
  } catch (e) {
    console.error('Failed to parse backup JSON:', e);
    return;
  }

  console.log(`Found ${roles.length} roles to import.`);

  for (const role of roles) {
    const { id, category, tools, variants, createdAt, updatedAt, jobs, modelUsage, promptRefinements, ...roleData } = role;

    // Handle Category
    let categoryId = roleData.categoryId;
    if (category) {
      const dbCategory = await prisma.roleCategory.upsert({
        where: { name: category.name },
        update: {
          order: category.order,
          color: category.color,
          description: category.description,
          icon: category.icon,
          isSystem: category.isSystem,
        },
        create: {
          name: category.name,
          order: category.order,
          color: category.color,
          description: category.description,
          icon: category.icon,
          isSystem: category.isSystem,
        }
      });
      categoryId = dbCategory.id;
      roleData.categoryId = categoryId;
    }

    // Handle Upsert Role
    const upsertedRole = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {
        ...roleData
      },
      create: {
        ...roleData,
        id // Keep original ID if creating new to keep consistency if needed
      }
    });

    console.log(`Upserted role: ${upsertedRole.name}`);

    // Reconnect Tools
    if (tools && Array.isArray(tools)) {
      // First clean existing tools for the role
      await prisma.roleTool.deleteMany({
        where: { roleId: upsertedRole.id }
      });

      for (const t of tools) {
        // We might not have full tool payload to recreate tool, so we just connect if exists.
        const existingTool = await prisma.tool.findUnique({
          where: { id: t.toolId }
        });

        if (existingTool) {
          await prisma.roleTool.create({
            data: {
              roleId: upsertedRole.id,
              toolId: t.toolId
            }
          });
        }
      }
    }
  }

  console.log('Import complete.');
}

importRoles()
  .catch((e) => {
    console.error('Error importing roles:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
