import { prisma } from '../db.js';

async function main() {
  const action = process.argv[2];
  
  if (action === 'list') {
    const providers = await prisma.providerConfig.findMany({
      select: {
        id: true,
        label: true,
        type: true,
        isEnabled: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n=== Providers ===');
    providers.forEach(p => {
      console.log(`ID: ${p.id}`);
      console.log(`  Label: ${p.label}`);
      console.log(`  Type: ${p.type}`);
      console.log(`  Enabled: ${p.isEnabled}`);
      console.log(`  Created: ${p.createdAt.toISOString()}`);
      console.log('');
    });
    
  } else if (action === 'delete') {
    const id = process.argv[3];
    if (!id) {
      console.error('Usage: npx tsx manage_providers.ts delete <provider-id>');
      process.exit(1);
    }
    
    const provider = await prisma.providerConfig.findUnique({ where: { id } });
    if (!provider) {
      console.error(`Provider ${id} not found`);
      process.exit(1);
    }
    
    console.log(`Deleting provider: ${provider.label} (${provider.type})`);
    await prisma.providerConfig.delete({ where: { id } });
    console.log('✓ Deleted');
    
  } else {
    console.log('Usage:');
    console.log('  npx tsx manage_providers.ts list');
    console.log('  npx tsx manage_providers.ts delete <provider-id>');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
