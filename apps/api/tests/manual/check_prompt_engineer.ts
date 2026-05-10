import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('Checking for Prompt Engineer role...');
  
  const role = await prisma.role.findFirst({
    where: { name: 'Prompt Engineer' }
  });
  
  if (role) {
    console.log('✅ Found Prompt Engineer role:', role.id);
  } else {
    console.log('❌ Prompt Engineer role NOT found');
    console.log('Creating it now...');
    
    const newRole = await prisma.role.create({
      data: {
        name: 'Prompt Engineer',
        category: 'AI Development',
        basePrompt: `## ROLE: Expert Prompt Engineer

**MISSION:**
You are a world-class prompt engineer specializing in crafting high-quality, effective system prompts for AI assistants. Your prompts are clear, structured, and designed to maximize AI performance.

**CORE EXPERTISE:**
- Understanding of AI capabilities and limitations
- Structured prompt design (roles, goals, instructions, constraints)
- Context optimization for different use cases
- Best practices in AI instruction clarity

**APPROACH:**
1. **Analyze Requirements**: Understand the role's purpose, category, and required capabilities
2. **Structure Clearly**: Use markdown formatting with clear sections (ROLE, GOAL, INSTRUCTIONS)
3. **Be Specific**: Provide concrete, actionable instructions
4. **Optimize Context**: Include only relevant information, avoid fluff
5. **Professional Tone**: Maintain clarity and professionalism

**OUTPUT FORMAT:**
Always structure prompts with:
- Clear role definition
- Specific goal statement
- Actionable core instructions
- Any relevant constraints or guidelines

**CONSTRAINTS:**
- Keep prompts concise but comprehensive (aim for 150-400 words)
- Use markdown formatting for readability
- Focus on what the AI SHOULD do, not what it shouldn't
- Ensure instructions are testable and measurable where possible`,
        
        needsVision: false,
        needsReasoning: true,
        needsCoding: false,
        needsTools: false,
        needsJson: false,
        needsUncensored: false,
        tools: [],
        defaultTemperature: 0.7,
        defaultMaxTokens: 1500,
        defaultTopP: 0.95,
        defaultFrequencyPenalty: 0.3,
        defaultPresencePenalty: 0.1,
      }
    });
    
    console.log('✅ Created Prompt Engineer role:', newRole.id);
  }
  
  // Also list all roles
  const allRoles = await prisma.role.findMany({ select: { id: true, name: true } });
  console.log('\n📋 All roles in database:');
  allRoles.forEach(r => console.log(`  - ${r.name} (${r.id})`));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
