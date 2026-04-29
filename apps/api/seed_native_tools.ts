import { prisma } from './src/db.js';

const NATIVE_TOOLS = [
  {
    name: 'nebula',
    description: 'Nebula UI tree manipulation tool for building interfaces with live code execution',
    instruction: 'Use this to add, update, move, or delete nodes in the Nebula UI tree. Always capture returned node IDs.',
    schema: JSON.stringify({
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['addNode', 'updateNode', 'moveNode', 'deleteNode', 'ingest', 'setTheme'] },
        parentId: { type: 'string' },
        nodeId: { type: 'string' },
        node: { type: 'object' },
        rawJsx: { type: 'string' },
        theme: { type: 'object' }
      },
      required: ['action']
    }),
    serverId: null
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file from the filesystem',
    instruction: 'Provide the absolute or relative path to the file you want to read.',
    schema: JSON.stringify({
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path']
    }),
    serverId: null
  },
  {
    name: 'write_file',
    description: 'Write content to a file on the filesystem',
    instruction: 'Provide the path and content. Creates parent directories if needed.',
    schema: JSON.stringify({
      type: 'object',
      properties: { 
        path: { type: 'string' },
        content: { type: 'string' }
      },
      required: ['path', 'content']
    }),
    serverId: null
  },
  {
    name: 'list_files',
    description: 'List all files and directories in a given path',
    instruction: 'Provide a directory path to list its contents.',
    schema: JSON.stringify({
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path']
    }),
    serverId: null
  },
  {
    name: 'browse',
    description: 'Fetch and render a web page',
    instruction: 'Provide a URL to fetch its HTML content.',
    schema: JSON.stringify({
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url']
    }),
    serverId: null
  },
  {
    name: 'terminal_execute',
    description: 'Execute a shell command in the terminal',
    instruction: 'Provide the command and optionally a working directory.',
    schema: JSON.stringify({
      type: 'object',
      properties: { 
        command: { type: 'string' },
        cwd: { type: 'string' }
      },
      required: ['command']
    }),
    serverId: null
  },
  {
    name: 'list_files_tree',
    description: 'List all files in a tree structure from the VFS',
    instruction: 'Returns a hierarchical tree of all files in the virtual filesystem.',
    schema: JSON.stringify({
      type: 'object',
      properties: {},
      required: []
    }),
    serverId: null
  },
  {
    name: 'scan_ui_components',
    description: 'Scan and return available UI components and their import paths',
    instruction: 'Returns the component registry with all available React components.',
    schema: JSON.stringify({
      type: 'object',
      properties: {},
      required: []
    }),
    serverId: null
  },
  {
    name: 'theme_editor',
    description: 'Modify the application theme configuration',
    instruction: 'Update colors, typography, spacing, or other design tokens.',
    schema: JSON.stringify({
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['update', 'reset'] },
        updates: { type: 'object' }
      },
      required: ['action']
    }),
    serverId: null
  },
  {
    name: 'typescript_interpreter',
    description: 'Execute TypeScript code in a sandboxed environment',
    instruction: 'Run TypeScript code with access to the Nebula API and other globals.',
    schema: JSON.stringify({
      type: 'object',
      properties: { code: { type: 'string' } },
      required: ['code']
    }),
    serverId: null
  }
];

async function main() {
  console.log('🌱 Seeding Native Tools...\n');
  
  let created = 0;
  let updated = 0;
  
  for (const tool of NATIVE_TOOLS) {
    const existing = await prisma.tool.findUnique({
      where: { name: tool.name }
    });
    
    if (existing) {
      await prisma.tool.update({
        where: { name: tool.name },
        data: {
          description: tool.description,
          instruction: tool.instruction,
          schema: tool.schema,
          isEnabled: true
        }
      });
      console.log(`  ✅ Updated: ${tool.name}`);
      updated++;
    } else {
      await prisma.tool.create({
        data: {
          name: tool.name,
          description: tool.description,
          instruction: tool.instruction,
          schema: tool.schema,
          isEnabled: true,
          serverId: tool.serverId
        }
      });
      console.log(`  ✨ Created: ${tool.name}`);
      created++;
    }
  }
  
  console.log(`\n📊 Summary: ${created} created, ${updated} updated`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
