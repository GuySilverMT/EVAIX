
import { prisma } from './src/db.js';

async function main() {
  const architect = await prisma.role.findFirst({
    where: { name: 'Nebula Architect' },
    include: { tools: { include: { tool: true } } }
  });
  
  console.log('\n🧬 Nebula Architect Tool Assignment:');
  if (architect) {
    console.log(`  Role: ${architect.name}`);
    console.log(`  Tools (${architect.tools.length}):`);
    architect.tools.forEach(rt => {
      console.log(`    - ${rt.tool.name} (${rt.tool.isEnabled ? 'enabled' : 'disabled'})`);
    });
  } else {
    console.log('  ❌ Role not found');
  }
  
  // Check what RoleFactory would see
  const allTools = await prisma.tool.findMany({
    where: { isEnabled: true },
    select: { name: true, description: true }
  });
  
  console.log(`\n🏭 RoleFactory Tool Pool (${allTools.length} enabled):`);
  const nativeTools = allTools.filter(t => 
    ['nebula', 'read_file', 'write_file', 'terminal_execute', 'search_codebase', 
     'list_files_tree', 'scan_ui_components', 'theme_editor'].includes(t.name)
  );
  console.log(`  Native Tools Available: ${nativeTools.length}/8`);
  nativeTools.forEach(t => console.log(`    ✓ ${t.name}`));
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
