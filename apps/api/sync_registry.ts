import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars BEFORE importing db
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

async function main() {
  // Dynamic imports to ensure env vars are loaded
  const { ProviderManager } = await import('./src/services/ProviderManager.js');
  const { prisma } = await import('./src/db.js');

  console.log('Initializing ProviderManager...');
  await ProviderManager.initialize();
  
  console.log('Syncing models to registry...');
  await ProviderManager.syncModelsToRegistry();
  
  console.log('Done.');
  
  // Close the pool
  await prisma.$disconnect();
}

main().catch(console.error);
