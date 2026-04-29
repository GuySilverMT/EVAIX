import { persistentModelDoctor } from '../src/services/PersistentModelDoctor.js';

async function testDoctor() {
  console.log('🏥 Testing PersistentModelDoctor Health Check\n');
  
  const health = await persistentModelDoctor.checkHealth();
  
  console.log('=== HEALTH REPORT ===');
  console.log(`Total Models: ${health.total}`);
  console.log(`Complete: ${health.complete}`);
  console.log(`Incomplete: ${health.incomplete}`);
  console.log(`Completion Rate: ${health.completionRate.toFixed(1)}%`);
  
  if (Object.keys(health.missingFields).length > 0) {
    console.log('\n=== MISSING FIELDS ===');
    for (const [field, count] of Object.entries(health.missingFields)) {
      console.log(`  ${field}: ${count} models`);
    }
  } else {
    console.log('\n✅ All models have complete data!');
  }
  
  process.exit(0);
}

testDoctor().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
