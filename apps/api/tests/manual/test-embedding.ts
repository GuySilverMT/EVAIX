
import { createEmbedding } from '../src/services/vector.service.js';
import { ProviderManager } from '../src/services/ProviderManager.js';

async function main() {
  console.log('Initializing ProviderManager...');
  await ProviderManager.initialize();

  console.log('Testing embedding generation...');
  try {
    const text = "Hello world, this is a test of the embedding system.";
    const vector = await createEmbedding(text);
    console.log(`Success! generated vector of length ${vector.length}`);
    console.log(`First 5 dimensions:`, vector.slice(0, 5));
  } catch (error) {
    console.error('Embedding failed:', error);
  }
}

main().catch(console.error);
