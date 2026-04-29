import { ingestAgentLibrary } from '../services/RoleIngestionService.js';
import { prisma } from '../db.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const agentsDir = path.join(__dirname, 'data/agents/en');
  console.log(`Starting agent library ingestion from ${agentsDir}...`);
  
  const stats = await ingestAgentLibrary(agentsDir, prisma);
  
  console.log('\n--- Ingestion Summary ---');
  console.log(`Created: ${stats.created}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Failed: ${stats.failed}`);
  
  if (stats.errors.length > 0) {
    console.log('\nErrors encountered:');
    stats.errors.forEach((err) => console.log(`  - ${err}`));
  }

  // Show total roles now
  const totalRoles = await prisma.role.count();
  console.log(`\nTotal roles in database: ${totalRoles}`);
  
  process.exit(stats.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
