import { prisma } from '../src/db.js';
import { encrypt } from '../src/utils/encryption.js';

async function updateGroqKey() {
  console.log('🔧 Updating Groq API Key...\n');
  
  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (!groqApiKey) {
    console.error('❌ GROQ_API_KEY not found in environment');
    process.exit(1);
  }
  
  console.log(`Found GROQ_API_KEY: ${groqApiKey.substring(0, 10)}...`);
  
  // Encrypt the key
  const encryptedKey = encrypt(groqApiKey);
  console.log('Encrypted key');
  
  // Update the provider config
  const result = await prisma.providerConfig.updateMany({
    where: { type: 'groq' },
    data: { apiKey: encryptedKey }
  });
  
  console.log(`\n✅ Updated ${result.count} Groq provider config(s)`);
  
  await prisma.$disconnect();
}

updateGroqKey().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
