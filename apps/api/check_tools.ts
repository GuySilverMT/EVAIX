
import { prisma } from './src/db.js';

async function main() {
  const tools = await prisma.tool.findMany({
    orderBy: { name: 'asc' }
  });
  
  console.log(`\n📦 Total Tools in Database: ${tools.length}\n`);
  
  const nativeToolNames = [
    'nebula', 'read_file', 'write_file', 'list_files', 'browse', 
    'terminal_execute', 'search_codebase', 'list_files_tree', 
    'scan_ui_components', 'theme_editor', 'typescript_interpreter'
  ];
  
  console.log('🔍 Native Tool Status:');
  nativeToolNames.forEach(name => {
    const found = tools.find(t => t.name === name);
    console.log(`  ${found ? '✅' : '❌'} ${name}${found ? ` (${found.isEnabled ? 'enabled' : 'disabled'})` : ' (MISSING)'}`);
  });
  
  console.log('\n🌐 All Tools:');
  tools.forEach(t => {
    console.log(`  - ${t.name} (${t.isEnabled ? 'enabled' : 'disabled'}) ${t.serverId ? `[${t.serverId}]` : '[native]'}`);
  });
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
