
import { ingestAgentLibrary } from './src/services/RoleIngestionService.js';
import { prisma } from './src/db.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agentsDir = path.join(__dirname, "data/agents/en");

async function main() {
  console.log('Starting ingestion from:', agentsDir);
  const stats = await ingestAgentLibrary(agentsDir, prisma);
  console.log('Ingestion complete:', stats);
  process.exit(0);
}

main().catch(err => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
