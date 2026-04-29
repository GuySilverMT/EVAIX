
import { prisma } from './src/db.js';

async function main() {
  console.log('🔧 Fixing Nebula Architect tool assignments...\n');
  
  const architect = await prisma.role.findFirst({
    where: { name: 'Nebula Architect' }
  });
  
  if (!architect) {
    console.log('❌ Nebula Architect not found');
    process.exit(1);
  }
  
  // Delete all current tool assignments
  await prisma.roleTool.deleteMany({
    where: { roleId: architect.id }
  });
  console.log('  🗑️  Cleared old tool assignments');
  
  // Get the correct tool IDs
  const toolNames = ['nebula', 'search_codebase', 'list_files_tree', 'scan_ui_components', 'read_file'];
  const tools = await prisma.tool.findMany({
    where: { name: { in: toolNames } }
  });
  
  // Reassign tools
  for (const tool of tools) {
    await prisma.roleTool.create({
      data: {
        roleId: architect.id,
        toolId: tool.id
      }
    });
    console.log(`  ✅ Assigned: ${tool.name}`);
  }
  
  console.log(`\n✨ Nebula Architect now has ${tools.length} tools`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
