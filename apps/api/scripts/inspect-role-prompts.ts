
import { prisma } from '../src/db.js';

async function inspectRoles() {
  console.log("🕵️ Inspecting Role Prompts...");
  const roles = await prisma.role.findMany();
  
  if (roles.length === 0) {
      console.log("❌ No roles found in database!");
      return;
  }

  for (const role of roles) {
      console.log(`\n🎭 Role: ${role.name} (${role.id})`);
      console.log(`   Category: ${role.categoryString}`);
      if (!role.basePrompt || role.basePrompt.trim() === '') {
          console.log(`   ❌ Base Prompt: [EMPTY OR NULL]`);
      } else {
          console.log(`   ✅ Base Prompt Length: ${role.basePrompt.length} chars`);
          console.log(`   📝 Snippet: "${role.basePrompt.substring(0, 100)}..."`);
      }
  }
}

inspectRoles()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
