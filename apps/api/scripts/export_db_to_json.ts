import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function exportTablesToJson() {
  const backupDir = path.join(process.cwd(), 'apps', 'api', 'db_backups');

  // List of tables to export (add more as needed)
  const tables = [
    'ProviderConfig',
    'Model',
    'ModelCapabilities',
    'ModelFailure',
    'ProviderFailure',
    'ModelUsage'
  ];

  for (const table of tables) {
    try {
      // Dynamically call prisma[table] using camelCase
      const modelName = table.charAt(0).toLowerCase() + table.slice(1);
      const data = await (prisma as any)[modelName].findMany();
      const filePath = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✅ Exported ${table} to ${filePath}`);
    } catch (error) {
      console.warn(`⚠️ Failed to export ${table}:`, error);
    }
  }

  console.log('🎉 All tables exported to JSON.');
}

exportTablesToJson().finally(() => prisma.$disconnect());