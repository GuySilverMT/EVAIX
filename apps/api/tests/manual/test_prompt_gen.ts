import { prisma } from '../src/db.js';
import { createVolcanoAgent } from '../src/services/AgentFactory.js';

async function test() {
  console.log('Testing AI-powered prompt generation...\n');
  
  // 1. Find Prompt Engineer role
  const promptEngineerRole = await prisma.role.findFirst({
    where: { name: 'Prompt Engineer' }
  });
  
  if (!promptEngineerRole) {
    console.error('❌ Prompt Engineer role not found!');
    process.exit(1);
  }
  
  console.log('✅ Found Prompt Engineer role:', promptEngineerRole.id);
  console.log('   Needs Reasoning:', promptEngineerRole.needsReasoning);
  console.log('   Criteria:', JSON.stringify(promptEngineerRole.criteria, null, 2));
  
  // 2. Try to create an agent with this role
  try {
    console.log('\n🔨 Creating agent...');
    const agent = await createVolcanoAgent({
      roleId: promptEngineerRole.id,
      modelId: null,
      isLocked: false,
      temperature: 0.7,
      maxTokens: 1500,
    });
    
    console.log('✅ Agent created successfully!');
    
    // 3. Test generation
    console.log('\n🤖 Testing prompt generation...');
    const testRequest = `Generate a system prompt for a "Code Reviewer" role in the "Engineering" category with coding capabilities.`;
    
    const result = await agent.generate(testRequest);
    
    console.log('\n✅ SUCCESS! Generated prompt:');
    console.log('---');
    console.log(result);
    console.log('---');
    
  } catch (error) {
    console.error('\n❌ FAILED:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
  
  await prisma.$disconnect();
}

test().catch(console.error);
