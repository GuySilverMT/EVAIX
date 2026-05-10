import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function exportRoles() {
  console.log('Exporting Roles to JSON...');

  const roles = await prisma.role.findMany({
    include: {
      category: true,
      tools: true,
      variants: true
    }
  });

  const exportPath = path.join(__dirname, '..', 'db', 'custom_roles_backup.json');

  // Ensure directory exists
  const dbDir = path.dirname(exportPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  fs.writeFileSync(exportPath, JSON.stringify(roles, null, 2), 'utf-8');
  console.log(`Exported ${roles.length} roles to ${exportPath}`);
}

exportRoles()
  .catch((e) => {
    console.error('Error exporting roles:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
